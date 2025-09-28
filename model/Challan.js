// models/Challan.js
const mongoose = require('mongoose');

const ChallanSchema = new mongoose.Schema({
    challanNo: {
        type: String,
        required: true,
        unique: true
    },
    challanDate: {
        type: Date,
        default: Date.now,
        required: true
    },
    jobworker: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JobWorker',
        required: true
    },
    // This will be an array of all work assignments included in this one challan
    assignments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WorkAssignment'
    }],
    dispatchedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    notes: {
        type: String
    }
}, { timestamps: true });

module.exports = mongoose.model('Challan', ChallanSchema);