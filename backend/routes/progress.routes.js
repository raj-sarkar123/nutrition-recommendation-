const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const progressController = require('../controllers/progress.controller');

router.get('/daily', auth, progressController.getDailyProgress);
router.get('/weekly', auth, progressController.getWeeklyProgress);
router.get('/streak', auth, progressController.getStreak);
router.post('/insights', auth, progressController.generateAiInsight);

module.exports = router;
