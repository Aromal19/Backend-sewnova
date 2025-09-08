const Tailor = require('../models/tailor');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary (expects env vars present like vendor-service)
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

const upload = multer({ storage: multer.memoryStorage() });
const bcrypt = require('bcryptjs');
const { validateEmailForRegistration } = require('../utils/emailValidation');
const { generateVerificationToken, sendVerificationEmail } = require('../utils/emailService');
const { generateAccessToken, generateRefreshToken, REFRESH_TOKEN_EXPIRES_IN } = require('../utils/tokenService');

// Register a new tailor
const register = async (req, res) => {
  try {
    const { firstname, lastname, email, phone, countryCode, password, shopName, experience, specialization, address, pincode, district, state, country } = req.body;
    const emailValidation = await validateEmailForRegistration(email);
    if (!emailValidation.isValid) {
      return res.status(400).json({ success: false, message: emailValidation.message });
    }
    const existingTailor = await Tailor.findOne({ phone });
    if (existingTailor) {
      return res.status(400).json({ success: false, message: 'Tailor with this phone number already exists' });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const tailor = new Tailor({
      firstname,
      lastname,
      email,
      phone,
      countryCode: countryCode || '+91', // Default to India if not provided
      password: hashedPassword,
      shopName,
      experience,
      specialization,
      address,
      pincode,
      district,
      state,
      country
    });
    const verificationToken = generateVerificationToken();
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    tailor.emailVerificationToken = verificationToken;
    tailor.emailVerificationTokenExpires = tokenExpiry;
    await tailor.save();
    const userName = `${tailor.firstname} ${tailor.lastname}`;
    const emailResult = await sendVerificationEmail(tailor.email, verificationToken, 'tailor', userName);
    if (emailResult.success) {
      res.status(201).json({
        success: true,
        message: 'Tailor registered successfully. Please check your email to verify your account.',
        requiresEmailVerification: true,
        email: tailor.email,
        userType: 'tailor'
      });
    } else {
      res.status(201).json({
        success: true,
        message: 'Tailor registered successfully, but verification email could not be sent. Please try resending verification email.',
        requiresEmailVerification: true,
        email: tailor.email,
        userType: 'tailor',
        emailError: true
      });
    }
  } catch (error) {
    console.error('Tailor registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get tailor profile
const getProfile = async (req, res) => {
  try {
    const tailor = await Tailor.findById(req.user._id).select('-password');
    
    if (!tailor) {
      return res.status(404).json({ success: false, message: 'Tailor profile not found' });
    }

    res.json({ 
      success: true,
      message: 'Profile retrieved successfully',
      tailor 
    });
  } catch (error) {
    console.error('Get tailor profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update tailor profile
const updateProfile = async (req, res) => {
  try {
    const updates = req.body;
    const allowedUpdates = [
      'firstName', 'lastName', 'phone', 'countryCode', 'shopName', 'shopAddress',
      'experience', 'speciality', 'workingHours', 'about', 'skills'
    ];

    // Filter out non-allowed fields
    const filteredUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        // Map frontend field names to database field names
        if (key === 'firstName') filteredUpdates.firstname = updates[key];
        else if (key === 'lastName') filteredUpdates.lastname = updates[key];
        else if (key === 'shopAddress') filteredUpdates.address = updates[key];
        else if (key === 'speciality') filteredUpdates.specialization = updates[key];
        else filteredUpdates[key] = updates[key];
      }
    });

    const tailor = await Tailor.findByIdAndUpdate(
      req.user._id,
      filteredUpdates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!tailor) {
      return res.status(404).json({ success: false, message: 'Tailor profile not found' });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      tailor
    });
  } catch (error) {
    console.error('Update tailor profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const tailor = await Tailor.findById(req.user._id); // Use _id directly from user object
    if (!tailor) {
      return res.status(404).json({ success: false, message: 'Tailor not found' });
    }
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, tailor.password);
    if (!isPasswordValid) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    tailor.password = hashedPassword;
    await tailor.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete tailor account
const deleteAccount = async (req, res) => {
  try {
    const tailor = await Tailor.findByIdAndDelete(req.user._id);
    if (!tailor) {
      return res.status(404).json({ success: false, message: 'Tailor not found' });
    }
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get all tailors (admin function)
const getAllTailors = async (req, res) => {
  try {
    const tailors = await Tailor.find().select('-password');
    res.json({ tailors });
  } catch (error) {
    console.error('Get all tailors error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get tailor by ID (admin function)
const getTailorById = async (req, res) => {
  try {
    const tailor = await Tailor.findById(req.params.id).select('-password');
    if (!tailor) {
      return res.status(404).json({ message: 'Tailor not found' });
    }
    res.json({ tailor });
  } catch (error) {
    console.error('Get tailor by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get tailor by email
const getTailorByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const tailor = await Tailor.findOne({ email }).select('-password');
    if (!tailor) {
      return res.status(404).json({ message: 'Tailor not found' });
    }
    res.json({ tailor });
  } catch (error) {
    console.error('Get tailor by email error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update tailor by email
const updateTailorByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const updates = req.body;
    const allowedUpdates = [
      'firstname', 'lastname', 'phone', 'shopName', 'experience',
      'specialization', 'address', 'pincode', 'district', 'state',
      'country', 'profileImage'
    ];

    // Filter out non-allowed fields
    const filteredUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    const tailor = await Tailor.findOneAndUpdate(
      { email },
      filteredUpdates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!tailor) {
      return res.status(404).json({ message: 'Tailor not found' });
    }

    res.json({
      message: 'Tailor updated successfully',
      tailor
    });
  } catch (error) {
    console.error('Update tailor by email error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete tailor by email
const deleteTailorByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    
    const tailor = await Tailor.findOneAndDelete({ email });
    if (!tailor) {
      return res.status(404).json({ message: 'Tailor not found' });
    }
    
    res.json({ message: 'Tailor deleted successfully' });
  } catch (error) {
    console.error('Delete tailor by email error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  register,
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
  getAllTailors,
  getTailorById,
  getTailorByEmail,
  updateTailorByEmail,
  deleteTailorByEmail
}; 

// Aadhaar verification for Tailor
const verifyAadhaarHandler = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      return res.status(500).json({ success: false, message: 'Cloudinary not configured' });
    }

    const isPdf = (req.file.mimetype || '').toLowerCase().includes('pdf');
    const uploadResult = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
      { folder: 'sewnova/tailor-verification', resource_type: 'auto' }
    );

    let imageUrl = uploadResult.secure_url;
    if (isPdf) {
      imageUrl = cloudinary.url(uploadResult.public_id, { secure: true, format: 'jpg', page: 1 });
    }

    const { data: ocr } = await Tesseract.recognize(imageUrl, 'eng');
    const text = ocr?.text || '';

    const aadhaarRegex = /(\d{4}[\s-]?\d{4}[\s-]?\d{4})/;
    const nameRegex = /(?:(?:Name|NAME)\s*:?\s*)([A-Za-z ]{3,})/;
    const dobRegex = /(?:(?:DOB|D\.O\.B|Date of Birth)\s*:?\s*)(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i;
    const genderRegex = /(Male|Female|MALE|FEMALE)/;

    const rawAadhaar = (text.match(aadhaarRegex) || [])[1] || '';
    const normalizedAadhaar = rawAadhaar.replace(/\D/g, '');
    const parsed = {
      aadhaarNumber: normalizedAadhaar,
      name: ((text.match(nameRegex) || [])[1] || '').trim(),
      dob: (text.match(dobRegex) || [])[1] || '',
      gender: ((text.match(genderRegex) || [])[1] || '').toLowerCase()
    };

    const expectedName = (req.body?.expectedName || '').trim();
    const normalizeName = (n) => n.toLowerCase().replace(/[^a-z]/g, '');
    const namesMatch = expectedName && parsed.name
      ? normalizeName(parsed.name) === normalizeName(expectedName)
      : false;

    const isAadhaarValid = normalizedAadhaar.length === 12;
    const hasDob = Boolean(parsed.dob);
    const hasGender = parsed.gender === 'male' || parsed.gender === 'female';
    const status = (isAadhaarValid && hasDob && hasGender && namesMatch) ? 'verified' : 'rejected';

    const tailor = await Tailor.findByIdAndUpdate(
      req.user._id,
      {
        isVerified: status === 'verified',
        aadhaar: {
          number: parsed.aadhaarNumber || '',
          name: parsed.name || '',
          dob: parsed.dob || '',
          gender: parsed.gender || '',
          documentPublicId: uploadResult.public_id,
          documentUrl: imageUrl,
          status
        }
      },
      { new: true }
    ).select('-password');

    return res.status(201).json({ success: true, data: { parsed: { aadhaarNumber: parsed.aadhaarNumber, dob: parsed.dob, gender: parsed.gender }, status, tailor } });
  } catch (error) {
    console.error('Tailor Aadhaar verification error:', error);
    return res.status(500).json({ success: false, message: 'Verification failed', error: error.message });
  }
};

module.exports.verifyAadhaar = [upload.single('file'), verifyAadhaarHandler];