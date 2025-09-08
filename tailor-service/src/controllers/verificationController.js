const multer = require('multer');
const Tesseract = require('tesseract.js');
const cloudinary = require('cloudinary').v2;
const Tailor = require('../models/Tailor');
const Verification = require('../models/Verification');

// Configure Cloudinary
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

const upload = multer({ storage: multer.memoryStorage() });

const verifyAadhaar = async (req, res) => {
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
    const dobRegex = /(?:(?:DOB|D\.O\.B|Date of Birth|Year of Birth)\s*:?\s*)(\d{2}[\/\-]\d{2}[\/\-]\d{4}|\d{4})/i;
    const genderRegex = /(Male|Female|MALE|FEMALE|male|female)/;

    const lines = text
      .split(/\r?\n/)
      .map(l => l.replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    const fullText = lines.join('\n');
    const rawAadhaar = (fullText.match(aadhaarRegex) || [])[1] || '';
    const normalizedAadhaar = rawAadhaar.replace(/\D/g, '');

    let candidateName = '';
    const labelMatch = fullText.match(/(?:(?:Name|NAME)\s*:?\s*)([A-Za-z .]{3,})/);
    if (labelMatch && labelMatch[1]) {
      candidateName = labelMatch[1].trim();
    } else {
      const aadhaarLineIdx = lines.findIndex(l => aadhaarRegex.test(l));
      const startIdx = Math.max(0, (aadhaarLineIdx === -1 ? 0 : aadhaarLineIdx - 3));
      const endIdx = Math.max(0, (aadhaarLineIdx === -1 ? Math.min(3, lines.length) : aadhaarLineIdx));
      const window = lines.slice(startIdx, endIdx);
      const bannedTokens = /(?:Government|GOVERNMENT|VID|Enrol|Enrolment|Address|DOB|D\.O\.B|Date of Birth|Year of Birth|Male|Female|S\/O|D\/O|W\/O|to|of|India|Unique|Identification)/i;
      const nameLike = window
        .filter(l => /^[A-Za-z .]{3,}$/.test(l) && !bannedTokens.test(l))
        .sort((a, b) => b.length - a.length);
      if (nameLike.length) candidateName = nameLike[0].trim();
    }

    candidateName = (candidateName || '').replace(/[^A-Za-z .]/g, ' ').replace(/\s+/g, ' ').trim();

    const dobMatch = fullText.match(dobRegex);
    const genderMatch = fullText.match(genderRegex);

    const parsed = {
      aadhaarNumber: normalizedAadhaar,
      name: candidateName,
      dob: dobMatch ? dobMatch[1] : '',
      gender: (genderMatch ? genderMatch[1] : '').toLowerCase()
    };

    const expectedName = (req.body?.expectedName || '').trim();
    const expectedFirstName = (req.body?.expectedFirstName || '').trim();
    const expectedLastName = (req.body?.expectedLastName || '').trim();
    const normalize = (n) => (n || '').toLowerCase().replace(/[^a-z]/g, '');
    const tokenize = (n) => normalize(n).split(/\s+/).filter(t => t.length > 0);
    const startsWith = (a, b) => a.startsWith(b) || b.startsWith(a); // tolerate OCR prefix mismatches

    const parsedTokens = tokenize(parsed.name);
    const expectedTokens = tokenize(expectedName);
    const firstToken = normalize(expectedFirstName);
    const lastToken = normalize(expectedLastName);

    // Full-name token match (order-insensitive, prefix tolerant)
    let fullMatch = false;
    if (expectedTokens.length > 0 && parsedTokens.length > 0) {
      const matched = expectedTokens.every(et => parsedTokens.some(pt => startsWith(pt, et)));
      fullMatch = matched;
    }

    // First + Last independent match
    let firstLastMatch = false;
    if (firstToken) {
      const firstOk = parsedTokens.some(pt => startsWith(pt, firstToken));
      const lastOk = lastToken ? parsedTokens.some(pt => startsWith(pt, lastToken)) : true;
      firstLastMatch = firstOk && lastOk;
    }

    const isAadhaarValid = /^\d{12}$/.test(parsed.aadhaarNumber);
    const status = isAadhaarValid ? 'verified' : 'rejected';

    const verification = await Verification.create({
      tailorId: req.user.userId,
      documentType: 'aadhaar',
      documentPublicId: uploadResult.public_id,
      documentUrl: imageUrl,
      ocrText: text,
      parsed,
      status
    });

    // Update tailor document but gate isVerified by presence of a photo
    const current = await Tailor.findById(req.user.userId).select('profileImage shopImage');
    const hasPhoto = Boolean(current && (current.profileImage || current.shopImage));

    const tailor = await Tailor.findByIdAndUpdate(
      req.user.userId,
      {
        isVerified: (status === 'verified') && hasPhoto,
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

    return res.status(201).json({ success: true, data: { id: verification._id, parsed: { aadhaarNumber: parsed.aadhaarNumber, dob: parsed.dob, gender: parsed.gender }, status } });
  } catch (error) {
    console.error('Tailor Aadhaar verification error:', error);
    return res.status(500).json({ success: false, message: 'Verification failed', error: error.message });
  }
};

module.exports = {
  upload,
  verifyAadhaar
};

