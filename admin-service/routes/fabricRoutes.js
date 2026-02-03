const express = require('express');
const router = express.Router();
const fabricController = require('../controllers/fabricController');

// POST /api/fabric/estimate
// Protected route? Usually yes, but user-service might call this S2S, or frontend calls directly with user token. 
// For now, we assume simple access or standard middleware integration later.
router.post('/estimate', fabricController.estimateFabricRequirements);

module.exports = router;
