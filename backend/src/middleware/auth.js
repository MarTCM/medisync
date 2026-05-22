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
