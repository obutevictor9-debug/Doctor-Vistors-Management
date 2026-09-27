const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const Visit = require('../models/visit');

// 1. Overall System Summary (Admin only)
exports.getAdminDashboard = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [
      totalVisitors,
      totalDoctors,
      totalAppointments,
      todayAppointments,
      activeVisits,
      completedVisits,
    ] = await Promise.all([
      User.countDocuments({ role: 'visitor' }),
      Doctor.countDocuments(),
      Appointment.countDocuments(),
      Appointment.countDocuments({ appointmentDate: today }),
      Visit.countDocuments({ status: { $in: ['checked-in', 'waiting', 'with-doctor'] } }),
      Visit.countDocuments({ status: 'completed' }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalRegisteredVisitors: totalVisitors,
        totalActiveDoctors: totalDoctors,
        totalBookings: totalAppointments,
        scheduledToday: todayAppointments,
        currentlyInWaitingRoom: activeVisits,
        totalFinishedConsultations: completedVisits,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Doctor Dashboard (Doctor only)
exports.getDoctorDashboard = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ user: req.user._id });
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found' });
    }

    const today = new Date().toISOString().split('T')[0];

    const [todayCount, pendingApproval, waitingInClinic, totalTreated] = await Promise.all([
      Appointment.countDocuments({ doctor: doctor._id, appointmentDate: today, status: { $ne: 'cancelled' } }),
      Appointment.countDocuments({ doctor: doctor._id, status: 'pending' }),
      Visit.countDocuments({ doctor: doctor._id, status: { $in: ['checked-in', 'waiting'] } }),
      Visit.countDocuments({ doctor: doctor._id, status: 'completed' }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        appointmentsToday: todayCount,
        pendingReview: pendingApproval,
        patientsWaitingNow: waitingInClinic,
        totalCompletedCases: totalTreated,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Visitor Dashboard (Visitor only)
exports.getVisitorDashboard = async (req, res) => {
  try {
    const [upcoming, pastCompleted] = await Promise.all([
      Appointment.find({
        visitor: req.user._id,
        status: { $in: ['pending', 'confirmed', 'rescheduled'] },
      })
        .populate({ path: 'doctor', populate: { path: 'user', select: 'firstName lastName email phone' } })
        .sort({ appointmentDate: 1 }),
      Visit.find({ visitor: req.user._id, status: 'completed' })
        .populate({ path: 'doctor', populate: { path: 'user', select: 'firstName lastName' } })
        .sort({ checkOutTime: -1 }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        activeBookingsCount: upcoming.length,
        upcomingBookings: upcoming,
        pastCompletedVisitsCount: pastCompleted.length,
        recentVisits: pastCompleted.slice(0, 5),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};