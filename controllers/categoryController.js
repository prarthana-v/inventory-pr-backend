const Category = require('../model/category');
const User = require('../model/auth');

exports.createCategory = async (req, res) => {
    try {
        console.log("===== Starting createCategory =====");
        const { name, description, parent, userId } = req.body;
        console.log("Incoming:", req.body);

        if (!userId) {
            return res.status(400).json({ msg: "userId is required" });
        }

        // Fetch creator
        const creator = await User.findById(userId);
        if (!creator) {
            return res.status(400).json({ msg: "Invalid userId" });
        }

        // Determine superAdmin
        let superAdminId;
        if (creator.role === "SuperAdmin") {
            superAdminId = creator._id;
        } else if (creator.role === "Admin") {
            if (!creator.managingSuperAdmin) {
                return res.status(400).json({ msg: "Admin does not belong to a SuperAdmin" });
            }
            superAdminId = creator.managingSuperAdmin;
        } else {
            return res.status(403).json({ msg: "Only SuperAdmin/Admin can create categories" });
        }

        console.log("Final superAdminId:", superAdminId.toString());

        // Check existing category under the same superAdmin
        const existing = await Category.findOne({
            name,
            superAdmin: superAdminId
        });

        if (existing) {
            if (!existing.isDeleted) {
                return res.status(400).json({ msg: "Category already exists for this SuperAdmin" });
            }

            // Reactivate soft-deleted category
            existing.isDeleted = false;
            existing.deletedAt = null;
            existing.description = description || existing.description;
            existing.parent = parent || null;

            await existing.save();

            return res.status(200).json({
                msg: "Category reactivated",
                category: existing
            });
        }

        // Create new category
        const category = await Category.create({
            superAdmin: superAdminId,
            createdBy: creator._id,
            name,
            description,
            parent: parent || null
        });

        return res.status(201).json({
            msg: "Category created successfully",
            category
        });

    } catch (err) {
        console.error("❌ createCategory Error:", err.message);
        res.status(500).json({
            msg: "Server error",
            error: err.message
        });
    }
};

// UPDATE
exports.updateCategory = async (req, res) => {
    try {
        console.log('================ Starting updateCategory for understand proccess');
        const { categoryId, name, description, parent } = req.body;
        console.log(`================ Received data: { categoryId: ${categoryId}, name: ${name}, description: ${description}, parent: ${parent} } for understand proccess`);

        if (!categoryId) {
            console.warn("⚠️ categoryId missing in body for understand proccess");
            return res.status(400).json({ msg: 'categoryId is required.' });
        }

        // Dynamically build update object — only if field is defined
        const updates = {};
        if (typeof name !== 'undefined') updates.name = name;
        if (typeof description !== 'undefined') updates.description = description;
        if (typeof parent !== 'undefined') updates.parent = parent; // leave nulling decision to frontend

        if (Object.keys(updates).length === 0) {
            console.warn('⚠️ No fields provided to update for understand proccess');
            return res.status(400).json({ msg: 'No fields provided to update.' });
        }

        const updated = await Category.findByIdAndUpdate(
            categoryId,
            updates,
            { new: true, runValidators: true }
        );

        if (!updated) {
            console.warn(`⚠️ Category not found: ${categoryId} for understand proccess`);
            return res.status(404).json({ msg: 'Category not found.' });
        }

        console.log(`✅ Category updated: ${categoryId} for understand proccess`);
        return res.status(200).json({
            msg: 'Category updated successfully.',
            category: updated
        });

    } catch (err) {
        console.error('❌ Error updating category: ', err.message, ' for understand proccess');
        return res.status(500).json({ msg: 'Server error', error: err.message });
    }
};

// DELETE
exports.deleteCategory = async (req, res) => {
    try {
        console.log('================ Starting deleteCategory for understand proccess');
        const { categoryId } = req.body;
        console.log(`================ Received data: { categoryId: ${categoryId} } for understand proccess`);

        if (!categoryId) {
            console.warn("⚠️ categoryId missing in request body for understand proccess");
            return res.status(400).json({ msg: 'categoryId is required.' });
        }

        const category = await Category.findOneAndUpdate(
            { _id: categoryId, isDeleted: false },
            {
                $set: {
                    isDeleted: true,
                    deletedAt: new Date()
                }
            },
            { new: true }
        );



        if (!category) {
            console.warn(`⚠️ Category not found or already deleted: ${categoryId}`);
            return res.status(404).json({ msg: 'Category not found or already deleted.' });
        }

        console.log(`🗑️ Category deleted: ${categoryId} for understand proccess`);
        return res.status(200).json({
            msg: 'Category soft deleted successfully.',
            category
        });

    } catch (err) {
        console.error('❌ Error deleting category: ', err.message, ' for understand proccess');
        return res.status(500).json({ msg: 'Server error', error: err.message });
    }
};

// LIST ALL
exports.getAllCategories = async (req, res) => {
    try {
        console.log("===== Starting getAllCategories =====");
        const { userId } = req.body;
        console.log(req.body,"userId");

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "userId is required"
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(400).json({ msg: "Invalid userId" });
        }

        // Determine superAdmin
        let superAdminId;

        if (user.role === "SuperAdmin") {
            superAdminId = user._id;
        } else if (user.role === "Admin") {
            superAdminId = user.managingSuperAdmin;
        } else {
            return res.status(403).json({ msg: "Unauthorized role" });
        }

        console.log("📥 Fetching categories for:", superAdminId.toString());

        const categories = await Category.find({
            superAdmin: superAdminId,
            isDeleted: false
        });

        console.log(`📦 Found ${categories.length} categories`);

        return res.status(200).json({
            success: true,
            count: categories.length,
            categories
        });

    } catch (err) {
        console.error("❌ getAllCategories Error:", err.message);
        res.status(500).json({
            msg: "Server error",
            error: err.message
        });
    }
};

// GET ONE + linked products (optional)
exports.getCategoryById = async (req, res) => {
    try {
        console.log('================ Starting getCategoryById for understand proccess');
        const { categoryId } = req.body;
        console.log(`================ Received data: { categoryId: ${categoryId} } for understand proccess`);

        if (!categoryId) {
            console.warn("⚠️ categoryId missing in request body for understand proccess");
            return res.status(400).json({ msg: 'categoryId is required.' });
        }

        const category = await Category.findById(categoryId).populate('parent');

        if (!category) {
            console.warn(`⚠️ Category not found: ${categoryId} for understand proccess`);
            return res.status(404).json({ msg: 'Category not found.' });
        }

        console.log(`📂 Category fetched: ${categoryId} for understand proccess`);
        return res.status(200).json({ category });

    } catch (err) {
        console.error('❌ Error fetching category: ', err.message, ' for understand proccess');
        return res.status(500).json({ msg: 'Server error', error: err.message });
    }
};
