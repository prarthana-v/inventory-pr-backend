const mongoose = require('mongoose');

const WorkerAssignmentSchema = new mongoose.Schema({
    // InventoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true }, // Reference to Inventory batch
    // productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    // quantity: { type: Number, required: true }, // Quantity assigned in this transaction
    // availableQty: { type: Number },
    // jobworker: { type: mongoose.Schema.Types.ObjectId, ref: 'JobWorker' },
    // status: { type: String, enum: ['Pending', 'InProgress', 'Cleared'], default: 'Pending' },
    // clearedQuantity: { type: Number, default: 0 },
    // assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },  // Who assigned
    // issueDetails: { type: String },
    // createdAt: { type: Date, default: Date.now },

    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    price: { type: Number },
    quantity: { type: Number, required: true },
    jobworker: { type: mongoose.Schema.Types.ObjectId, ref: 'JobWorker' },
    status: { type: String, enum: ['Pending', 'InProgress', 'Cleared'], default: 'Pending' },
    clearedQuantity: { type: Number, default: 0 },
    lostlQuantity: { type: Number, default: 0 }, // For items that were lost/not returned
    damagedQuantity: { type: Number, default: 0 },  // For damaged/second-quality items
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // issueDetails: { type: String },
    createdAt: { type: Date, default: Date.now },
    challanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Challan',
        required: true
    },
    // sourceBatches: [{
    //     inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory' },
    //     quantityTaken: { type: Number }
    // }],
});

module.exports = mongoose.model('WorkAssignment', WorkerAssignmentSchema);
