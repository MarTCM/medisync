/**
 * Modèle Review — avis laissé par un patient après un rendez-vous terminé.
 *
 * - Un seul avis par rendez-vous (Appointment unique).
 * - Note de 1 à 5 + commentaire texte facultatif.
 * - Le drapeau isIssueReport permet de signaler une insatisfaction grave remontée à l'administration.
 */
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  // Le rendez-vous concerné par l'avis
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true, unique: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'PatientProfile', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'DoctorProfile', required: true },
  
  // Note et commentaire texte
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String },
  
  // Permet de distinguer un simple avis d'un signalement d'insatisfaction grave
  isIssueReport: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Review', reviewSchema);
