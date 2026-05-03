const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const userController = require('../controllers/user.controller');

// ─── existing routes (unchanged) ─────────────────────────────────────────────
router.get('/profile',     auth, userController.getProfile);
router.put('/profile',     auth, userController.updateProfile);
router.put('/onboarding',  auth, userController.saveOnboarding);

// ─── NEW: avatar upload ───────────────────────────────────────────────────────
// upload.single('avatar') — multer reads the "avatar" field from the
// multipart/form-data body and puts the file on req.file.
// auth middleware runs first so only the logged-in user can upload.
router.post('/avatar', auth, upload.single('avatar'), userController.uploadAvatar);
router.delete('/avatar', auth, userController.removeAvatar);

module.exports = router;