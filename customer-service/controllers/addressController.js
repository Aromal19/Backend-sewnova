const Address = require('../models/address');

// Create a new address
const createAddress = async (req, res) => {
  try {
    console.log('🔍 Creating address with data:', req.body);
    console.log('👤 User from token:', req.user);

    const { 
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
    } = req.body;

    // Extract customerId from user object returned by auth service
    // The auth service validateToken returns user with 'id' field
    const customerId = req.user.id;
    
    if (!customerId) {
      console.error('❌ No customerId found in token:', req.user);
      return res.status(401).json({
        success: false,
        message: 'User ID not found in token'
      });
    }

    console.log('🔑 CustomerId extracted:', customerId);

    // Create address data with all form fields
    const addressData = {
      customerId,
      addressType: addressType || 'home',
      addressLine,
      landmark,
      locality,
      city,
      district,
      state,
      pincode,
      country: country || 'India',
      isDefault: isDefault || false
    };

    console.log('📝 Address data to save:', addressData);

    // Save address
    const address = new Address(addressData);
    await address.save();

    console.log('✅ Address saved successfully:', address._id);

    res.status(201).json({
      success: true,
      message: 'Address created successfully',
      data: address
    });

  } catch (error) {
    console.error('❌ Error creating address:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to create address',
      error: error.message
    });
  }
};

// Get all addresses for the current customer
const getAddresses = async (req, res) => {
  try {
    const customerId = req.user.id;
    
    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: 'User ID not found in token'
      });
    }

    const addresses = await Address.find({ customerId });
    
    res.json({
      success: true,
      data: addresses
    });
  } catch (error) {
    console.error('Error fetching addresses:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch addresses'
    });
  }
};

module.exports = {
  createAddress,
  getAddresses,
  // Update an existing address
  updateAddress: async (req, res) => {
    try {
      const customerId = req.user.id;
      const { id } = req.params;

      if (!customerId) {
        return res.status(401).json({ success: false, message: 'User ID not found in token' });
      }

      const updatePayload = {
        addressType: req.body.addressType,
        addressLine: req.body.addressLine,
        landmark: req.body.landmark,
        locality: req.body.locality,
        city: req.body.city,
        district: req.body.district,
        state: req.body.state,
        pincode: req.body.pincode,
        country: req.body.country,
        isDefault: req.body.isDefault,
      };

      // Remove undefined fields to avoid overwriting with undefined
      Object.keys(updatePayload).forEach((key) => updatePayload[key] === undefined && delete updatePayload[key]);

      const updated = await Address.findOneAndUpdate(
        { _id: id, customerId },
        { $set: updatePayload },
        { new: true }
      );

      if (!updated) {
        return res.status(404).json({ success: false, message: 'Address not found' });
      }

      return res.json({ success: true, message: 'Address updated successfully', data: updated });
    } catch (error) {
      console.error('❌ Error updating address:', error.message);
      return res.status(500).json({ success: false, message: 'Failed to update address' });
    }
  },
  // Delete an address
  deleteAddress: async (req, res) => {
    try {
      const customerId = req.user.id;
      const { id } = req.params;

      if (!customerId) {
        return res.status(401).json({ success: false, message: 'User ID not found in token' });
      }

      const deleted = await Address.findOneAndDelete({ _id: id, customerId });
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Address not found' });
      }

      return res.json({ success: true, message: 'Address deleted successfully' });
    } catch (error) {
      console.error('❌ Error deleting address:', error.message);
      return res.status(500).json({ success: false, message: 'Failed to delete address' });
    }
  }
}; 