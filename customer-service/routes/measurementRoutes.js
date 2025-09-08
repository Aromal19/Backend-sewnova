const express = require('express');
const router = express.Router();
const {
  getCustomerMeasurements,
  getMeasurementById,
  createMeasurement,
  updateMeasurement,
  deleteMeasurement,
  setDefaultMeasurement,
  getMeasurementsByType
} = require('../controllers/measurementController');

// Get all measurements for the authenticated customer
router.get('/', getCustomerMeasurements);

// Create a new measurement
router.post('/', createMeasurement);

// Update a measurement
router.put('/:id', updateMeasurement);

// Delete a measurement (soft delete)
router.delete('/:id', deleteMeasurement);

// Set a measurement as default
router.patch('/:id/set-default', setDefaultMeasurement);

// Get measurements by type
router.get('/type/:type', getMeasurementsByType);

// Get a specific measurement by ID
router.get('/:id', getMeasurementById);

module.exports = router; 