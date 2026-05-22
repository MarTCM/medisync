const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

const passwordRules = body('password')
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
  .withMessage('Mot de passe : 8 caractères min, 1 majuscule, 1 chiffre, 1 caractère spécial.');

// Inscription
router.post('/register',
  body('role').isIn(['patient', 'medecin', 'secretaire', 'administrateur']).withMessage('Rôle invalide.'),
  passwordRules,
  validate,
  authController.register
);

// Connexion
router.post('/login',
  body('identifier').notEmpty().withMessage('Identifiant requis.'),
  body('password').notEmpty().withMessage('Mot de passe requis.'),
  validate,
  authController.login
);

// Connexion Google OAuth
router.post('/google',
  body('idToken').notEmpty().withMessage('idToken Google requis.'),
  validate,
  authController.googleLogin
);

// 2FA — Vérification du code TOTP
router.post('/2fa/verify',
  body('tempToken').notEmpty().withMessage('Token temporaire requis.'),
  body('code').isLength({ min: 6, max: 6 }).withMessage('Code TOTP invalide (6 chiffres).'),
  validate,
  authController.verify2FA
);

// Profil du compte connecté
router.get('/me', protect, authController.getMe);
router.patch('/me', protect, authController.updatePatientProfile);

// Complétion du profil (patients Google OAuth)
router.post('/complete-profile', protect,
  body('socialSecurityNumber').notEmpty().withMessage('Numéro de sécurité sociale requis.'),
  body('firstName').notEmpty().withMessage('Prénom requis.'),
  body('lastName').notEmpty().withMessage('Nom requis.'),
  validate,
  authController.completeProfile
);

// 2FA — Configuration (admin connecté)
router.post('/2fa/setup', protect, authController.setup2FA);

// 2FA — Confirmation de l'activation (l'admin saisit le code après scan du QR)
router.post('/2fa/confirm-setup', protect,
  body('code').isLength({ min: 6, max: 6 }).withMessage('Code TOTP invalide.'),
  validate,
  authController.confirmSetup2FA
);

// 2FA — Désactivation (admin connecté)
router.post('/2fa/disable', protect,
  body('code').isLength({ min: 6, max: 6 }).withMessage('Code TOTP invalide.'),
  validate,
  authController.disable2FA
);

module.exports = router;
