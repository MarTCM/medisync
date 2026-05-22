const AuditLog = require('../models/AuditLog');

/**
 * Writes an audit log entry for sensitive actions.
 * @param {'CONNEXION'|'ACCES_DOSSIER'|'MODIFICATION_DOSSIER'|'CREATION_COMPTE'|'EXPORT_DONNEES'} action
 * @param {import('express').Request} req - Express request (provides user + IP)
 * @param {string} [targetId] - ID of the affected resource (patient, document, etc.)
 * @param {string} [details] - Human-readable details
 */
const logAudit = async (action, req, targetId = null, details = null) => {
  try {
    await AuditLog.create({
      userAccount: req.user._id || req.user.id,
      action,
      targetId: targetId ? String(targetId) : undefined,
      ipAddress: req.ip,
      details
    });
  } catch (err) {
    // Audit failures must never break the main request flow
    console.error('Audit log error:', err.message);
  }
};

module.exports = { logAudit };
