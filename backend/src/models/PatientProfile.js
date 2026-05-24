/**
 * Modèle PatientProfile — informations personnelles d'un patient.
 *
 * - Liée à un Account (relation 1-1) qui porte les identifiants de connexion.
 * - Stocke état civil, date de naissance et téléphone du patient principal.
 * - Permet de gérer une liste d'ayants droit (enfants, conjoint, parent) pour la prise de rendez-vous au nom d'un proche.
 * - Référencé par MedicalRecord, Appointment et Invoice.
 */
const mongoose = require('mongoose');

const patientProfileSchema = new mongoose.Schema({
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
  },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  dateOfBirth: { type: Date },
  phoneNumber: { type: String },

  dependents: [{
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    relation: { type: String, enum: ['enfant', 'conjoint', 'parent'], required: true },
    allergies: [{ type: String }],
    notes: { type: String }
  }]
}, { timestamps: true });

module.exports = mongoose.model('PatientProfile', patientProfileSchema);
