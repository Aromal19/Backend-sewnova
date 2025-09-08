const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// Product routes
router.post('/', productController.addFabric);
router.post('/detect-color', productController.detectColorFromImage);
router.get('/', productController.getSellerProducts);
router.get('/:id', productController.getProduct);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

module.exports = router;