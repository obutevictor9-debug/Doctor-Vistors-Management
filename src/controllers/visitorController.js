const Visitor = require('../models/Visitor');
const User = require('../models/User');

// 1. Create or Update Visitor's Own Profile (Visitor only)
exports.createOrUpdateMyProfile = async (req, res) => {
  try {
    const { dateOfBirth, gender, address, bloodGroup, allergies, emergencyContact } = req.body;

    const profileFields = {
      user: req.user._id,
      dateOfBirth,
      gender,
      address,
      bloodGroup,
      allergies,
      emergencyContact,
    };

    // Remove undefined keys
    Object.keys(profileFields).forEach(
      (key) => profileFields[key] === undefined && delete profileFields[key]
    );

    let visitor = await Visitor.findOne({ user: req.user._id });

    if (visitor) {
      visitor = await Visitor.findOneAndUpdate(
        { user: req.user._id },
        { $set: profileFields },
        { new: true, runValidators: true }
      ).populate('user', 'firstName lastName email phone profileImage');

      return res.status(200).json({
        success: true,
        message: 'Visitor profile updated successfully',
        data: visitor,
      });
    }

    visitor = await Visitor.create(profileFields);
    visitor = await visitor.populate('user', 'firstName lastName email phone profileImage');

    res.status(201).json({
      success: true,
      message: 'Visitor profile created successfully',
      data: visitor,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Get My Visitor Profile (Visitor only)
exports.getMyProfile = async (req, res) => {
  try {
    let visitor = await Visitor.findOne({ user: req.user._id }).populate(
      'user',
      'firstName lastName email phone profileImage'
    );

    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: 'Visitor profile not created yet. Please complete your profile.',
      });
    }

    res.status(200).json({ success: true, data: visitor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Get All Visitors (Admin & Doctor)
exports.getAllVisitors = async (req, res) => {
  try {
    const visitors = await Visitor.find()
      .populate('user', 'firstName lastName email phone profileImage isActive')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: visitors.length,
      data: visitors,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Search Visitors by Name, Email, or Phone (Admin & Doctor)
exports.searchVisitors = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ success: false, message: 'Please provide a search query' });
    }

    // First find matching users
    const matchedUsers = await User.find({
      role: 'visitor',
      $or: [
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { phone: { $regex: query, $options: 'i' } },
      ],
    }).select('_id');

    const userIds = matchedUsers.map((u) => u._id);

    const visitors = await Visitor.find({ user: { $in: userIds } }).populate(
      'user',
      'firstName lastName email phone profileImage'
    );

    res.status(200).json({
      success: true,
      count: visitors.length,
      data: visitors,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Get Visitor by ID (Admin & Doctor)
exports.getVisitorById = async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id).populate(
      'user',
      'firstName lastName email phone profileImage isActive'
    );

    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor not found' });
    }

    res.status(200).json({ success: true, data: visitor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 6. Delete Visitor (Admin only)
exports.deleteVisitor = async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor not found' });
    }

    // Delete visitor profile and user credentials
    await User.findByIdAndDelete(visitor.user);
    await Visitor.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Visitor account and profile deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};