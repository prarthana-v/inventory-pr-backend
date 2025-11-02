const mongoose = require('mongoose');

const WorkerAssignmentSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    price: { type: Number },
    quantity: { type: Number, required: true },
    jobworker: { type: mongoose.Schema.Types.ObjectId, ref: 'JobWorker' },
    status: { type: String, enum: ['Pending', 'InProgress', 'Cleared'], default: 'Pending' },
    clearedQuantity: { type: Number, default: 0 },
    lostlQuantity: { type: Number, default: 0 }, // For items that were lost/not returned
    damagedQuantity: { type: Number, default: 0 },  // For damaged/second-quality items
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    challanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Challan',
        required: true
    },

    // --- 👇 ADD THESE NEW FIELDS ---
    pendingClearedQuantity: { type: Number, default: 0 },
    pendingLostlQuantity: { type: Number, default: 0 },
    pendingDamagedQuantity: { type: Number, default: 0 },

    // This field links to the request that is "in-progress"
    // If this is null, they can submit a new request.
    // If it's not null, they must wait.
    activeReturnRequestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ReturnRequest',
        default: null
    }
    // --- END OF NEW FIELDS ---
});

module.exports = mongoose.model('WorkAssignment', WorkerAssignmentSchema);
