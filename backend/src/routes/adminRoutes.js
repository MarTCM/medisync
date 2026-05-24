/**
 * Routes /api/admin — gestion du personnel et journal d'audit.
 *
 * - Toutes les routes sont protégées par JWT (protect) et restreintes à l'administrateur (authorize).
 * - POST /create-staff valide email/mot de passe/rôle avant délégation à adminController.
 * - GET /patients est ouvert aussi à la secrétaire pour la gestion de fiches patient.
 * - GET /audit fournit le journal d'audit paginé pour la consultation de l'administrateur.
 */
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const adminController = require('../controllers/adminController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const validate = require('../middleware/validate');

// Créer un compte personnel médical
router.post('/create-staff',
  protect,
  authorize('administrateur'),
  body('email').isEmail().withMessage('Email invalide.'),
  body('password')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .withMessage('Mot de passe invalide.'),
  body('role').isIn(['medecin', 'secretaire']).withMessage('Rôle invalide.'),
  body('firstName').notEmpty().withMessage('Prénom requis.'),
  body('lastName').notEmpty().withMessage('Nom requis.'),
  validate,
  adminController.createStaffAccount
);

// Lister le personnel
router.get('/staff', protect, authorize('administrateur'), adminController.listStaff);

// Mettre à jour le compte d'un membre du personnel
router.patch('/staff/:id', protect, authorize('administrateur'), adminController.updateStaffAccount);

// Supprimer un compte (personnel ou patient)
router.delete('/accounts/:id', protect, authorize('administrateur'), adminController.deleteAccount);

// Lister les patients (secrétaire + admin)
router.get('/patients', protect, authorize('secretaire', 'administrateur'), adminController.listPatients);

// Journal d'audit paginé
router.get('/audit', protect, authorize('administrateur'), adminController.listAudit);

module.exports = router;
