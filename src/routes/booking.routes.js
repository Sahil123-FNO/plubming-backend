const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { body, param } = require('express-validator');
const bookingController = require('../controllers/booking.controller');
const validateRequest = require('../middleware/validateRequest');

// Create Booking Validation
const createBookingValidation = [
    body('serviceId')
        .notEmpty()
        .withMessage('Service ID is required'),
    body('date')
        .notEmpty()
        .withMessage('Booking date is required')
        .isISO8601()
        .withMessage('Invalid date format'),
    body('time')
        .notEmpty()
        .withMessage('Booking time is required'),
    body('duration')
        .notEmpty()
        .withMessage('Duration is required')
        .isNumeric()
        .withMessage('Duration must be a number'),
];

// Update Booking Validation
const updateBookingValidation = [
    param('id')
        .notEmpty()
        .withMessage('Booking ID is required'),
    body('date')
        .optional()
        .isISO8601()
        .withMessage('Invalid date format'),
    body('time')
        .optional(),
    body('duration')
        .optional()
        .isNumeric()
        .withMessage('Duration must be a number'),
];

// Routes
router.post(
    '/',
    auth,
    createBookingValidation,
    validateRequest,
    bookingController.createBooking
);

router.get(
    '/',
    auth,
    bookingController.getAllBookings
);

router.get(
    '/:id',
    auth,
    bookingController.getBookingById
);

router.delete(
    '/:id',
    auth,
    bookingController.cancelBooking
);

module.exports = router; 