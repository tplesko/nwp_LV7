// routes/projects.js
const express = require('express');
const router = express.Router();
const Project = require('../models/Project');

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


// GET - Dohvati sve projekte
router.get('/', async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json({ success: true, count: projects.length, data: projects });
  } catch (error) {
    return errorResponse(res, 'GET /', error);
  }
});


// GET - Dohvati projekt po ID-u
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

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
router.post('/', async (req, res) => {
  try {
    const project = await Project.create(req.body);
    
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
router.delete('/:id', async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);

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

router.put('/:id', async (req, res) => {
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
    );

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
router.get('/status/:status', async (req, res) => {
  try {
    const projects = await Project.find({ status: req.params.status });
    
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
router.get('/cijena/:min/:max', async (req, res) => {
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

module.exports = router;