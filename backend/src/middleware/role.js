/**
 * Middleware authorize — contrôle d'accès basé sur le rôle (RBAC).
 *
 * - À utiliser après protect() : compare req.user.role à la liste des rôles autorisés.
 * - Renvoie 403 si le rôle n'est pas dans la liste, sinon passe au middleware suivant.
 * - Usage : authorize('medecin', 'administrateur') pour autoriser plusieurs rôles.
 */
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
