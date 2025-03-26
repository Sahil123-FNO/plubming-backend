const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
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
    enum: ['pending', 'succeeded', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    required: true
  },
  verifiedAt: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Payment', paymentSchema); 