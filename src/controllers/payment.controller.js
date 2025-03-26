require('dotenv').config();
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('STRIPE_SECRET_KEY is not defined in environment variables');
  process.exit(1);
}

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/order.model');
const Payment = require('../models/payment.model');
const Booking = require('../models/booking.model');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const paymentController = {
  processPayment: async (req, res) => {
    try {
      const { bookingId, paymentMethodId, orderId } = req.body;

      // Get booking details
      if(bookingId){
        const booking = await Booking.findById(bookingId)
        .populate('service')
        .populate('user');

      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
      const paymentIntent = await stripe.paymentIntents.create({
        amount: booking.service.price * 100, // Stripe expects amount in cents
        currency: 'usd',
        customer: req.user.stripeCustomerId, // Assuming user has stripeCustomerId
        payment_method: paymentMethodId,
        confirmation_method: 'manual',
        confirm: true,
        description: `Payment for ${booking.service.name}`,
        metadata: {
          bookingId: booking._id.toString(),
          userId: req.user._id.toString()
        }
      });

      // Create payment record
      const payment = await Payment.create({
        booking: booking._id,
        user: req.user._id,
        amount: booking.service.price,
        stripePaymentId: paymentIntent.id,
        status: paymentIntent.status,
        paymentMethod: paymentMethodId
      });

      // Update booking payment status
      booking.paymentStatus = 'paid';
      await booking.save();

      }
      else { 
        const orders = await Order.findById(orderId)
        if(!orders){
          return res.status(404).json({ message: 'Order not found' });
        }
        const paymentIntent = await stripe.paymentIntents.create({
          amount: orders.totalAmount * 100, // Stripe expects amount in cents
          currency: 'inr',
          
          payment_method: paymentMethodId,
          confirmation_method: 'manual',
          confirm: true,
          description: `Payment for ${orders._id.toString()}`,
          metadata: {
            bookingId: orders._id.toString(),
            userId: req.user._id.toString()
          }
        });
  
        // Create payment record
        const payment = await Payment.create({
          order: orders._id,
          user: req.user._id,
          amount: orders.totalAmount,
          stripePaymentId: paymentIntent.id,
          status: paymentIntent.status,
          paymentMethod: paymentMethodId
        });
  
        // Update booking payment status
        orders.paymentStatus = 'paid';
        await orders.save();
  
      }
      
      res.json({
        success: true,
        payment,
        clientSecret: paymentIntent.client_secret
      });
    } catch (error) {
      console.error('Payment processing error:', error);
      res.status(500).json({
        message: 'Payment processing failed',
        error: error.message
      });
    }
  },

  getPaymentHistory: async (req, res) => {
    try {
      const payments = await Payment.find({ user: req.user._id })
        .populate({
          path: 'booking',
          populate: {
            path: 'service',
            select: 'name price'
          }
        })
        .sort({ createdAt: -1 });

      res.json(payments);
    } catch (error) {
      res.status(500).json({
        message: 'Error fetching payment history',
        error: error.message
      });
    }
  },

  getPaymentDetails: async (req, res) => {
    try {
      const payment = await Payment.findById(req.params.id)
        .populate({
          path: 'booking',
          populate: [
            {
              path: 'service',
              select: 'name price description'
            },
            {
              path: 'provider',
              select: 'name email'
            }
          ]
        })
        .populate('user', 'name email');

      if (!payment) {
        return res.status(404).json({ message: 'Payment not found' });
      }

      // Check if the payment belongs to the requesting user
      if (payment.user._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Unauthorized access to payment details' });
      }

      res.json(payment);
    } catch (error) {
      res.status(500).json({
        message: 'Error fetching payment details',
        error: error.message
      });
    }
  },

  verifyPayment: async (req, res) => {
    try {
      const { paymentIntentId } = req.body;

      // Retrieve payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      // Find the corresponding payment in our database
      const payment = await Payment.findOne({ stripePaymentId: paymentIntentId });

      if (!payment) {
        return res.status(404).json({ message: 'Payment not found' });
      }

      // Update payment status
      payment.status = paymentIntent.status;
      payment.verifiedAt = new Date();
      await payment.save();

      // If payment is successful, update related booking
      if (paymentIntent.status === 'succeeded') {
        await Booking.findByIdAndUpdate(payment.booking, {
          paymentStatus: 'paid',
          status: 'confirmed'
        });
      }

      res.json({
        success: true,
        status: paymentIntent.status,
        payment
      });
    } catch (error) {
      res.status(500).json({
        message: 'Payment verification failed',
        error: error.message
      });
    }
  },

  webhook: async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const orderId = paymentIntent.metadata.orderId;

      await Order.findByIdAndUpdate(orderId, {
        status: 'paid',
        paymentId: paymentIntent.id
      });
    }

    res.json({ received: true });
  },

  createPayment: async (req, res) => {
    try {
      const { orderId } = req.body;

      // Fetch order details from your database
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Create Razorpay order
      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(order.totalAmount * 100), // Convert to smallest currency unit (paise)
        currency: 'INR',
        receipt: order.orderNumber,
        notes: {
          orderId: order._id.toString(),
          userId: order.userId.toString()
        }
      });

      // Update order with Razorpay order ID
      order.paymentStatus = 'paid';
      order.paymentDetails.razorpayOrderId = razorpayOrder.id;
      await order.save();
      const payment = await Payment.create({
        order: order._id,
        user: req.user._id,
        amount: order.totalAmount,
        razorpayPaymentId: razorpayOrder.id,
        status: razorpayOrder.status,
        paymentMethod: paymentMethodId
      });

      
      res.status(200).json({
        success: true,
        data: {
          orderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          key: process.env.RAZORPAY_KEY_ID
        }
      });

    } catch (error) {
      console.error('Payment creation error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating payment',
        error: error.message
      });
    }
  },

  verifyPaymentSignature: async (req, res) => {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      } = req.body;

      // Verify signature
      const sign = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSign = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(sign)
        .digest('hex');

      if (razorpay_signature !== expectedSign) {
        return res.status(400).json({
          success: false,
          message: 'Invalid payment signature'
        });
      }

      // Find and update order
      const order = await Order.findOne({
        'paymentDetails.razorpayOrderId': razorpay_order_id
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Update order payment details
      order.paymentDetails.status = 'paid';
      order.paymentDetails.transactionId = razorpay_payment_id;
      order.paymentDetails.paidAt = new Date();
      order.status = 'confirmed';
      
      await order.save();

      res.status(200).json({
        success: true,
        message: 'Payment verified successfully'
      });

    } catch (error) {
      console.error('Payment verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Error verifying payment',
        error: error.message
      });
    }
  },

  handleWebhook: async (req, res) => {
    try {
      // Verify webhook signature
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
      const shasum = crypto.createHmac('sha256', webhookSecret);
      shasum.update(JSON.stringify(req.body));
      const digest = shasum.digest('hex');

      if (digest !== req.headers['x-razorpay-signature']) {
        return res.status(400).json({
          success: false,
          message: 'Invalid webhook signature'
        });
      }

      const event = req.body;

      // Handle different webhook events
      switch (event.event) {
        case 'payment.captured':
          await handlePaymentCaptured(event.payload.payment.entity);
          break;
        
        case 'payment.failed':
          await handlePaymentFailed(event.payload.payment.entity);
          break;
        
        case 'refund.processed':
          await handleRefundProcessed(event.payload.refund.entity);
          break;
      }

      res.json({ success: true });

    } catch (error) {
      console.error('Webhook handling error:', error);
      res.status(500).json({
        success: false,
        message: 'Error processing webhook',
        error: error.message
      });
    }
  }
};

module.exports = paymentController; 