const express = require('express');
const router = express.Router();
const {
  getAllMeasurements,
  getMeasurementById,
  getMeasurementCategories,
  validateMeasurements
} = require('../controllers/measurementController');

// GET /api/measurements - Get all measurements with optional category filtering
router.get('/', getAllMeasurements);

// GET /api/measurements/categories - Get all measurement categories
router.get('/categories', getMeasurementCategories);

// GET /api/measurements/:id - Get measurement by ID
router.get('/:id', getMeasurementById);

// POST /api/measurements/validate - Validate measurement IDs
router.post('/validate', validateMeasurements);

module.exports = router;
