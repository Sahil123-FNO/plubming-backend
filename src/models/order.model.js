const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    type: {
      type: String,
      enum: ['Product', 'service'],
      required: true
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'items.type',
      required: true
    },
    name: String,
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true
    },
    subtotal: {
      type: Number,
      required: true
    }
  }],
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'completed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  subtotal: {
    type: Number,
    required: true
  },
  tax: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  paymentDetails: {
    method: {
      type: String,
      enum: ['cash', 'card', 'upi', 'wallet'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending'
    },
    transactionId: String,
    paidAt: Date
  },
  statusHistory: [{
    status: String,
    note: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  cancellation: {
    reason: String,
    note: String,
    cancelledAt: Date,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    refundStatus: {
      type: String,
      enum: ['not_applicable', 'pending', 'processed', 'failed'],
      default: 'not_applicable'
    }
  },
  customerNotes: String,
  adminNotes: String,
  scheduledDate: Date,
  completedAt: Date
}, {
  timestamps: true
});

// Generate unique order number before saving
orderSchema.pre('save', async function(next) {
  if (this.isNew) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const count = await mongoose.model('Order').countDocuments() + 1;
    this.orderNumber = `ORD${year}${month}${count.toString().padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);