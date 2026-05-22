const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PatientProfile',
    required: false // null for 'indisponible' blocks
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DoctorProfile',
    required: true
  },
  dependentId: {
    type: mongoose.Schema.Types.ObjectId
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  duration: {
    type: Number,
    enum: [15, 30, 60],
    required: true
  },
  reason: {
    type: String,
    enum: ['consultation générale', 'suivi', 'urgence', 'autre', 'indisponibilité'],
    required: true
  },
  notes: { type: String },
  room: { type: String }, // Salle de consultation (lié à Facility.rooms[].roomName)
  status: {
    type: String,
    enum: ['en attente', 'confirmé', 'annulé', 'terminé', 'indisponible', 'no-show'],
    default: 'en attente'
  }
}, { timestamps: true });

appointmentSchema.index({ doctor: 1, startTime: 1 });
appointmentSchema.index({ patient: 1, startTime: -1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
