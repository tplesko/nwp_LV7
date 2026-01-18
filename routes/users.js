var express = require('express');
var router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');

// Prikaz login forme
router.get('/login', (req, res) => {
  res.render('users/login', { title: 'Login' });
});

// Prikaz register forme
router.get('/register', (req, res) => {
  res.render('users/register', { title: 'Registracija' });
});

// Proces registracije
router.post('/register', async (req, res) => {
  console.log("=== REGISTER POST BODY ===");
  console.log(req.body);
  
  try {
    const { username, email, password } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("User already exists:", email);
      return res.render('users/register', { 
        title: 'Registracija', 
        error: 'Email već postoji' 
      });
    }
    
    const user = new User({ username, email, password });
    console.log("Saving user:", user);
    await user.save();
    console.log("User saved!");
    
    res.redirect('/users/login');
  } catch (err) {
    console.log("Registration error:", err);
    res.render('users/register', { 
      title: 'Registracija', 
      error: err.message 
    });
  }
});

// Proces login-a
router.post('/login', async (req, res) => {
  console.log("=== LOGIN POST BODY ===");
  console.log(req.body);
  
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      console.log("User not found:", email);
      return res.render('users/login', { 
        title: 'Login', 
        error: 'Korisnik ne postoji' 
      });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("Password mismatch for:", email);
      return res.render('users/login', { 
        title: 'Login', 
        error: 'Pogrešna lozinka' 
      });
    }
    
    // Spremi usera u sesiju
    req.session.userId = user._id;
    req.session.username = user.username;
    
    console.log("Login successful! Session:", req.session);
    
    res.redirect('/');
  } catch (err) {
    console.log("Login error:", err);
    res.render('users/login', { 
      title: 'Login', 
      error: err.message 
    });
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/users/login');
  });
});

module.exports = router;