const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { body } = require('express-validator');
const paymentController = require('../controllers/payment.controller');
const validateRequest = require('../middleware/validateRequest');

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
];

// Routes
router.post(
    '/process',
    auth,
    processPaymentValidation,
    validateRequest,
    paymentController.processPayment
);

router.get(
    '/history',
    auth,
    paymentController.getPaymentHistory
);

router.get(
    '/:id',
    auth,
    paymentController.getPaymentDetails
);

router.post(
    '/verify',
    auth,
    paymentController.verifyPayment
);

module.exports = router; 