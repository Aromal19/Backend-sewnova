const express = require('express');
const router = express.Router();
const designController = require('../controllers/designControllerNew');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 files
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Design management routes - NO AUTHENTICATION
router.get('/', designController.getAllDesigns);
router.get('/stats', designController.getDesignStats);
router.get('/categories', designController.getCategories);
router.get('/:id', designController.getDesignById);

// Design management routes - NO AUTHENTICATION
router.post('/', upload.array('images', 10), designController.createDesign);
router.put('/:id', upload.array('images', 10), designController.updateDesign);
router.delete('/:id', designController.deleteDesign);

module.exports = router;
