const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || "ajkdadjkajdkajsdkasdjkadjkad");
const Order = require('../models/order.model');
const Payment = require('../models/payment.model');
const Booking = require('../models/booking.model');

const paymentController = {
  processPayment: async (req, res) => {
    try {
      const { bookingId, paymentMethodId } = req.body;

      // Get booking details
      const booking = await Booking.findById(bookingId)
        .populate('service')
        .populate('user');

      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      // Create payment intent
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
  }
};

module.exports = paymentController; 