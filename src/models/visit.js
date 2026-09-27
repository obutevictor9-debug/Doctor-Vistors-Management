const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema(
  {
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: [true, 'Linked appointment is required'],
      unique: true, // One physical visit per appointment
    },
    visitor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'checked-in', 'waiting', 'with-doctor', 'completed', 'cancelled'],
      default: 'checked-in',
    },
    checkInTime: {
      type: Date,
      default: Date.now,
    },
    checkOutTime: {
      type: Date,
    },
    // Optional vitals taken at front desk / triage
    vitals: {
      bloodPressure: { type: String, default: '' }, // e.g. "120/80"
      temperature: { type: String, default: '' },   // e.g. "36.8 C"
      weight: { type: String, default: '' },        // e.g. "72 kg"
      pulse: { type: String, default: '' },         // e.g. "75 bpm"
    },
    // Doctor consultation record
    clinicalNotes: {
      symptoms: { type: String, default: '' },
      diagnosis: { type: String, default: '' },
      prescription: { type: String, default: '' },
      doctorNotes: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Visit', visitSchema);