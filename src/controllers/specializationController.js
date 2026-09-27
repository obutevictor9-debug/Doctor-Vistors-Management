const Specialization = require('../models/specialization');

// 1. Create Specialization (Admin only)
exports.createSpecialization = async (req, res) => {
  try {
    const { name, description, icon } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Please provide a specialization name' });
    }

    const exists = await Specialization.findOne({ name: { $regex: `^${name}$`, $options: 'i' } });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Specialization already exists' });
    }

    const specialization = await Specialization.create({ name, description, icon });
    res.status(201).json({ success: true, message: 'Specialization created successfully', data: specialization });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Get All Specializations (Public)
exports.getSpecializations = async (req, res) => {
  try {
    const filter = req.user && req.user.role === 'admin' ? {} : { isActive: true };
    const list = await Specialization.find(filter).sort({ name: 1 });
    res.status(200).json({ success: true, count: list.length, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Get Single Specialization by ID (Public)
exports.getSpecializationById = async (req, res) => {
  try {
    const item = await Specialization.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Specialization not found' });
    }
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Update Specialization (Admin only)
exports.updateSpecialization = async (req, res) => {
  try {
    const item = await Specialization.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Specialization not found' });
    }
    res.status(200).json({ success: true, message: 'Specialization updated', data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Delete Specialization (Admin only)
exports.deleteSpecialization = async (req, res) => {
  try {
    const item = await Specialization.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Specialization not found' });
    }
    res.status(200).json({ success: true, message: 'Specialization deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};