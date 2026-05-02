const express  = require('express');
const router   = express.Router();
const auth     = require('../middleware/auth');
const upload   = require('../middleware/upload');
const scanCtrl = require('../controllers/scan.controller');

// POST /api/scans/upload  — upload image and run AI analysis
router.post('/upload', auth, upload.single('menu_image'), scanCtrl.uploadAndAnalyze);

// GET  /api/scans/history — list all past scans for the authenticated user
router.get('/history', auth, scanCtrl.getScanHistory);

// GET  /api/scans/:scanId — fetch a single scan result by ID
router.get('/:scanId', auth, scanCtrl.getScanResult);

module.exports = router;