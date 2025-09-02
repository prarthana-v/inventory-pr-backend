const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['Admin', 'Employee', 'SuperAdmin'], // Defines the possible roles
        required: true,
    },
    // Stores the firm the user is currently operating under
    activeFirm: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
    },
    // For Admin to manage multiple firms
    accessibleFirms: [{
        type: Schema.Types.ObjectId,
        ref: 'Firm',
    }],
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);