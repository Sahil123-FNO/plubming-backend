const express = require('express');
const router = express.Router();
const { auth, isAdmin } = require('../middlewares/auth.middleware');
const { body } = require('express-validator');
const serviceController = require('../controllers/serviceController');
const validateRequest = require('../middlewares/validate-request.middleware');

// Create/Update Service Validation
const serviceValidation = [
    body('name')
        .notEmpty()
        .withMessage('Service name is required')
        .trim(),
    body('description')
        .notEmpty()
        .withMessage('Description is required'),
    body('price')
        .notEmpty()
        .withMessage('Price is required')
        .isNumeric()
        .withMessage('Price must be a number'),
    body('duration')
        .notEmpty()
        .withMessage('Duration is required')
        .isNumeric()
        .withMessage('Duration must be a number'),
    body('category')
        .notEmpty()
        .withMessage('Category is required'),
    body('image')
        .optional()
        .isURL()
        .withMessage('Image must be a valid URL'),
    body('availability')
        .optional()
        .isBoolean()
        .withMessage('Availability must be a boolean'),
];

// Routes
router.post(
    '/',
    [auth, isAdmin],
    serviceValidation,
    validateRequest,
    serviceController.createService
);

router.get(
    '/',
    serviceController.getAllServices
);

router.get(
    '/:id',
    serviceController.getServiceById
);

router.put(
    '/:id',
    [auth, isAdmin],
    serviceValidation,
    validateRequest,
    serviceController.updateService
);

router.delete(
    '/:id',
    [auth, isAdmin],
    serviceController.deleteService
);

// // Optional: Get services by category
// router.get(
//     '/category/:category',
//     serviceController.getServicesByCategory
// );

module.exports = router; 