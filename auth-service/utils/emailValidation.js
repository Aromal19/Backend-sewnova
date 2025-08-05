const Customer = require('../models/customer');
const Seller = require('../models/seller');
const Tailor = require('../models/tailor');

/**
 * Check if email exists across all user types
 * @param {string} email - Email to check
 * @returns {Object} - Result object with exists flag and user type if found
 */
const checkEmailExists = async (email) => {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check in Customer collection
    const customer = await Customer.findOne({ email: normalizedEmail });
    if (customer) {
      return {
        exists: true,
        userType: 'customer',
        message: 'Email is already registered as a customer'
      };
    }

    // Check in Seller collection
    const seller = await Seller.findOne({ email: normalizedEmail });
    if (seller) {
      return {
        exists: true,
        userType: 'seller',
        message: 'Email is already registered as a seller'
      };
    }

    // Check in Tailor collection
    const tailor = await Tailor.findOne({ email: normalizedEmail });
    if (tailor) {
      return {
        exists: true,
        userType: 'tailor',
        message: 'Email is already registered as a tailor'
      };
    }

    // Email doesn't exist in any collection
    return {
      exists: false,
      userType: null,
      message: 'Email is available for registration'
    };
  } catch (error) {
    console.error('Email validation error:', error);
    throw new Error('Error checking email availability');
  }
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid email format
 */
const validateEmailFormat = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Comprehensive email validation for registration
 * @param {string} email - Email to validate
 * @returns {Object} - Validation result
 */
const validateEmailForRegistration = async (email) => {
  try {
    // Check if email is provided
    if (!email) {
      return {
        isValid: false,
        message: 'Email is required'
      };
    }

    // Check email format
    if (!validateEmailFormat(email)) {
      return {
        isValid: false,
        message: 'Please provide a valid email address'
      };
    }

    // Check if email already exists
    const emailCheck = await checkEmailExists(email);
    if (emailCheck.exists) {
      return {
        isValid: false,
        message: emailCheck.message
      };
    }

    return {
      isValid: true,
      message: 'Email is available for registration'
    };
  } catch (error) {
    console.error('Email validation error:', error);
    return {
      isValid: false,
      message: 'Error validating email'
    };
  }
};

module.exports = {
  checkEmailExists,
  validateEmailFormat,
  validateEmailForRegistration
}; 