const express = require('express');
const router = express.Router();
const {
  getAllDesigns,
  getDesignById,
  createDesign,
  updateDesign,
  deleteDesign,
  getCategories
} = require('../controllers/designController');

// GET /api/designs - Get all designs with optional filtering
router.get('/', getAllDesigns);

// GET /api/designs/categories - Get all available categories
router.get('/categories', getCategories);

// GET /api/designs/:id - Get design by ID
router.get('/:id', getDesignById);

// POST /api/designs - Create new design (for admin/seeding)
router.post('/', createDesign);

// PUT /api/designs/:id - Update design
router.put('/:id', updateDesign);

// DELETE /api/designs/:id - Soft delete design
router.delete('/:id', deleteDesign);

module.exports = router;
