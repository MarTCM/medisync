/**
 * Middleware validate — collecte les erreurs de validation express-validator.
 *
 * - À placer en fin de chaîne, après les body()/param()/query() de validation.
 * - Renvoie 400 avec la liste des erreurs si la requête est invalide, sinon passe au contrôleur.
 */
const { validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: "Données invalides", errors: errors.array() });
  }
  next();
};

module.exports = validate;
