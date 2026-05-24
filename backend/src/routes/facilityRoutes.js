/**
 * Routes /api/facility — configuration de la clinique (singleton).
 *
 * - Lecture ouverte à tous les rôles authentifiés (la fiche clinique est utilisée dans plusieurs vues).
 * - Écriture (PUT et /rooms) réservée à l'administrateur : mise à jour des informations générales,
 *   ajout et suppression des salles d'examen.
 */
const express = require('express');
const router = express.Router();
const facilityController = require('../controllers/facilityController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

// Lecture ouverte au personnel connecté
router.get('/', protect, authorize('medecin', 'secretaire', 'administrateur', 'patient'), facilityController.getFacility);

// Écriture réservée à l'administrateur
router.put('/', protect, authorize('administrateur'), facilityController.upsertFacility);
router.post('/rooms', protect, authorize('administrateur'), facilityController.addRoom);
router.delete('/rooms/:rid', protect, authorize('administrateur'), facilityController.removeRoom);

module.exports = router;
