const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const firmSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    address: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
    },
    superAdmin: {
        type: Schema.Types.ObjectId,
        ref: 'User', // Should be a SuperAdmin User ID
        required: true,
    },
    admins: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }]
}, { timestamps: true });

module.exports = mongoose.model('Firm', firmSchema);