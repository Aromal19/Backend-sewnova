const express = require('express');
const router = express.Router();
const {
  getAllSizing,
  getSizingById,
  getSizingCategories,
  getSizingGenders,
  getSizingForDesign,
  validateSizing
} = require('../controllers/sizingController');

// GET /api/sizing - Get all sizing options with optional filtering
router.get('/', getAllSizing);

// GET /api/sizing/categories - Get all sizing categories
router.get('/categories', getSizingCategories);

// GET /api/sizing/genders - Get all sizing genders
router.get('/genders', getSizingGenders);

// GET /api/sizing/design/:designCategory - Get sizing options for specific design category
router.get('/design/:designCategory', getSizingForDesign);

// GET /api/sizing/:id - Get sizing option by ID
router.get('/:id', getSizingById);

// POST /api/sizing/validate - Validate sizing IDs
router.post('/validate', validateSizing);

module.exports = router;
