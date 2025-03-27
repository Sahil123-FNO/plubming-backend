const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',

  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  razorpayPaymentId: {
    type: String,
    
  },
  stripePaymentId: {
    type: String,
    
  },

  status: {
    type: String,
    default: 'pending'
  },
  paymentMethod: {
    type: String,

  },
  verifiedAt: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Payment', paymentSchema); 