// On passe les rôles autorisés en paramètres (ex: authorize('medecin', 'administrateur'))
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Le rôle '${req.user.role}' n'est pas autorisé à accéder à cette ressource` 
      });
    }
    next();
  };
};
