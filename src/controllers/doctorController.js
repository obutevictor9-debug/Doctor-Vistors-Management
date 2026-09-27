const Doctor = require('../models/Doctor');
const User = require('../models/User');

// 1. ADMIN ONLY: Create a Doctor (creates user account + doctor profile together)
exports.adminCreateDoctor = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      specialization,
      licenseNumber,
      hospital,
      consultationFee,
      bio,
      availability,
    } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    // Check if license number already exists
    const existingLicense = await Doctor.findOne({ licenseNumber });
    if (existingLicense) {
      return res.status(400).json({ success: false, message: 'Doctor license number already exists' });
    }

    // 1. Create the user account with role: 'doctor'
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role: 'doctor',
      phone,
    });

    // 2. Create the linked Doctor profile
    const doctor = await Doctor.create({
      user: user._id,
      specialization,
      licenseNumber,
      hospital,
      consultationFee: consultationFee || 0,
      bio: bio || '',
      availability: availability || [],
    });

    const populatedDoctor = await Doctor.findById(doctor._id).populate(
      'user',
      'firstName lastName email phone profileImage role isActive'
    );

    res.status(201).json({
      success: true,
      message: 'Doctor account and profile created successfully by admin',
      data: populatedDoctor,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. DOCTOR ONLY: Update Own Profile (Bio, Availability, Fee)
exports.updateDoctorProfile = async (req, res) => {
  try {
    const { specialization, hospital, consultationFee, bio, availability, isAvailable } = req.body;

    const doctor = await Doctor.findOne({ user: req.user._id });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found. Contact Admin to initialize your profile.',
      });
    }

    // Update allowable fields
    if (specialization) doctor.specialization = specialization;
    if (hospital) doctor.hospital = hospital;
    if (consultationFee !== undefined) doctor.consultationFee = consultationFee;
    if (bio !== undefined) doctor.bio = bio;
    if (availability) doctor.availability = availability;
    if (isAvailable !== undefined) doctor.isAvailable = isAvailable;

    await doctor.save();

    const updated = await Doctor.findById(doctor._id).populate(
      'user',
      'firstName lastName email phone profileImage'
    );

    res.status(200).json({
      success: true,
      message: 'Doctor profile updated successfully',
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. DOCTOR ONLY: Get Own Profile
exports.getMyDoctorProfile = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ user: req.user._id }).populate(
      'user',
      'firstName lastName email phone profileImage'
    );

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found' });
    }

    res.status(200).json({ success: true, data: doctor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. PUBLIC: Get All Doctors (Search and Filter)
exports.getAllDoctors = async (req, res) => {
  try {
    const { specialization, hospital, search } = req.query;
    let query = {};

    if (specialization) {
      query.specialization = { $regex: specialization, $options: 'i' };
    }

    if (hospital) {
      query.hospital = { $regex: hospital, $options: 'i' };
    }

    let doctors = await Doctor.find(query).populate(
      'user',
      'firstName lastName email phone profileImage isActive'
    );

    // Only return doctors whose user account is active
    doctors = doctors.filter((doc) => doc.user && doc.user.isActive !== false);

    if (search) {
      const term = search.toLowerCase();
      doctors = doctors.filter(
        (doc) =>
          doc.user.firstName.toLowerCase().includes(term) ||
          doc.user.lastName.toLowerCase().includes(term)
      );
    }

    res.status(200).json({
      success: true,
      count: doctors.length,
      data: doctors,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. PUBLIC: Get Doctor By ID
exports.getDoctorById = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id).populate(
      'user',
      'firstName lastName email phone profileImage'
    );

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    res.status(200).json({ success: true, data: doctor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 6. ADMIN ONLY: Delete Doctor Profile and their User account
exports.adminDeleteDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    // Delete both the doctor profile and the corresponding user account
    await User.findByIdAndDelete(doctor.user);
    await Doctor.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Doctor and associated user account deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};