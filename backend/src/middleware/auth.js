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
    // On attache le compte (sans le mot de passe) à la requête
    req.user = await Account.findById(decoded.id).select('-password');
    next(); // Le token est bon, on passe à la suite !
  } catch (error) {
    res.status(401).json({ message: 'Token invalide ou expiré' });
  }
};
