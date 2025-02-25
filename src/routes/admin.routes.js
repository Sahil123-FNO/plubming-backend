const express = require('express');
const router = express.Router();
const upload = require('../config/multerConfig');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// Import controllers
const userController = require('../controllers/userController');
const productController = require('../controllers/productController');
const serviceController = require('../controllers/serviceController');
const orderController = require('../controllers/orderController');

// User Management Routes
router.get('/users', auth, admin, userController.getAllUsers);
router.put('/users/:id', auth, admin, userController.updateUser);
router.delete('/users/:id', auth, admin, userController.deleteUser);
router.patch('/users/:id/toggle-status', auth, admin, userController.toggleUserStatus);

// Product Management Routes
router.post('/products', auth, admin, upload.single('image'), productController.createProduct);
router.get('/products', auth, admin, productController.getAllProducts);
router.get('/products/:id', auth, admin, productController.getProductById);
router.put('/products/:id', auth, admin, upload.single('image'), productController.updateProduct);
router.delete('/products/:id', auth, admin, productController.deleteProduct);
router.patch('/products/:id/toggle-status', auth, admin, productController.toggleProductStatus);

// Service Management Routes
router.post('/services', auth, admin, upload.single('image'), serviceController.createService);
router.get('/services', auth, admin, serviceController.getAllServices);
router.get('/services/:id', auth, admin, serviceController.getServiceById);
router.put('/services/:id', auth, admin, upload.single('image'), serviceController.updateService);
router.delete('/services/:id', auth, admin, serviceController.deleteService);
router.patch('/services/:id/toggle-status', auth, admin, serviceController.toggleServiceStatus);

// Order Management Routes
router.get('/orders', auth, admin, orderController.getAllOrders);
router.get('/orders/:id', auth, admin, orderController.getOrderById);
router.patch('/orders/:id/status', auth, admin, orderController.updateOrderStatus);
router.post('/orders/:id/cancel', auth, admin, orderController.cancelOrder);
router.get('/orders-stats', auth, admin, orderController.getOrderStats);

module.exports = router; 