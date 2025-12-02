// vendor.controller.js
const Vendor = require('../model/Vendor');
const User = require('../model/auth');

exports.createVendor = async (req, res) => {
  try {
    const { name, contactInfo = {}, productList = [], userId } = req.body;
    console.log('[CREATE VENDOR] body:', req.body);

    if (!userId || !name) {
      console.error('[CREATE VENDOR] Missing userId or name');
      return res.status(400).json({ success: false, error: 'userId and name are required' });
    }

    // fetch creator
    const creator = await User.findById(userId);
    if (!creator) {
      console.error('[CREATE VENDOR] Creator not found:', userId);
      return res.status(404).json({ success: false, error: 'Creator not found' });
    }

    // determine owning superAdmin
    let owningSuperAdminId;
    if (creator.role === 'SuperAdmin') {
      owningSuperAdminId = creator._id;
    } else if (creator.role === 'Admin') {
      if (!creator.managingSuperAdmin) {
        console.error('[CREATE VENDOR] Admin has no managingSuperAdmin:', creator._id);
        return res.status(400).json({ success: false, error: 'This admin has no managingSuperAdmin assigned' });
      }
      owningSuperAdminId = creator.managingSuperAdmin;
    } else {
      console.error('[CREATE VENDOR] Role not allowed to create vendor:', creator.role);
      return res.status(403).json({ success: false, error: 'Only Admin or SuperAdmin can create vendors' });
    }

    // prevent duplicate vendor name within the same superAdmin scope
    const existing = await Vendor.findOne({ name, superAdmin: owningSuperAdminId, isDeleted: false });
    if (existing) {
      console.warn('[CREATE VENDOR] Duplicate vendor under same SuperAdmin:', name);
      return res.status(409).json({ success: false, error: 'Vendor name already exists under this SuperAdmin' });
    }

    const vendor = await Vendor.create({
      name,
      contactInfo,
      productList,
      superAdmin: owningSuperAdminId, // owning superadmin (visibility scope)
      createdBy: creator._id
    });

    console.log('[CREATE VENDOR] Created vendor:', vendor._id);
    return res.status(201).json({ success: true, vendor });

  } catch (err) {
    console.error('[CREATE VENDOR] Error:', err);
    return res.status(500).json({ success: false, error: 'Server error', details: err.message });
  }
};


exports.getAllVendors = async (req, res) => {
  try {
    const { userId } = req.body;
    console.log('[GET VENDORS] userId:', userId);

    if (!userId) {
      console.error('[GET VENDORS] Missing userId');
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    const user = await User.findById(userId).select('role managingSuperAdmin');
    if (!user) {
      console.error('[GET VENDORS] User not found:', userId);
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    let superAdminId;
    if (user.role === 'SuperAdmin') {
      superAdminId = user._id;
    } else if (user.role === 'Admin') {
      if (!user.managingSuperAdmin) {
        console.error('[GET VENDORS] Admin has no managingSuperAdmin:', userId);
        return res.status(400).json({ success: false, error: 'Admin has no managingSuperAdmin assigned' });
      }
      superAdminId = user.managingSuperAdmin;
    } else {
      console.error('[GET VENDORS] Role not allowed:', user.role);
      return res.status(403).json({ success: false, error: 'Only Admin or SuperAdmin can view vendors' });
    }

    console.log('[GET VENDORS] superAdminId scope:', superAdminId);

    const vendors = await Vendor.find({ superAdmin: superAdminId });
    console.log(vendors,"vendors");

    console.log(`[GET VENDORS] Found ${vendors.length} vendors for superAdmin ${superAdminId}`);
    return res.status(200).json(vendors);

  } catch (err) {
    console.error('[GET VENDORS] Error:', err);
    return res.status(500).json({ success: false, error: 'Server error', details: err.message });
  }
};

// 🔍 Get a vendor by ID
exports.getVendorById = async (req, res) => {
    try {
        const { id } = req.body;
        const vendor = await Vendor.findById(id).populate('productList').populate('firm');

        if (!vendor) {
            console.warn(`⚠️ Vendor not found: ID ${id}`);
            return res.status(404).json({ error: 'Vendor not found' });
        }

        console.log('📍 Vendor fetched:', vendor.name);
        res.status(200).json(vendor);
    } catch (error) {
        console.error('❌ Error fetching vendor:', error.message);
        res.status(500).json({ error: 'Server error while fetching vendor' });
    }
};

// ✏️ Update vendor
exports.updateVendor = async (req, res) => {
  try {
    const { vendorId, contactInfo = {}, ...otherUpdates } = req.body;

    if (!vendorId) {
      console.warn("⚠️ vendorId is missing in request body.");
      return res.status(400).json({ error: 'vendorId is required.' });
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      console.warn(`⚠️ Vendor not found: ${vendorId}`);
      return res.status(404).json({ error: 'Vendor not found.' });
    }

    // Merge contactInfo fields with existing values
    const updatedContactInfo = {
      ...vendor.contactInfo.toObject(),
      ...contactInfo
    };

    // Merge everything together for update
    const finalUpdate = {
      ...otherUpdates,
      contactInfo: updatedContactInfo
    };

    const updatedVendor = await Vendor.findByIdAndUpdate(
      vendorId,
      finalUpdate,
      { new: true, runValidators: true }
    );

    console.log(`✅ Vendor updated: ${updatedVendor.name} (${vendorId})`);
    return res.status(200).json({
      msg: 'Vendor updated successfully.',
      vendor: updatedVendor,
    });

  } catch (error) {
    console.error('❌ Error updating vendor:', error.message);
    return res.status(500).json({
      error: 'Internal server error. Vendor not updated.',
      details: error.message,
    });
  }
};


// 🗑️ Delete vendor
exports.deleteVendor = async (req, res) => {
  try {
    console.log('🗑️ Deleting vendor...',req.body);
    const { vendorId } = req.body;

    if (!vendorId) {
      console.warn("⚠️ vendorId is missing in request body.");
      return res.status(400).json({ error: 'vendorId is required.' });
    }

    const deletedVendor = await Vendor.findByIdAndDelete(vendorId);

    if (!deletedVendor) {
      console.warn(`⚠️ Vendor not found for deletion: ${vendorId}`);
      return res.status(404).json({ error: 'Vendor not found.' });
    }

    console.log(`🗑️ Vendor deleted successfully: ${deletedVendor.name} (${vendorId})`);
    return res.status(200).json({
        success:true,
      message: 'Vendor deleted successfully.',
      vendorId: deletedVendor._id
    });

  } catch (error) {
    console.error('❌ Error deleting vendor:', error.message);
    return res.status(500).json({
      error: 'Internal server error. Vendor not deleted.',
      details: error.message
    });
  }
};

/**
 * Get vendors by firmId
 */
exports.getVendorsByFirmId = async (req, res) => {
    try {
        const { firmId } = req.body;
        const vendors = await Vendor.find({ firm: firmId }).populate('productList').populate('firm');
        if (!vendors || vendors.length === 0) {
            console.warn(`⚠️ No vendors found for firmId: ${firmId}`);
            return res.status(404).json({ error: 'No vendors found for this firm' });
        }
        console.log(`🏢 Fetched ${vendors.length} vendors for firmId: ${firmId}`);
        res.status(200).json(vendors);
    } catch (error) {
        console.error('❌ Error fetching vendors by firmId:', error.message);
        res.status(500).json({ error: 'Server error while fetching vendors by firmId' });
    }
};
