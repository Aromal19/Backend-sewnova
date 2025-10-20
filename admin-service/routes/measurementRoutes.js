const express = require('express');
const router = express.Router();
const { getAllMeasurements } = require('../data/globalMeasurements');

// Get all measurements
router.get('/', (req, res) => {
  try {
    const measurements = getAllMeasurements();
    res.json({
      success: true,
      data: measurements
    });
  } catch (error) {
    console.error('Error getting measurements:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting measurements',
      error: error.message
    });
  }
});

module.exports = router;
