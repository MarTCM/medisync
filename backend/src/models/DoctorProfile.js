const mongoose = require('mongoose');

const doctorProfileSchema = new mongoose.Schema({
  // Lien vital vers les identifiants de connexion (Account)
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
  },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  
  // Critères de recherche (exigés par le cahier des charges)
  specialties: [{ type: String, required: true }],
  languages: [{ type: String }],
  location: { type: String }, // Exemple : "Bâtiment A - Salle 3"
  
  // Tarification
  sector: { 
    type: Number, 
    enum: [1, 2, 3], // Secteur 1, 2 ou 3
    default: 1 
  },
  baseFee: { type: Number, required: true }, // Tarif de base de la consultation
  fees: [{
    code:  { type: String, required: true },
    label: { type: String, required: true },
    price: { type: Number, required: true }
  }],

  // Gestion du Planning (Disponibilités par défaut)
  schedule: {
    workDays: [{ 
      type: String, 
      enum: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] 
    }],
    startHour: { type: String, default: '09:00' }, // Format HH:mm
    endHour: { type: String, default: '18:00' },
    // La durée standard d'une consultation pour ce médecin (15, 30 ou 60 min)
    defaultConsultationDuration: { type: Number, enum: [15, 30, 60], default: 30 }
  },

  // Gestion des congés ou absences exceptionnelles
  leaves: [{
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String }
  }]
}, { timestamps: true });

module.exports = mongoose.model('DoctorProfile', doctorProfileSchema);