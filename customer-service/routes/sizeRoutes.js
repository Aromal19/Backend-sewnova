const express = require('express');
const router = express.Router();
const {
  createSize,
  listSizes,
  getSize,
  updateSize,
  deleteSize,
  applySizeToUser,
} = require('../controllers/sizeController');

// Sizes CRUD
router.get('/', listSizes);
router.post('/', createSize);
router.get('/:id', getSize);
router.put('/:id', updateSize);
router.delete('/:id', deleteSize);

// Apply a size to current user -> create a measurement document from this size
router.post('/:id/apply', applySizeToUser);

module.exports = router;

