const mongoose = require('mongoose');
const SaleOrderSchema = new mongoose.Schema({
    products: [
        {
            product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
            quantity: { type: Number, required: true },
            price: { type: Number, required: true },
            discount: { type: Number, }
        }
    ],
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }, // or customer if needed
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    firm: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm' },
    invoiceNo: { type: String, required: true },
    invoiceDate: { type: Date, required: true },
    notes: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("SaleOrder", SaleOrderSchema)