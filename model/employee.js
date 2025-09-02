const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const employeeSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
    
  phone: {
    type: String,
    trim: true
  },
  
  role: {
    type: String,
    enum: ['Employee'], // default for now, extend if needed
    default: 'Employee'
  },

  firm: {
    type: Schema.Types.ObjectId,
    ref: 'Firm',
    required: true
  },

  assignedStock: [{
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, default: 0 }
  }]

}, { timestamps: true });

module.exports = mongoose.model('Employee', employeeSchema);
