const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const mealController = require('../controllers/meal.controller');

router.get('/', auth, mealController.getMealsByDate);
router.post('/', auth, mealController.createMeal);
router.post('/quick-add', auth, mealController.quickAddItem);      // ← one-shot from AnalysisPage
router.post('/:mealId/items', auth, mealController.addMealItem);
router.delete('/items/:itemId', auth, mealController.removeMealItem);

module.exports = router;