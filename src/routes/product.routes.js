const express = require('express');
const router = express.Router();

const { body } = require('express-validator');
const productController = require('../controllers/productController');



router.get(
    '/',
    productController.getAllProducts
);

router.get(
    '/:id',
    productController.getProductById
);


module.exports = router; 