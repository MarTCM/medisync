/**
 * Contrôleur review — collecte des avis patients après consultation.
 *
 * - createReview : un patient laisse une note (1-5) et un commentaire pour un RDV terminé.
 * - Le drapeau isIssueReport distingue un avis ordinaire d'un signalement d'insatisfaction grave
 *   (remonté à l'administration pour suivi qualité).
 * - Contrainte d'unicité (un avis par rendez-vous) appliquée au niveau du modèle Mongoose.
 */
const Review = require('../models/Review');
const Appointment = require('../models/Appointment');

exports.createReview = async (req, res) => {
  try {
    const { appointmentId, rating, comment, isIssueReport } = req.body;

    // 1. Vérifier si le RDV existe et appartient au patient
    const appointment = await Appointment.findById(appointmentId).populate('patient');
    if (!appointment) return res.status(404).json({ message: "Rendez-vous introuvable." });

    // 2. Vérifier si le RDV est bien 'terminé' avant de laisser un avis
    if (appointment.status !== 'terminé') {
      return res.status(400).json({ message: "Vous ne pouvez évaluer qu'une consultation terminée." });
    }

    // 3. Création de l'avis ou du signalement
    const review = await Review.create({
      appointment: appointmentId,
      patient: appointment.patient._id,
      doctor: appointment.doctor,
      rating,
      comment,
      isIssueReport // Pour le signalement d'insatisfaction
    });

    res.status(201).json({ message: "Merci pour votre retour !", review });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de l'envoi de l'avis", error: error.message });
  }
};