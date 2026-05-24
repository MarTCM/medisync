/**
 * Modèle SecretaryProfile — fiche d'une secrétaire de la clinique.
 *
 * - Liée à un Account (relation 1-1, contrainte unique) qui porte les identifiants et le rôle 'secretaire'.
 * - Stocke uniquement l'état civil — les permissions sont contrôlées par le RBAC via Account.role.
 * - Création réservée à l'administrateur via /api/admin/staff.
 */
const mongoose = require('mongoose');

const secretaryProfileSchema = new mongoose.Schema({
  account: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Account', 
    required: true,
    unique: true
  },
  firstName: { 
    type: String, 
    required: true 
  },
  lastName: { 
    type: String, 
    required: true 
  },
  // Vous pouvez ajouter d'autres champs plus tard si besoin (ex: téléphone de poste)
}, { timestamps: true });

module.exports = mongoose.model('SecretaryProfile', secretaryProfileSchema);
