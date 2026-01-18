var express = require('express');
var router = express.Router();
const { isAuthenticated } = require('../middleware/auth');

/* GET home page - BEZ isAuthenticated */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Moji Projekti' });
});

/* GET clan projekti page - SA isAuthenticated */
router.get('/clan-projekti', isAuthenticated, function(req, res, next) {
  res.render('clan-projekti', { title: 'Projekti kao član' });
});

/* GET arhiva page - SA isAuthenticated */
router.get('/arhiva', isAuthenticated, function(req, res, next) {
  res.render('arhiva', { title: 'Arhiva' });
});

module.exports = router;