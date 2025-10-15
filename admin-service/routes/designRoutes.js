const express = require('express');
const router = express.Router();
const designController = require('../controllers/designController');

// Design management routes
router.get('/', designController.getDesigns);
router.post('/', designController.createDesign);
router.put('/:id', designController.updateDesign);
router.delete('/:id', designController.deleteDesign);
router.get('/stats', designController.getDesignStats);

module.exports = router;
