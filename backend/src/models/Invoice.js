const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  // Lien vers le rendez-vous qui a généré cette facture
  appointment: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Appointment', 
    required: true 
  },
  // Lien vers le patient facturé
  patient: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'PatientProfile', 
    required: true 
  },
  // Lien vers le médecin ayant réalisé l'acte
  doctor: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'DoctorProfile', 
    required: true 
  },
  
  // Montant de la facture
  amount: { type: Number, required: true },
  
  // Nomenclature médicale en vigueur (ex: "Secteur 1 - Acte CCAM")
  nomenclature: { type: String, required: true }, 
  
  // Suivi des encaissements et impayés
  status: { 
    type: String, 
    enum: ['payé', 'en attente', 'impayé'], 
    default: 'en attente' 
  },
  
  // Date d'émission et date de paiement
  issuedAt: { type: Date, default: Date.now },
  paidAt: { type: Date }
}, { timestamps: true });

invoiceSchema.index({ patient: 1, status: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
