const Visit = require('../models/visit');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');

// 1. Check-In Visitor (Admin or Self/Receptionist)
exports.checkInVisitor = async (req, res) => {
  try {
    const { appointmentId, vitals } = req.body;

    if (!appointmentId) {
      return res.status(400).json({ success: false, message: 'Please provide an appointmentId' });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (appointment.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot check in for a cancelled appointment' });
    }

    // Check if visit record already exists
    const existingVisit = await Visit.findOne({ appointment: appointmentId });
    if (existingVisit) {
      return res.status(400).json({
        success: false,
        message: `Visitor already checked in. Current status: ${existingVisit.status}`,
        data: existingVisit,
      });
    }

    const visit = await Visit.create({
      appointment: appointment._id,
      visitor: appointment.visitor,
      doctor: appointment.doctor,
      status: 'waiting', // Immediately enters the waiting room queue
      checkInTime: new Date(),
      vitals: vitals || {},
    });

    // Update appointment status to confirmed/active
    appointment.status = 'confirmed';
    await appointment.save();

    const populated = await Visit.findById(visit._id)
      .populate('visitor', 'firstName lastName email phone profileImage')
      .populate({
        path: 'doctor',
        populate: { path: 'user', select: 'firstName lastName email' },
      });

    res.status(201).json({
      success: true,
      message: 'Visitor checked in and placed in the waiting room',
      data: populated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Doctor Starts Consultation (Status -> 'with-doctor')
exports.startConsultation = async (req, res) => {
  try {
    const visit = await Visit.findById(req.params.id);
    if (!visit) {
      return res.status(404).json({ success: false, message: 'Visit not found' });
    }

    visit.status = 'with-doctor';
    await visit.save();

    res.status(200).json({
      success: true,
      message: 'Consultation started (visitor is with doctor)',
      data: visit,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Complete Visit & Check-Out (Doctor adds diagnosis & completes)
exports.completeVisit = async (req, res) => {
  try {
    const { clinicalNotes } = req.body;

    const visit = await Visit.findById(req.params.id);
    if (!visit) {
      return res.status(404).json({ success: false, message: 'Visit not found' });
    }

    visit.status = 'completed';
    visit.checkOutTime = new Date();
    if (clinicalNotes) {
      visit.clinicalNotes = {
        ...visit.clinicalNotes,
        ...clinicalNotes,
      };
    }

    await visit.save();

    // Mark the linked appointment as completed
    await Appointment.findByIdAndUpdate(visit.appointment, { status: 'completed' });

    res.status(200).json({
      success: true,
      message: 'Visit completed and visitor checked out successfully',
      data: visit,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Get Active Visits Queue (Waiting room for Admin / Doctor)
exports.getActiveVisits = async (req, res) => {
  try {
    const activeStatuses = ['checked-in', 'waiting', 'with-doctor'];

    let filter = { status: { $in: activeStatuses } };

    // If caller is a doctor, show only their own waiting room
    if (req.user.role === 'doctor') {
      const doctorProfile = await Doctor.findOne({ user: req.user._id });
      if (doctorProfile) {
        filter.doctor = doctorProfile._id;
      }
    }

    const visits = await Visit.find(filter)
      .populate('visitor', 'firstName lastName phone profileImage')
      .populate({
        path: 'doctor',
        populate: { path: 'user', select: 'firstName lastName email' },
      })
      .populate('appointment', 'appointmentDate timeSlot reasonForVisit')
      .sort({ checkInTime: 1 }); // First-come, first-served queue

    res.status(200).json({
      success: true,
      count: visits.length,
      data: visits,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Get Single Visit Details
exports.getVisitById = async (req, res) => {
  try {
    const visit = await Visit.findById(req.params.id)
      .populate('visitor', 'firstName lastName email phone profileImage')
      .populate({
        path: 'doctor',
        populate: { path: 'user', select: 'firstName lastName email phone' },
      })
      .populate('appointment');

    if (!visit) {
      return res.status(404).json({ success: false, message: 'Visit not found' });
    }

    res.status(200).json({ success: true, data: visit });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 6. Get Visit History (Past Visits)
exports.getVisitHistory = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'visitor') {
      filter.visitor = req.user._id;
    } else if (req.user.role === 'doctor') {
      const doctorProfile = await Doctor.findOne({ user: req.user._id });
      if (doctorProfile) {
        filter.doctor = doctorProfile._id;
      }
    }
    // Admin sees all history

    const history = await Visit.find(filter)
      .populate('visitor', 'firstName lastName email phone')
      .populate({
        path: 'doctor',
        populate: { path: 'user', select: 'firstName lastName' },
      })
      .populate('appointment', 'appointmentDate timeSlot reasonForVisit')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 7. Cancel / Abort Visit
exports.cancelVisit = async (req, res) => {
  try {
    const visit = await Visit.findById(req.params.id);
    if (!visit) {
      return res.status(404).json({ success: false, message: 'Visit not found' });
    }

    visit.status = 'cancelled';
    visit.checkOutTime = new Date();
    await visit.save();

    res.status(200).json({
      success: true,
      message: 'Visit has been cancelled',
      data: visit,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};