// vendor.controller.js
const Vendor = require('../model/Vendor');

// 🧠 Create a new vendor
exports.createVendor = async (req, res) => {
  try {
    const { name, contactInfo, productList } = req.body;

    // Validate required fields
    if (!name) {
      console.warn("⚠️ Missing required fields: name or firm");
      return res.status(400).json({ error: 'Vendor name and firm are required.' });
    }

    // Check for duplicate vendor name
    const existingVendor = await Vendor.findOne({ name });
    if (existingVendor) {
      console.warn(`⚠️ Vendor already exists with name: ${name}`);
      return res.status(400).json({ error: 'Vendor name already exists.' });
    }

    // Create new vendor doc
    const newVendor = new Vendor({
      name,
      contactInfo: contactInfo || {},
      productList: productList || [],
    });

    await newVendor.save();

    console.log(`✅ Vendor created successfully: ${newVendor._id}`);
    return res.status(201).json({
      msg: 'Vendor created successfully.',
      vendor: {
        _id: newVendor._id,
        name: newVendor.name,
        // firm: newVendor.firm,
      }
    });

  } catch (error) {
    console.error('❌ Server error while creating vendor:', error.message);
    return res.status(500).json({
      error: 'Internal server error. Vendor not created.',
      details: error.message,
    });
  }
};


// 📜 Get all vendors - 
exports.getAllVendors = async (req, res) => {
    console.log("=============== [getAllVendors] Function start ===============");

    try {
        console.log("=============== Connecting to DB & fetching vendors ===============");
        const vendors = await Vendor.find().populate('productList');
        console.log(`=============== Successfully fetched ${vendors.length} vendors ===============`);

        console.log("=============== Sending response to client ===============");
        res.status(200).json(vendors);

    } catch (error) {
        console.error("=============== ERROR in getAllVendors ===============");
        console.error(error); // full error stack
        res.status(500).json({ error: 'Server error while fetching vendors' });
    }

    console.log("=============== [getAllVendors] Function end ===============");
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
