/**
 * Modèle Facility — configuration globale de la clinique (singleton).
 *
 * - Un seul document doit exister en base : informations générales de l'établissement.
 * - Gère les coordonnées, horaires d'ouverture et liste des spécialités proposées.
 * - Décrit les salles physiques et leur équipement (référencées par Appointment.room).
 * - CRUD réservé à l'administrateur via /api/facility.
 */
const mongoose = require('mongoose');

const facilitySchema = new mongoose.Schema({
  // Informations de base de la clinique
  name: { type: String, required: true },
  address: { type: String, required: true },
  contactEmail: { type: String },
  contactPhone: { type: String },
  
  // Paramétrage global
  specialtiesOffered: [{ type: String }],
  openingHours: { type: String, default: "08:00 - 20:00" },
  
  // Configuration des salles et équipements
  rooms: [{
    roomName: { type: String, required: true }, // ex: "Salle de Radiologie 1"
    equipment: [{ type: String }] // ex: ["Appareil IRM", "Echographe"]
  }]
}, { timestamps: true });

// On force la création d'un seul document Facility dans la base de données (modèle Singleton)
module.exports = mongoose.model('Facility', facilitySchema);
