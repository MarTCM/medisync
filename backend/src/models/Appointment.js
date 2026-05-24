/**
 * Modèle Appointment — créneau de consultation (ou blocage de planning).
 *
 * - Référence un médecin obligatoirement et un patient (facultatif pour les blocs 'indisponible').
 * - Supporte les rendez-vous pour un ayant droit (dependentId) du patient principal.
 * - Statut suit le cycle de vie : en attente → confirmé → terminé / annulé / no-show.
 * - Durée standardisée à 15, 30 ou 60 minutes ; salle liée à Facility.rooms[].roomName.
 * - Index composés pour les requêtes par médecin/date et par patient/date.
 */
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
