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
