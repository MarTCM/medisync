/**
 * Middleware protect — authentification par JWT (Bearer Token).
 *
 * - Lit l'en-tête HTTP "Authorization: Bearer <token>" et vérifie sa signature avec JWT_SECRET.
 * - Charge le compte correspondant (sans le mot de passe) et l'attache à req.user pour les middlewares suivants.
 * - Retourne 401 si le token est absent, invalide, expiré ou si le compte n'existe plus.
 * - Doit précéder authorize() pour toute route nécessitant un contrôle de rôle.
 */
const jwt = require('jsonwebtoken');
const Account = require('../models/Account');

exports.protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Non autorisé, aucun token fourni' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await Account.findById(decoded.id).select('-password');
    if (!req.user) {
      return res.status(401).json({ message: 'Compte introuvable. Veuillez vous reconnecter.' });
    }
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token invalide ou expiré' });
  }
};
