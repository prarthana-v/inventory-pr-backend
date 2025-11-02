    const mongoose = require('mongoose');

    const InventorySchema = new mongoose.Schema({
        products: [
            {
                product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
                quantity: { type: Number, required: true },
                price: { type: Number },
                availableStock: { type: Number },
                discount: { type: Number, default: 0 },
            }
        ],
        vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
        issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        firm: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm' },
        challanNo: { type: String, required: true },
        challanDate: { type: Date, required: true },
        notes: { type: String, default: '' },
        createdAt: { type: Date, default: Date.now }
    });

    module.exports = mongoose.model('Inventory', InventorySchema);
