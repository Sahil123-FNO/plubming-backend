const { body, check, validationResult } = require('express-validator');
const mongoose = require('mongoose');

const validateOrder = [
  // Validate items array
  body('items')
    .isArray()
    .withMessage('Items must be an array')
    .notEmpty()
    .withMessage('Items array cannot be empty'),

  // Validate each item in the items array
  body('items.*.type')
    .isIn(['product', 'service'])
    .withMessage('Item type must be either "product" or "service"'),

  body('items.*.itemId')
    .notEmpty()
    .withMessage('Item ID is required')
    .custom(value => {
      return mongoose.Types.ObjectId.isValid(value);
    })
    .withMessage('Invalid item ID format'),

  body('items.*.name')
    .notEmpty()
    .withMessage('Item name is required')
    .isString()
    .withMessage('Item name must be a string'),

  body('items.*.quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),

  body('items.*.price')
    .notEmpty()
    .withMessage('Price is required')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),

  // Validate payment method if provided
  body('paymentMethod')
    .optional()
    .isIn(['cash', 'card', 'upi', 'wallet'])
    .withMessage('Invalid payment method. Must be one of: cash, card, upi, wallet'),

  // Custom validation middleware to handle validation results
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map(error => ({
          field: error.path,
          message: error.msg
        }))
      });
    }
    next();
  }
];

module.exports = {
  validateOrder
}; 