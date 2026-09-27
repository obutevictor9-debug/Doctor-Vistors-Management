const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');

// Helper to calculate 30-min slots between start and end times
const generateTimeSlots = (startTime, endTime, durationMinutes = 30) => {
  const slots = [];
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  let current = new Date();
  current.setHours(startHour, startMin, 0, 0);

  const end = new Date();
  end.setHours(endHour, endMin, 0, 0);

  while (current < end) {
    const slotStart = current.toTimeString().slice(0, 5);
    current.setMinutes(current.getMinutes() + durationMinutes);
    const slotEnd = current.toTimeString().slice(0, 5);

    if (current <= end) {
      slots.push(`${slotStart} - ${slotEnd}`);
    }
  }

  return slots;
};

// 1. Get Available Time Slots for a Doctor on a Specific Date
exports.getDoctorAvailableSlots = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query; // Format: YYYY-MM-DD

    if (!date) {
      return res.status(400).json({ success: false, message: 'Please provide a date query parameter (YYYY-MM-DD)' });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    // Determine the day of the week from the date
    const dayOfWeek = new Date(date).toLocaleString('en-US', { weekday: 'long' });

    // Check doctor availability for that day
    const daySchedule = doctor.availability.find(
      (a) => a.day.toLowerCase() === dayOfWeek.toLowerCase()
    );

    if (!daySchedule) {
      return res.status(200).json({
        success: true,
        message: `Doctor is not scheduled to work on ${dayOfWeek}s`,
        availableSlots: [],
      });
    }

    // Generate all theoretical slots for this day
    const allSlots = generateTimeSlots(
      daySchedule.startTime,
      daySchedule.endTime,
      daySchedule.slotDurationMinutes || 30
    );

    // Find already-booked appointments for this doctor on this date
    const bookedAppointments = await Appointment.find({
      doctor: doctorId,
      appointmentDate: date,
      status: { $ne: 'cancelled' },
    }).select('timeSlot');

    const bookedSlots = bookedAppointments.map((a) => a.timeSlot);

    // Free slots = allSlots minus bookedSlots
    const availableSlots = allSlots.filter((slot) => !bookedSlots.includes(slot));

    res.status(200).json({
      success: true,
      doctor: `${doctor.specialization} (${doctor.hospital})`,
      date,
      dayOfWeek,
      availableSlots,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Book an Appointment (Visitor)
exports.createAppointment = async (req, res) => {
  try {
    const { doctorId, appointmentDate, timeSlot, reasonForVisit } = req.body;

    if (!doctorId || !appointmentDate || !timeSlot || !reasonForVisit) {
      return res.status(400).json({
        success: false,
        message: 'Please provide doctorId, appointmentDate, timeSlot, and reasonForVisit',
      });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor || !doctor.isAvailable) {
      return res.status(404).json({ success: false, message: 'Doctor is not available or does not exist' });
    }

    // Check if slot is already occupied
    const existing = await Appointment.findOne({
      doctor: doctorId,
      appointmentDate,
      timeSlot,
      status: { $ne: 'cancelled' },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'This time slot is already booked. Please choose another slot.',
      });
    }

    const appointment = await Appointment.create({
      visitor: req.user._id,
      doctor: doctorId,
      appointmentDate,
      timeSlot,
      reasonForVisit,
      status: 'pending',
    });

    const populated = await Appointment.findById(appointment._id)
      .populate('visitor', 'firstName lastName email phone')
      .populate({
        path: 'doctor',
        populate: { path: 'user', select: 'firstName lastName email phone' },
      });

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      data: populated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Get Visitor's Own Appointments (Visitor)
exports.getMyVisitorAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ visitor: req.user._id })
      .populate({
        path: 'doctor',
        populate: { path: 'user', select: 'firstName lastName email phone profileImage' },
      })
      .sort({ appointmentDate: -1, timeSlot: -1 });

    res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Get Doctor's Incoming Appointments (Doctor)
exports.getMyDoctorAppointments = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ user: req.user._id });
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found' });
    }

    const { status, date } = req.query;
    let query = { doctor: doctor._id };

    if (status) query.status = status;
    if (date) query.appointmentDate = date;

    const appointments = await Appointment.find(query)
      .populate('visitor', 'firstName lastName email phone profileImage')
      .sort({ appointmentDate: 1, timeSlot: 1 });

    res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Get All Appointments (Admin)
exports.getAllAppointments = async (req, res) => {
  try {
    const { status, date } = req.query;
    let query = {};

    if (status) query.status = status;
    if (date) query.appointmentDate = date;

    const appointments = await Appointment.find(query)
      .populate('visitor', 'firstName lastName email phone')
      .populate({
        path: 'doctor',
        populate: { path: 'user', select: 'firstName lastName email' },
      })
      .sort({ appointmentDate: -1 });

    res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 6. Get Single Appointment by ID
exports.getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('visitor', 'firstName lastName email phone')
      .populate({
        path: 'doctor',
        populate: { path: 'user', select: 'firstName lastName email phone' },
      });

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    res.status(200).json({ success: true, data: appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 7. Update Appointment Status (Doctor & Admin)
exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    res.status(200).json({
      success: true,
      message: `Appointment status updated to ${status}`,
      data: appointment,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 8. Reschedule Appointment (Visitor or Doctor)
exports.rescheduleAppointment = async (req, res) => {
  try {
    const { appointmentDate, timeSlot } = req.body;

    if (!appointmentDate || !timeSlot) {
      return res.status(400).json({ success: false, message: 'Provide new appointmentDate and timeSlot' });
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    // Check if new slot is taken
    const conflict = await Appointment.findOne({
      _id: { $ne: appointment._id },
      doctor: appointment.doctor,
      appointmentDate,
      timeSlot,
      status: { $ne: 'cancelled' },
    });

    if (conflict) {
      return res.status(400).json({ success: false, message: 'The chosen new slot is already booked' });
    }

    appointment.appointmentDate = appointmentDate;
    appointment.timeSlot = timeSlot;
    appointment.status = 'rescheduled';
    await appointment.save();

    res.status(200).json({
      success: true,
      message: 'Appointment rescheduled successfully',
      data: appointment,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 9. Cancel Appointment (Visitor, Doctor, or Admin)
exports.cancelAppointment = async (req, res) => {
  try {
    const { cancellationReason } = req.body;

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    appointment.status = 'cancelled';
    appointment.cancellationReason = cancellationReason || 'Cancelled by user';
    await appointment.save();

    res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully',
      data: appointment,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};