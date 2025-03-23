const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const validateRequest = require('../middlewares/validate-request.middleware');

const router = express.Router();

router.post('/signup',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').trim().notEmpty(),
    validateRequest
  ],
  authController.signup
);

router.post('/forgotPassword',
  [
    body('email').isEmail().normalizeEmail(),
  
    validateRequest
  ],
  authController.forgotPassword
);
router.get('/verify/:token', authController.verifyEmail);
router.post('/resentVerifyLink', 
  [
    body('email').isEmail().normalizeEmail(),
    validateRequest
  ],
  authController.resendSendOtp);

router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
    validateRequest
  ],
  authController.login
);

module.exports = router; 