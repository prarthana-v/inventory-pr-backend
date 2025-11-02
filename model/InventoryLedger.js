const mongoose = require('mongoose');

const inventoryLedgerSchema = new mongoose.Schema({
    // The simple string message, e.g., "10 units of Product X assigned"
    log: {
        type: String,
        required: true
    },

    // Who did this?
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // We still need this to filter the history for one product
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    },

    // Optional: for clicking and navigating
    relatedChallanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Challan' },
    relatedAssignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkAssignment' }

}, { timestamps: true }); // This adds the 'time and date' you wanted

module.exports = mongoose.model('InventoryLedger', inventoryLedgerSchema);