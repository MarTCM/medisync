/**
 * Routes /api/doctors — recherche de médecins et gestion du profil médecin.
 *
 * - GET /search est ouvert à tous les rôles authentifiés (filtrage par spécialité, langue, etc.).
 * - GET/PATCH /me permettent au médecin connecté de consulter et modifier son profil professionnel.
 * - /me/leaves : ajout, listing et suppression des congés/absences (impactent les créneaux disponibles).
 */
const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

// Recherche ouverte aux patients, secrétaires et admins
router.get('/search', protect, authorize('patient', 'secretaire', 'administrateur', 'medecin'), doctorController.searchDoctors);

// Profil du médecin connecté
router.get('/me', protect, authorize('medecin'), doctorController.getMe);
router.patch('/me', protect, authorize('medecin'), doctorController.updateMe);

// Gestion des congés
router.post('/me/leaves', protect, authorize('medecin'), doctorController.addLeave);
router.get('/me/leaves', protect, authorize('medecin'), doctorController.listLeaves);
router.delete('/me/leaves/:lid', protect, authorize('medecin'), doctorController.removeLeave);

module.exports = router;
