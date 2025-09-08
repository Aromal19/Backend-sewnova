const Tailor = require('../models/Tailor');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

const upload = multer({ storage: multer.memoryStorage() });

// Save or update shop information and address for the current tailor
const saveShopInfo = async (req, res) => {
  try {
    const tailorId = req.user?.userId || req.user?._id || req.user?.id;
    if (!tailorId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const {
      // shop fields
      shopName,
      speciality, // string
      experience, // number
      shopImage, // optional image URL
      // address fields (same format as customer-service addresses)
      addressType,
      addressLine,
      landmark,
      locality,
      city,
      district,
      state,
      pincode,
      country,
      isDefault
    } = req.body || {};

    // Compose single-line address string similar to frontend
    const composedAddress = [
      addressLine || '',
      locality || '',
      city || '',
      district || '',
      state || '',
      pincode || ''
    ].filter(Boolean).join(', ');

    const updates = {};
    if (shopName != null) updates.shopName = shopName;
    if (typeof experience !== 'undefined') updates.experience = Number(experience) || 0;
    if (speciality) updates.specialization = [speciality];
    if (shopImage) updates.shopImage = shopImage;
    if (composedAddress) updates.address = composedAddress;
    if (pincode) updates.pincode = String(pincode);
    if (district) updates.district = district;
    if (state) updates.state = state;
    if (country) updates.country = country;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No fields provided to update' });
    }

    const existing = await Tailor.findById(tailorId).select('-password');
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Tailor not found' });
    }

    const updated = await Tailor.findByIdAndUpdate(
      tailorId,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Tailor not found' });
    }

    return res.status(200).json({ success: true, message: 'Shop info saved', data: { tailor: updated } });
  } catch (err) {
    console.error('Save shop info error:', err);
    return res.status(500).json({ success: false, message: 'Failed to save shop info', error: err.message });
  }
};

// Upload profile or shop image
const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      return res.status(500).json({ success: false, message: 'Image upload service not configured' });
    }

    const tailorId = req.user?.userId || req.user?._id || req.user?.id;
    if (!tailorId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { imageType } = req.body; // 'profileImage' or 'shopImage'
    if (!imageType || !['profileImage', 'shopImage'].includes(imageType)) {
      return res.status(400).json({ success: false, message: 'Invalid image type' });
    }

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
      { 
        folder: `sewnova/tailor-${imageType}`,
        resource_type: 'auto'
      }
    );

    const imageUrl = uploadResult.secure_url;

    // Update tailor with new image
    const updatedTailor = await Tailor.findByIdAndUpdate(
      tailorId,
      { [imageType]: imageUrl },
      { new: true }
    ).select('-password');

    if (!updatedTailor) {
      return res.status(404).json({ success: false, message: 'Tailor not found' });
    }

    res.json({
      success: true,
      message: `${imageType === 'profileImage' ? 'Profile' : 'Shop'} image updated successfully`,
      data: {
        [imageType]: imageUrl,
        tailor: updatedTailor
      }
    });

  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to upload image', 
      error: error.message 
    });
  }
};

module.exports = { 
  saveShopInfo, 
  uploadImage,
  upload: upload.single('image')
};

