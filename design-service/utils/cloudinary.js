const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Configure Cloudinary
console.log('Cloudinary Config:', {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'Not set',
  api_key: process.env.CLOUDINARY_API_KEY ? 'Set' : 'Not set',
  api_secret: process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Not set'
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload single image to Cloudinary
const uploadImage = async (imageData, folder = 'sewnova/designs') => {
  try {
    console.log('Uploading image to Cloudinary:', {
      imageDataType: typeof imageData,
      hasBuffer: imageData && imageData.buffer ? 'yes' : 'no',
      mimetype: imageData && imageData.mimetype ? imageData.mimetype : 'unknown',
      bufferLength: imageData && imageData.buffer ? imageData.buffer.length : 'unknown'
    });

    let uploadOptions = {
      folder: folder,
      resource_type: 'auto',
      quality: 'auto',
      fetch_format: 'auto'
    };

    let result;
    
    // Handle different input types
    if (typeof imageData === 'string') {
      // URL or file path
      console.log('Uploading string/image URL');
      result = await cloudinary.uploader.upload(imageData, uploadOptions);
    } else if (imageData.buffer) {
      // File buffer from multer - convert to base64 data URI
      console.log('Uploading buffer data');
      const base64String = imageData.buffer.toString('base64');
      const dataUri = `data:${imageData.mimetype};base64,${base64String}`;
      console.log('Data URI length:', dataUri.length);
      result = await cloudinary.uploader.upload(dataUri, uploadOptions);
    } else {
      throw new Error('Invalid image data format');
    }
    
    return {
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height
    };
  } catch (error) {
    console.error('Cloudinary upload error:', {
      error: error.message,
      imageDataType: typeof imageData,
      hasBuffer: imageData && imageData.buffer ? 'yes' : 'no',
      mimetype: imageData && imageData.mimetype ? imageData.mimetype : 'unknown'
    });
    return {
      success: false,
      error: error.message
    };
  }
};

// Upload multiple images to Cloudinary
const uploadMultipleImages = async (imagePaths, folder = 'sewnova/designs') => {
  try {
    const uploadPromises = imagePaths.map(imagePath => uploadImage(imagePath, folder));
    const results = await Promise.all(uploadPromises);
    
    const successful = results.filter(result => result.success);
    const failed = results.filter(result => !result.success);
    
    return {
      success: failed.length === 0,
      images: successful.map(result => result.url),
      errors: failed.map(result => result.error),
      totalUploaded: successful.length,
      totalFailed: failed.length
    };
  } catch (error) {
    console.error('Multiple image upload error:', error);
    return {
      success: false,
      error: error.message,
      images: [],
      errors: [error.message]
    };
  }
};

// Delete image from Cloudinary
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return {
      success: result.result === 'ok',
      result: result.result
    };
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Delete multiple images from Cloudinary
const deleteMultipleImages = async (publicIds) => {
  try {
    const deletePromises = publicIds.map(publicId => deleteImage(publicId));
    const results = await Promise.all(deletePromises);
    
    const successful = results.filter(result => result.success);
    const failed = results.filter(result => !result.success);
    
    return {
      success: failed.length === 0,
      deleted: successful.length,
      failed: failed.length,
      errors: failed.map(result => result.error)
    };
  } catch (error) {
    console.error('Multiple image delete error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  uploadImage,
  uploadMultipleImages,
  deleteImage,
  deleteMultipleImages
};
