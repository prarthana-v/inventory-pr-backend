const mongoose = require('mongoose');

const WorkerAssignmentSchema = new mongoose.Schema({
    InventoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true }, // Reference to Inventory batch
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true }, // Quantity assigned in this transaction
    jobworker: { type: mongoose.Schema.Types.ObjectId, ref: 'JobWorker' },
    status: { type: String, enum: ['Pending', 'InProgress', 'Cleared'], default: 'Pending' },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },  // Who assigned
    issueDetails: { type: String },
    createdAt: { type: Date, default: Date.now }
});


module.exports = mongoose.model('WorkAssignment', WorkerAssignmentSchema);
