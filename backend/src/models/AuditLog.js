/**
 * Modèle AuditLog — journal d'audit des actions sensibles.
 *
 * - Trace qui (userAccount) a fait quoi (action) sur quelle cible (targetId).
 * - Actions normalisées : CONNEXION, ACCES_DOSSIER, MODIFICATION_DOSSIER, CREATION_COMPTE, EXPORT_DONNEES.
 * - Conserve l'adresse IP et un détail libre pour la traçabilité réglementaire.
 * - Consulté uniquement par l'administrateur via /api/admin/audit (avec pagination).
 */
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  // L'utilisateur qui a effectué l'action (Admin, Médecin, etc.)
  userAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  
  // L'action réalisée
  action: { 
    type: String, 
    required: true,
    enum: ['CONNEXION', 'ACCES_DOSSIER', 'MODIFICATION_DOSSIER', 'CREATION_COMPTE', 'EXPORT_DONNEES'] 
  }, 
  
  // Sur quoi l'action a-t-elle été effectuée ? (L'ID du patient ou du document)
  targetId: { type: String }, 
  
  // Traçabilité technique
  ipAddress: { type: String },
  details: { type: String } // Informations supplémentaires (ex: "A consulté le dossier de Jean Dupont")
}, { timestamps: true });

auditLogSchema.index({ userAccount: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
