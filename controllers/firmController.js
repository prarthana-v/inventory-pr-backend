const Firm = require('../model/firm');
const User = require('../model/auth');
// Create a new firm
/**
 * POST /api/firms
 * Create a new firm
 */
exports.createFirm = async (req, res) => {
    try {
        const { name, address, contact } = req.body;

        // Basic validation
        if (!name || !address || !contact) {
            console.warn("⚠️ Missing required fields for firm creation.");
            return res.status(400).json({ success: false, message: 'All fields are required.' });
        }

        // Check if firm already exists
        const existingFirm = await Firm.findOne({ name });
        if (existingFirm) {
            console.warn(`⚠️ Firm already exists: ${name}`);
            return res.status(409).json({ success: false, message: 'Firm already exists.' });
        }

        // Create and save the new firm
        const firm = new Firm({ name, address, contact });
        await firm.save();

        console.log(`✅ Firm created: ${firm._id} (${name})`);
        res.status(201).json({ success: true, message: 'Firm created successfully.', firm });
    } catch (error) {
        console.error("❌ Error creating firm:", error.message);
        res.status(500).json({ success: false, message: 'Server error.', error: error.message });
    }
};
/**
 * GET /api/firms
 * Get all firms
 */
exports.getAllFirms = async (req, res) => {
    try {
        const firms = await Firm.find();
        console.log("📦 All firms fetched.");
        return res.status(200).json({ success: true, firms });
    } catch (error) {
        console.error("❌ Error fetching firms:", error.message);
        return res.status(500).json({ success: false, message: 'Internal server error.', error: error.message });
    }
};

/**
 * GET /api/firms/:id
 * Get firm by ID
 */
exports.getFirmById = async (req, res) => {
    try {

        const { firmId } = req.body;

        if (!firmId) {
            console.warn("⚠️ ID not provided in request body");
            return res.status(400).json({ success: false, message: 'Firm ID is required.' });
        }

        const firm = await Firm.findById(firmId);

        if (!firm) {
            console.warn(`⚠️ No firm found for ID: ${firmId}`);
            return res.status(404).json({ success: false, message: 'Firm not found.' });
        }

        console.log(`📦 Firm fetched: ${firmId}`);
        res.status(200).json({ success: true, firm });

    } catch (error) {
        console.error("❌ Error fetching firm:", error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

/**
 * GET /api/firms/admin/:adminId
 * Get firms by admin ID
 */
exports.getFirmsByAdminId = async (req, res) => {
    try {
        const { adminId } = req.params;
        const firms = await Firm.find({ adminId });

        console.log(`📂 Firms fetched for adminId: ${adminId}`);
        return res.status(200).json({ success: true, firms });
    } catch (error) {
        console.error(`❌ Error fetching firms by adminId (${req.params.adminId}):`, error.message);
        return res.status(500).json({ success: false, message: 'Internal server error.', error: error.message });
    }
};

/**
 * PUT /api/firms/:id
 * Edit/update a firm
 */
exports.editFirm = async (req, res) => {
    try {
        const { firmId, ...updates } = req.body;
        console.log("🔄 Updating firm with ID:", firmId, "with data:", updates);

        if (!firmId) {
            return res.status(400).json({ success: false, message: "firmId is required" });
        }

        const updatedDoc = await Firm.findByIdAndUpdate(firmId, updates, {
            new: true,
            runValidators: true,
        });

        if (!updatedDoc) {
            return res.status(404).json({ success: false, message: "Item not found" });
        }

        res.status(200).json({ success: true, data: updatedDoc });
    } catch (err) {
        console.error("Update error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

/**
 * DELETE /api/firms/:id
 * Delete a firm
 */
exports.deleteFirm = async (req, res) => {
    console.log("🗑️ Deleting firm with ID:", req.body);
    const { firmId } = req.body;

    if (!firmId) {
        return res.status(400).json({ success: false, message: 'Firm ID is required.' });
    }

    try {
        const deletedFirm = await Firm.findByIdAndDelete(firmId);

        if (!deletedFirm) {
            console.warn(`⚠️ Firm not found for delete: ${firmId}`);
            return res.status(404).json({ success: false, message: 'Firm not found.' });
        }

        console.log(`🗑️ Firm deleted: ${firmId}`);
        res.status(200).json({ success: true, message: 'Firm deleted successfully.' });
    } catch (err) {
        console.error('❌ Error deleting firm:', err);
        res.status(500).json({ success: false, message: 'Something went wrong.' });
    }
};

/**
 * POST /api/firms/assign
 * Assign a firm to an admin
 */
exports.assignFirmToAdmin = async (req, res) => {
  try {
    const { firmId, adminId } = req.body;

    if (!firmId || !adminId) {
      console.warn("⚠️ firmId or adminId missing in request body.");
      return res.status(400).json({ success: false, message: 'firmId and adminId are required.' });
    }

    // 1. Check if firm exists
    const firm = await Firm.findById(firmId);
    if (!firm) {
      console.warn(`⚠️ Firm not found: ${firmId}`);
      return res.status(404).json({ success: false, message: 'Firm not found.' });
    }

    // 2. Check if user exists and is an Admin
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'Admin') {
      console.warn(`⚠️ Invalid admin: ${adminId}`);
      return res.status(400).json({ success: false, message: 'User is not a valid Admin.' });
    }

    // 3. Add admin to firm's admins[] if not already there
    if (!firm.admins.includes(adminId)) {
      firm.admins.push(adminId);
      await firm.save();
      console.log(`✅ Admin ${adminId} added to Firm ${firmId}`);
    } else {
      console.log(`ℹ️ Admin ${adminId} already in Firm ${firmId}`);
    }

    // 4. Add firm to admin’s accessibleFirms[] if not already there
    if (!admin.accessibleFirms.includes(firmId)) {
      admin.accessibleFirms.push(firmId);
      await admin.save();
      console.log(`✅ Firm ${firmId} added to Admin ${adminId}'s accessibleFirms`);
    } else {
      console.log(`ℹ️ Firm ${firmId} already in Admin ${adminId}'s accessibleFirms`);
    }

    return res.status(200).json({ success: true, message: 'Firm assigned to admin successfully.', firm, admin });

  } catch (error) {
    console.error('❌ Error assigning firm to admin:', error.message);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
