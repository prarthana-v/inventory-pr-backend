const mongoose = require('mongoose');

const VendorSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },       // Vendor name
    contactInfo: {
        phone: { type: String },
        email: { type: String },
        address: { type: String }
    },  
    superAdmin: {               // the owning SuperAdmin (visibility scope)
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    },
    createdBy: {                // who actually created the vendor (Admin or SuperAdmin)
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },                                                       // Contact details
    // status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }, // Vendor status
    productList: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],  // Products supplied by this vendor
    // firm: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm' }              // For multi-firm setups (optional)
});

module.exports = mongoose.model('Vendor', VendorSchema);
