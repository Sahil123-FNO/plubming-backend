const express = require('express');
const router = express.Router();
const { createOrder } = require('../controllers/orderController');
const { validateOrder } = require('../middleware/orderValidation');
const auth  = require('../middlewares/auth.middleware');
// Apply both authentication and validation middleware before the controller
router.post('/', auth, validateOrder, createOrder);

module.exports = router; 