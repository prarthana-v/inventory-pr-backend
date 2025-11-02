// models/ReturnRequest.js

const mongoose = require('mongoose');

const returnRequestSchema = new mongoose.Schema({
    // Link to the main assignment this request is for
    assignmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WorkAssignment',
        required: true
    },

    // The quantities being proposed in THIS request
    cleared: { type: Number, default: 0 },
    shortage: { type: Number, default: 0 },
    seconds: { type: Number, default: 0 }, // 'seconds' from your original code

    // The approval status
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },

    // Who submitted this request? (e.g., The Jobworker or Admin)
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JobWorker',
        required: true
    },

    // Who approved/rejected it? (The Super-admin)
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    rejectionReason: { type: String },

}, { timestamps: true }); // Adds createdAt and updatedAt

module.exports = mongoose.model('ReturnRequest', returnRequestSchema);