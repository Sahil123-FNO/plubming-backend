const express = require('express');
const router = express.Router();
const  auth  = require('../middlewares/auth.middleware');
const { body, param } = require('express-validator');
const userController = require('../controllers/userController');
const validateRequest = require('../middlewares/validate-request.middleware');

// Change Password Validation
const changePasswordValidation = [
    body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
    body('newPassword')
        .notEmpty()
        .withMessage('New password is required')
        .isLength({ min: 6 })
        .withMessage('New password must be at least 6 characters long'),
];

// Update Profile Validation
const updateProfileValidation = [
    body('name')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Name cannot be empty'),
    body('email')
        .optional()
        .isEmail()
        .withMessage('Please provide a valid email'),
    body('phone')
        .optional()
        .matches(/^[0-9]+$/)
        .withMessage('Phone number must contain only digits')
        .isLength({ min: 10, max: 15 })
        .withMessage('Phone number must be between 10 and 15 digits'),
];

// Routes with validation
router.put(
    '/change-password',
    auth,
    changePasswordValidation,
    validateRequest,
    userController.changePassword
);

router.put(
    '/update-profile',
    auth,
    updateProfileValidation,
    validateRequest,
    userController.updateProfile
);

module.exports = router; 