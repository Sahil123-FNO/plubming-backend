const User = require('../models/user.model');

exports.getAllUsers = async (req, res) => {
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
            { name: { $regex: req.query.search, $options: 'i' } },
            {email: { $regex: req.query.search, $options: 'i' } }
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
    
        const users = await User.find(filter).select('-password')
          .sort(sort)
          .skip(skip)
          .limit(limit);
    
        const totalOrders = await User.countDocuments(filter);
        const totalPages = Math.ceil(totalOrders / limit);
    
        res.json({
          users,
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
};

exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    user.isActive = !user.isActive;
    await user.save();
    
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}; 

exports.changePassword = async (req, res) => {
  try {
      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(req.user.id);

      // Check current password
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
          return res.status(400).json({ message: 'Current password is incorrect' });
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      await user.save();

      res.json({ message: 'Password updated successfully' });
  } catch (error) {
      res.status(500).json({ message: 'Server error' });
  }
};

// Update Profile
exports.updateProfile= async (req, res) => {
  try {
      const { name, email, phone } = req.body;
      const updateFields = {};
      
      if (name) updateFields.name = name;
      if (email) updateFields.email = email;
      if (phone) updateFields.phone = phone;

      const user = await User.findByIdAndUpdate(
          req.user.id,
          { $set: updateFields },
          { new: true, select: '-password' }
      );

      res.json(user);
  } catch (error) {
      res.status(500).json({ message: 'Server error' });
  }
};
