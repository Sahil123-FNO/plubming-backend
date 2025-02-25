const Booking = require('../models/booking.model');
const Order = require('../models/order.model');

const bookingController = {
  createBooking : async (req, res) => {
    try {
      const booking = new Booking({
        ...req.body,
        user: req.user._id
      });
      await booking.save();
      res.status(201).json(booking);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  getAllOrders :async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
  
      // Build filter object based on query parameters
      const filter = {};
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
      res.status(500).json({ message: error.message });
    }
  },

  getAllBookings: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
  
      // Build filter object based on query parameters
      const filter = {};
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
  
      const orders = await Booking.find(filter)
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
      res.status(500).json({ message: error.message });
    }
  },

  update: async (req, res) => {
    try {
      const booking = await Booking.findOneAndUpdate(
        { _id: req.params.id, user: req.user._id },
        req.body,
        { new: true }
      );
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
      res.json(booking);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  getBookingById: async (req, res) => {
    try {
      const booking = await Booking.findById(req.params.id)
        .populate('user', 'name email phone profilePicture')
        .populate('provider', 'name email phone profilePicture businessDetails')
        .populate('service', 'name description price duration category images')
        .lean();

      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      res.json(booking);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  cancelBooking: async (req, res) => {
    try {
      const { cancellationReason } = req.body;
      
      const booking = await Booking.findById(req.params.id);
      
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      // Check if booking belongs to the user or provider
      if (booking.user.toString() !== req.user._id.toString() && 
          booking.provider.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to cancel this booking' });
      }

      // Check if booking can be cancelled
      if (booking.status === 'completed' || booking.status === 'cancelled') {
        return res.status(400).json({ 
          message: `Booking cannot be cancelled as it is already ${booking.status}` 
        });
      }

      // Update booking status and add cancellation reason
      booking.status = 'cancelled';
      booking.cancellationReason = cancellationReason;
      booking.cancelledBy = req.user._id;
      booking.cancelledAt = new Date();

      await booking.save();

      // You might want to add notification logic here
      // await notifyBookingCancellation(booking);

      res.json({
        message: 'Booking cancelled successfully',
        booking
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = bookingController; 