const Category = require('../model/category');

// CREATE
// in your categoryController.js
exports.createCategory = async (req, res) => {
    try {
        console.log('================ Starting createCategory for understand proccess');
        const { name, description, parent } = req.body;
        console.log(`================ Received data: { name: ${name}, description: ${description}, parent: ${parent} } for understand proccess`);

        // Find ANY category with this name, even if it's deleted
        const existingCategory = await Category.findOne({ name }); // <-- Find by name

        if (existingCategory) {

            // --- SCENARIO 1: Category exists and is ACTIVE ---
            if (existingCategory.isDeleted === false) {
                console.warn('================ Active category already exists for understand proccess');
                return res.status(400).json({ msg: 'Category already exists' });
            }

            // --- SCENARIO 2: Category exists but is SOFT-DELETED ---
            // Instead of creating a duplicate, we reactivate the old one.
            console.log('================ Reactivating existing deleted category for understand proccess');

            existingCategory.isDeleted = false;
            existingCategory.deletedAt = null;
            existingCategory.description = description; // Update with new data
            existingCategory.parent = parent || null;   // Update with new data

            await existingCategory.save();

            console.log('================ Category reactivated successfully for understand proccess');
            // Send 200 OK, since we performed an update, not a creation
            return res.status(200).json({ msg: 'Category reactivated', category: existingCategory });

        } else {
            // --- SCENARIO 3: No category with this name exists ---
            // Create it fresh.
            console.log('================ Creating new category for understand proccess');
            const newCategory = new Category({
                name,
                description,
                parent: parent || null
            });
            await newCategory.save();

            console.log('================ Category created successfully for understand proccess');
            // Send 201 Created
            return res.status(201).json({ msg: 'Category created', category: newCategory });
        }
    } catch (err) {
        console.error('================ Error in createCategory: ', err.message, ' for understand proccess');
        res.status(500).json({ msg: 'Server error', error: err.message });
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
        console.log('================ Starting getAllCategories for understand proccess');
        const categories = await Category.find({ isDeleted: false });

        console.log(`📦 ${categories.length} categories fetched for understand proccess`);
        return res.status(200).json({ categories });

    } catch (err) {
        console.error('❌ Error fetching categories: ', err.message, ' for understand proccess');
        return res.status(500).json({ msg: 'Server error', error: err.message });
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
