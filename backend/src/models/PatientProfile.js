const mongoose = require('mongoose');

const patientProfileSchema = new mongoose.Schema({
  // La clé étrangère qui relie ce profil à ses identifiants de connexion
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
  },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  phoneNumber: { type: String },
  
  // Gestion des tiers (pour la prise de RDV d'un enfant mineur depuis ce compte)
  dependents: [{
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    relation: { type: String, enum: ['enfant', 'conjoint', 'parent'], required: true }
  }]
}, { timestamps: true });

module.exports = mongoose.model('PatientProfile', patientProfileSchema);