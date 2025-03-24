const Product = require('../models/product.model');

exports.createProduct = async (req, res) => {
  try {
    const { name, description, price, categoryName, stock, sizes, pincodes } = req.body;
    const properpath = req.file ? req.file.path.replace('/uploads', '') : req.file.path
    const product = new Product({
      name,
      description,
      price,
      categoryName,
      stock,
      sizes: JSON.parse(sizes),
      pincodes: JSON.parse(pincodes),
      image: properpath
    });
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getAllProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object based on query parameters
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
  
    if (req.query.startDate && req.query.endDate) {
      filter.createdAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        {categoryName: { $regex: req.query.search, $options: 'i' } }
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

    const Products = await Product.find(filter).select('-password')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const totalOrders = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / limit);

    res.json({
      Products,
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

exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    let updateData = { ...req.body };
    if (req.file) updateData.image = req.file.path;
    if(updateData.sizes) { 
      updateData.sizes =  JSON.parse(updateData.sizes);
    }
    if(updateData.pincodes) { 
      updateData.pincodes =  JSON.parse(updateData.pincodes);
    }
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.toggleProductStatus = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    
    product.isActive = !product.isActive;
    await product.save();
    
    res.json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}; 