const Firm = require('../model/firm');
const User = require('../model/auth');
// Create a new firm
/**
 * POST /api/firms
 * Create a new firm
 */
exports.createFirm = async (req, res) => {
    try {
        const { name, address, contact, superadminId } = req.body;

        // Validate required fields
        if (!name || !address || !contact || !superadminId) {
            console.warn("⚠️ Missing required fields for firm creation.");
            return res.status(400).json({
                success: false,
                message: 'Name, address, contact & superadminId are required.'
            });
        }

        // Validate SuperAdmin
        const superAdmin = await User.findById(superadminId);
        if (!superAdmin || superAdmin.role !== "SuperAdmin") {
            console.warn(`⚠️ Invalid SuperAdmin ID: ${superadminId}`);
            return res.status(400).json({
                success: false,
                message: 'Invalid SuperAdmin. Only SuperAdmin can create firms.'
            });
        }

        // Check if firm already exists
        const existingFirm = await Firm.findOne({ name, superAdmin: superadminId });
        if (existingFirm) {
            console.warn(`⚠️ Firm already exists: ${name}`);
            return res.status(409).json({
                success: false,
                message: 'Firm with this name already exists under this SuperAdmin.'
            });
        }

        // Create Firm
        const newFirm = await Firm.create({
            name,
            address,
            contact,
            superAdmin: superadminId,
            admins: []   // default empty
        });

        console.log(`✅ Firm created: ${newFirm._id} (${name})`);
        res.status(201).json({
            success: true,
            message: 'Firm created successfully.',
            firm: newFirm
        });

    } catch (error) {
        console.error("❌ Error creating firm:", error.message);
        res.status(500).json({
            success: false,
            message: 'Server error.',
            error: error.message
        });
    }
};

exports.getAllFirms = async (req, res) => {
    try {
        const { userId, role } = req.body;
        console.log("📥 Incoming request:", { userId, role });

        let firms = [];

        // 🟢 SUPERADMIN → Fetch ONLY its firms
        if (role === "SuperAdmin") {
            console.log(`👑 SuperAdmin ${userId} → fetching firms owned by this SuperAdmin...`);

            firms = await Firm.find({ superAdmin: userId })
                .populate({
                    path: "admins",
                    match: { role: "Admin" },
                    select: "name email role"
                })
                .lean();

            console.log(`✅ SuperAdmin ${userId} fetched ${firms.length} firm(s).`);
        }

        // 🟡 ADMIN → fetch firms where admin is assigned
        else if (role === "Admin") {
            console.log(`👤 Admin ${userId} → fetching assigned firms...`);

            firms = await Firm.find({ admins: userId })
                .populate("admins", "name email role")
                .lean();

            console.log(`✅ Admin ${userId} fetched ${firms.length} firm(s).`);
        }

        // ❌ Other roles not allowed
        else {
            console.warn(`⚠️ Unauthorized role: ${role}`);
            return res.status(403).json({
                success: false,
                message: "Unauthorized role"
            });
        }

        res.status(200).json({
            success: true,
            firms
        });

    } catch (error) {
        console.error("❌ Error while fetching firms:", error.message);
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message
        });
    }
};


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

exports.deleteFirm = async (req, res) => {
    console.log("🗑️ Deleting firm with ID:", req.body);
    const { firmId } = req.body;

    if (!firmId) {
        return res.status(400).json({ success: false, message: 'Firm ID is required.' });
    }

    try {
        // 1️⃣ Check if firm exists
        const firm = await Firm.findById(firmId).populate("admins", "name email");
        if (!firm) {
            console.warn(`⚠️ Firm not found for delete: ${firmId}`);
            return res.status(404).json({ success: false, message: 'Firm not found.' });
        }

        // 2️⃣ Check if firm is assigned to any user (admins array not empty)
        if (firm.admins && firm.admins.length > 0) {
            console.warn(`🚫 Firm ${firmId} cannot be deleted — assigned to users:`, firm.admins.map(a => a._id));
            return res.status(400).json({
                success: false,
                message: 'This firm is assigned to one or more users and cannot be deleted.',
                assignedUsers: firm.admins.map(a => ({ id: a._id, name: a.name, email: a.email }))
            });
        }

        // 3️⃣ Proceed with deletion if not assigned to anyone
        await Firm.findByIdAndDelete(firmId);

        console.log(`✅ Firm deleted successfully: ${firmId}`);
        res.status(200).json({ success: true, message: 'Firm deleted successfully.' });

    } catch (err) {
        console.error('❌ Error deleting firm:', err);
        res.status(500).json({ success: false, message: 'Something went wrong.' });
    }
};

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