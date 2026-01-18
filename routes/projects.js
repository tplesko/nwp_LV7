// routes/projects.js
const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const User = require('../models/User');

const {isAuthenticated} = require('../middleware/auth');

const errorResponse = (res, route, error, status = 500) => {
  console.error(`❌ ERROR IN ROUTE: ${route}`);
  console.error('PARAMS:', JSON.stringify(res.req.params));
  console.error('BODY:', JSON.stringify(res.req.body));
  console.error(error.stack);

  return res.status(status).json({
    success: false,
    route,
    message: error.message,
    stack: error.stack
  });
};

router.get('/users/all', isAuthenticated, async (req, res) => {
  try {
    const users = await User.find({}, 'username email');
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Greška pri dohvaćanju korisnika',
      error: error.message
    });
  }
});


// GET - Dohvati sve projekte (s članovima tima)
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const projects = await Project.find({ owner: req.session.userId })
      .populate('clanoviTima', 'username email') // ✅ Dohvati podatke članova
      .populate('owner', 'username')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, count: projects.length, data: projects });
  } catch (error) {
    return errorResponse(res, 'GET /', error);
  }
});


// GET - Dohvati projekt po ID-u
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('clanoviTima', 'username email')
      .populate('owner', 'username');

    if (!project) {
      return res.status(404).json({
        success: false,
        route: 'GET /:id',
        message: 'Projekt nije pronađen'
      });
    }

    res.json({ success: true, data: project });
  } catch (error) {
    return errorResponse(res, 'GET /:id', error);
  }
});

// POST - Kreiraj novi projekt
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const projectData = {
      ...req.body,
      owner: req.session.userId // ✅ Postavi vlasnika
    };
    
    const project = await Project.create(projectData);
    
    res.status(201).json({
      success: true,
      message: 'Projekt uspješno kreiran',
      data: project
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validacijska greška',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Greška pri kreiranju projekta',
      error: error.message
    });
  }
});


// DELETE - Obriši projekt
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({
      _id: req.params.id,
      owner: req.session.userId
    });
    
    if (!project) {
      return res.status(404).json({
        success: false,
        route: 'DELETE /:id',
        message: 'Projekt nije pronađen'
      });
    }

    res.json({
      success: true,
      message: 'Projekt uspješno obrisan'
    });

  } catch (error) {
    return errorResponse(res, 'DELETE /:id', error);
  }
});

router.put('/:id', isAuthenticated, async (req, res) => {
  try {
    console.log("=== INCOMING UPDATE REQUEST ===");
    console.log("req.params.id:", req.params.id);
    console.log("Raw req.body:", req.body);

    let updateData = { ...req.body };

    // -------------------------------------
    // 1️⃣ NORMALIZE TYPES
    // -------------------------------------
    if (updateData.cijena !== undefined && updateData.cijena !== "")
      updateData.cijena = Number(updateData.cijena);

    if (updateData.datumPocetka) updateData.datumPocetka = new Date(updateData.datumPocetka);
    if (updateData.datumZavrsetka) updateData.datumZavrsetka = new Date(updateData.datumZavrsetka);
    
    // ✅ DODAJ OVO - Normalize arhiviran
    if (updateData.arhiviran !== undefined) {
      updateData.arhiviran = Boolean(updateData.arhiviran);
    }
    
    // ✅ DODAJ OVO - Ensure clanoviTima is array
    if (updateData.clanoviTima && !Array.isArray(updateData.clanoviTima)) {
      updateData.clanoviTima = [updateData.clanoviTima];
    }

    // -------------------------------------
    // 2️⃣ REMOVE EMPTY VALUES
    // -------------------------------------
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === "" || updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    // -------------------------------------
    // 3️⃣ DEBUG: Show final fields being updated
    // -------------------------------------
    console.log("Final updateData being sent to DB:");
    Object.entries(updateData).forEach(([key, value]) => {
      console.log(`  ${key}:`, value, "| type:", typeof value);
    });

    // -------------------------------------
    // 4️⃣ RUN UPDATE WITH VALIDATORS
    // -------------------------------------
    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true, context: "query" }
    )
    .populate('clanoviTima', 'username email')
    .populate('owner', 'username');

    if (!updatedProject) {
      return res.status(404).json({
        success: false,
        message: "Projekt nije pronađen",
      });
    }

    console.log("Updated project returned from DB:", updatedProject);

    res.json({
      success: true,
      message: "Projekt uspješno ažuriran",
      data: updatedProject,
    });

  } catch (error) {
    console.error("=== PUT /projects ERROR ===");
    console.error("Full error object:", error);

    if (error.name === "ValidationError") {
      console.error("Validation failed for fields:");
      Object.keys(error.errors).forEach((field) => {
        console.error(`  Field: ${field}`);
        console.error(`    Value: ${error.errors[field].value}`);
        console.error(`    Message: ${error.errors[field].message}`);
      });

      return res.status(400).json({
        success: false,
        message: "Validacijska greška",
        errors: Object.values(error.errors).map((e) => e.message),
      });
    }

    res.status(500).json({
      success: false,
      message: "Greška pri ažuriranju projekta",
      error: error.message,
      stack: error.stack,
    });
  }
});

// GET - Pretraga projekata po statusu
router.get('/status/:status', isAuthenticated, async (req, res) => {
  try {
    const projects = await Project.find({
      owner: req.session.userId,
      cijena: {
        $gte: req.params.min,
        $lte: req.params.max
      }
    });    
    
    res.json({
      success: true,
      count: projects.length,
      data: projects
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Greška pri pretrazi projekata',
      error: error.message
    });
  }
});

// GET - Projekti u određenom cjenovnom rangu
router.get('/cijena/:min/:max', isAuthenticated, async (req, res) => {
  try {
    const projects = await Project.find({
      cijena: {
        $gte: req.params.min,
        $lte: req.params.max
      }
    });
    
    res.json({
      success: true,
      count: projects.length,
      data: projects
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Greška pri pretrazi projekata',
      error: error.message
    });
  }
});

// GET - dashboard stranica
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const projects = await Project.find({ owner: req.session.userId }).sort({ createdAt: -1 });
    res.render('projects/index', { title: 'Evidencija Projekata', projects });
  } catch (err) {
    res.status(500).send('Greška pri učitavanju projekata');
  }
});

// GET - Dohvati sve korisnike (za dropdown članova tima)
router.get('/users/all', isAuthenticated, async (req, res) => {
  try {
    const User = require('../models/User');
    const users = await User.find({}, 'username email'); // Samo username i email
    
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Greška pri dohvaćanju korisnika',
      error: error.message
    });
  }
});

// GET - Projekti na kojima sam član
router.get('/member/projects', isAuthenticated, async (req, res) => {
  try {
    const projects = await Project.find({ 
      clanoviTima: req.session.userId,
      arhiviran: false
    })
    .populate('clanoviTima', 'username email')
    .populate('owner', 'username')
    .sort({ createdAt: -1 });
    
    res.json({ success: true, count: projects.length, data: projects });
  } catch (error) {
    return errorResponse(res, 'GET /member/projects', error);
  }
});

// GET - Arhivirani projekti (kao voditelj ili član)
router.get('/archived/all', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    
    const projects = await Project.find({ 
      arhiviran: true,
      $or: [
        { owner: userId },
        { clanoviTima: userId }
      ]
    })
    .populate('clanoviTima', 'username email')
    .populate('owner', 'username')
    .sort({ createdAt: -1 });
    
    // Dodaj info o ulozi
    const projectsWithRole = projects.map(p => {
      const isOwner = p.owner._id.toString() === userId.toString();
      return {
        ...p.toObject(),
        userRole: isOwner ? 'owner' : 'clan'
      };
    });
    
    res.json({ success: true, count: projectsWithRole.length, data: projectsWithRole });
  } catch (error) {
    return errorResponse(res, 'GET /archived/all', error);
  }
});

// PUT - Ažuriraj samo obavljene poslove (za članove)
router.put('/member/:id/poslovi', isAuthenticated, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projekt nije pronađen'
      });
    }
    
    // Provjeri je li korisnik član
    const isMember = project.clanoviTima.some(
      id => id.toString() === req.session.userId.toString()
    );
    
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Nemate pristup ovom projektu'
      });
    }
    
    // Ažuriraj samo obavljeniPoslovi
    project.obavljeniPoslovi = req.body.obavljeniPoslovi || [];
    await project.save();
    
    const updatedProject = await Project.findById(req.params.id)
      .populate('clanoviTima', 'username email')
      .populate('owner', 'username');
    
    res.json({
      success: true,
      message: 'Obavljeni poslovi uspješno ažurirani',
      data: updatedProject
    });
    
  } catch (error) {
    return errorResponse(res, 'PUT /member/:id/poslovi', error);
  }
});


module.exports = router;