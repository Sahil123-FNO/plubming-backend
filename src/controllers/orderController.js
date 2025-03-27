const Order = require('../models/order.model');
const mongoose = require('mongoose');

exports.getAllOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object based on query parameters
    const filter = {};
    if(req.user.role == "user"){ 
        filter.userId = req.user._id
    }
    if (req.query.status) filter.status = req.query.status;
    if (req.query.paymentStatus) filter['paymentDetails.status'] = req.query.paymentStatus;
    if (req.query.startDate && req.query.endDate) {
      filter.createdAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }
    if (req.query.search) {
      filter.$or = [
        { orderNumber: { $regex: req.query.search, $options: 'i' } },
        { 'items.name': { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    if (req.query.sortBy) {
      const parts = req.query.sortBy.split(':');
      sort[parts[0]] = parts[1] === 'desc' ? -1 : 1;
    } else {
      sort.createdAt = -1; // Default sort by creation date
    }

    const orders = await Order.find(filter)
      .populate('userId', 'name email phone')
      .populate('items.itemId')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const totalOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / limit);

    res.json({
      orders,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalOrders,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.log('error', error)
    res.status(500).json({ message: error.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('userId', 'name email phone')
      .populate('items.itemId')
      .populate('statusHistory.updatedBy', 'name')
      .populate('cancellation.cancelledBy', 'name');

    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { status, note } = req.body;
    const validStatuses = ['pending', 'confirmed', 'processing', 'completed', 'cancelled', 'returned'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const order = await Order.findById(req.params.id).session(session);
  
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Order not found' });
    }
    if(order.status == 'completed'){
      return res.status(400).json({ message: 'Order is completed' });
    }
    // Add status history
    order.statusHistory.push({
      status,
      note,
      updatedBy: req.user._id,
      timestamp: new Date()
    });

    // Update main status
    order.status = status;

    // Handle special status cases
    if (status === 'completed') {
      order.completedAt = new Date();
    }

    await order.save({ session });
    await session.commitTransaction();

    const updatedOrder = await Order.findById(order._id)
      .populate('userId', 'name email phone')
      .populate('items.itemId')
      .populate('statusHistory.updatedBy', 'name');

    res.json(updatedOrder);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

exports.cancelOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { reason, note, refundStatus } = req.body;
    
    const order = await Order.findById(req.params.id).session(session);
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if order can be cancelled
    if (['completed', 'cancelled', 'refunded'].includes(order.status)) {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: `Order cannot be cancelled when status is ${order.status}` 
      });
    }

    // Update order status and cancellation details
    order.status = 'cancelled';
    order.cancellation = {
      reason,
      note,
      cancelledAt: new Date(),
      cancelledBy: req.user._id,
      refundStatus: refundStatus || 'not_applicable'
    };

    // Add to status history
    order.statusHistory.push({
      status: 'cancelled',
      note: reason,
      updatedBy: req.user._id,
      timestamp: new Date()
    });

    await order.save({ session });
    await session.commitTransaction();

    const updatedOrder = await Order.findById(order._id)
      .populate('userId', 'name email phone')
      .populate('items.itemId')
      .populate('cancellation.cancelledBy', 'name');

    res.json(updatedOrder);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

exports.getOrderStats = async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(0);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    const stats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: today }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          }
        }
      }
    ]);

    const paymentStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$paymentDetails.method',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    res.json({
      statusWiseStats: stats,
      todayStats: todayStats[0] || {
        totalOrders: 0,
        totalAmount: 0,
        completedOrders: 0,
        cancelledOrders: 0
      },
      paymentStats
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 

exports.createOrder = async (req, res) => {
  try {
    const { items } = req.body;

    // Validate if items exist in request
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Items are required and must be an array'
      });
    }

    // Calculate subtotal and total amount
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = 0; // You can modify this based on your tax calculation logic
    const discount = 0; // You can modify this based on your discount logic
    const totalAmount = subtotal + tax - discount;

    // Generate unique order number (you can modify this logic as needed)
    const orderNumber = `ORD${Date.now()}`;

    const newOrder = new Order({
      orderNumber,
      userId: req.user._id, // Assuming req.user is set by your auth middleware
      items: items.map(item => ({
        ...item,
        subtotal: item.price * item.quantity
      })),
      status: 'pending',
      subtotal,
      tax,
      discount,
      totalAmount,
      paymentDetails: {
        method: req.body.paymentMethod || 'cash', // Default payment method
        status: 'pending'
      }
    });

    const savedOrder = await newOrder.save();

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: savedOrder
    });

  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating order',
      error: error.message
    });
  }
};
