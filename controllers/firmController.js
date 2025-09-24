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

// exports.getAllFirms = async (req, res) => {
//     try {
//         const { userId, role } = req.body;
//         console.log("📥 Incoming request:", { userId, role });

//         let firms = [];

//         if (role === "SuperAdmin") {
//             console.log("👑 Role is SuperAdmin → fetching all firms with admins...");

//             firms = await Firm.find()
//                 .populate({
//                     path: "admins",
//                     match: { role: "Admin" }, // only bring admin role users
//                     select: "name email role"
//                 })
//                 .lean();

//             // filter out firms with no admins after population
//             firms = firms.filter(firm => firm.admins.length > 0);

//             console.log(`✅ SuperAdmin fetched ${firms.length} firms.`);
//             console.log("📊 Firms data:", JSON.stringify(firms, null, 2));
//         } else {
//             console.log(`👤 Role is ${role} → fetching firms where user ${userId} is an admin...`);

//             firms = await Firm.find({ admins: userId })
//                 .populate("admins", "name email role")
//                 .lean();

//             console.log(`✅ User ${userId} fetched ${firms.length} firms.`);
//             console.log("📊 Firms data:", JSON.stringify(firms, null, 2));
//         }

//         res.status(200).json({ success: true, firms });
//     } catch (error) {
//         console.error("❌ Error while fetching firms:", error.message);
//         res.status(500).json({ success: false, message: "Server Error", error: error.message });
//     }

// };

exports.getAllFirms = async (req, res) => {
    try {
        const { userId, role } = req.body;
        console.log("📥 Incoming request:", { userId, role });

        let firms = [];

        if (role === "SuperAdmin") {
            console.log("👑 Role is SuperAdmin → fetching ALL firms (with or without admins)...");

            firms = await Firm.find()
                .populate({
                    path: "admins",
                    match: { role: "Admin" }, // still only populate Admin users
                    select: "name email role"
                })
                .lean();

            console.log(`✅ SuperAdmin fetched ${firms.length} firms.`);
        } else if (role === "Admin") {
            console.log(`👤 Role is Admin → fetching firms assigned to user ${userId}...`);

            firms = await Firm.find({ admins: userId })
                .populate("admins", "name email role")
                .lean();

            console.log(`✅ Admin ${userId} fetched ${firms.length} firms.`);
        } else {
            console.warn(`⚠️ Role ${role} not authorized to fetch firms.`);
            return res.status(403).json({ success: false, message: "Unauthorized role" });
        }

        res.status(200).json({ success: true, firms });
    } catch (error) {
        console.error("❌ Error while fetching firms:", error.message);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
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
exports.assignFirmsToAdmin = async (req, res) => {
    try {
        console.log("assign firms", req.body);
        const { firmIds, adminId } = req.body;

        // 1. Validate the input
        if (!adminId || !firmIds || !Array.isArray(firmIds) || firmIds.length === 0) {
            return res.status(400).json({ success: false, message: 'adminId and a non-empty array of firmIds are required.' });
        }

        // 2. Find the admin and verify their role
        const admin = await User.findById(adminId);
        if (!admin || admin.role !== 'Admin') {
            return res.status(400).json({ success: false, message: 'User is not a valid Admin.' });
        }

        // 3. Add the admin's ID to the 'admins' array for all specified firms
        const firmUpdateResult = await Firm.updateMany(
            { _id: { $in: firmIds } }, // Find all firms whose ID is in the firmIds array
            { $addToSet: { admins: adminId } } // Add the adminId to the 'admins' array if it's not already there
        );

        // Optional: Check if all firms were found and updated
        if (firmUpdateResult.matchedCount !== firmIds.length) {
            console.warn(`⚠️ Warning: Not all firms were found. Found ${firmUpdateResult.matchedCount} out of ${firmIds.length}.`);
        }

        // 4. Add all the firm IDs to the admin's 'accessibleFirms' array
        await User.findByIdAndUpdate(
            adminId,
            { $addToSet: { accessibleFirms: { $each: firmIds } } } // Add each firmId to the 'accessibleFirms' array if not already present
        );

        console.log(`✅ Successfully assigned ${firmUpdateResult.modifiedCount} new firms to admin ${adminId}`);

        return res.status(200).json({
            success: true,
            message: 'Firms assigned to admin successfully.',
        });

    } catch (error) {
        console.error('❌ Error assigning firms to admin:', error.message);
        return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};