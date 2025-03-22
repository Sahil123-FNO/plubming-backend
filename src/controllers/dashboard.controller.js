const Order = require('../models/order.model');
const productModel = require('../models/product.model');
const User = require('../models/user.model');

exports.getCounts = async (req, res) => {
  try {
    const counts = {
        users : await User.countDocuments(), 
        orders: await Order.countDocuments(), 
        products: await productModel.countDocuments(), 

    }
    res.json(counts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
