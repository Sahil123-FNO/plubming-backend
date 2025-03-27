const express = require('express');
const router = express.Router();
const auth  = require('../middlewares/auth.middleware');
const { body } = require('express-validator');

const validateRequest = require('../middlewares/validate-request.middleware');
const { createPayment, verifyPayment, handleWebhook, processPayment, getPaymentHistory, getPaymentDetails,  } = require('../controllers/payment.controller');

// Process Payment Validation
const processPaymentValidation = [
    body('amount')
        .notEmpty()
        .withMessage('Amount is required')
        .isNumeric()
        .withMessage('Amount must be a number'),
    body('currency')
        .notEmpty()
        .withMessage('Currency is required'),
    body('paymentMethod')
        .notEmpty()
        .withMessage('Payment method is required'),
    body('orderId')
        .notEmpty()
        .withMessage('Order ID is required'),
    body('bookingId')
        .optional()
    
];

// Routes
router.post(
    '/process',
    auth,
    processPaymentValidation,
    validateRequest,
    processPayment
);

router.get(
    '/history',
    auth,
    getPaymentHistory
);

router.get(
    '/:id',
    auth,
    getPaymentDetails
);

router.post(
    '/complete',
    auth,
    verifyPayment
);

// Create payment route (requires authentication)
router.post('/create', auth, createPayment);

// Webhook route (no authentication required as it's called by Razorpay)
router.post('/webhook', handleWebhook);

module.exports = router; 