const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const appointmentController = require('../controllers/appointmentController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const validate = require('../middleware/validate');

// Créer un rendez-vous
router.post('/',
  protect,
  authorize('patient', 'secretaire', 'administrateur'),
  body('doctorId').notEmpty().withMessage('Médecin requis.'),
  body('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date invalide (YYYY-MM-DD).'),
  body('time').matches(/^\d{2}:\d{2}$/).withMessage('Heure invalide (HH:mm).'),
  body('duration').isIn([15, 30, 60]).withMessage('Durée invalide (15, 30 ou 60 min).'),
  body('reason').notEmpty().withMessage('Motif requis.'),
  validate,
  appointmentController.createAppointment
);

// Planning complet (secrétaire / admin)
router.get('/', protect, authorize('secretaire', 'administrateur'), appointmentController.getAllAppointments);

// Historique des rendez-vous du patient connecté
router.get('/my-appointments', protect, authorize('patient'), appointmentController.getMyAppointments);

// Créneaux disponibles d'un médecin à une date donnée
router.get('/available-slots', protect, authorize('patient', 'secretaire', 'administrateur'), appointmentController.getAvailableSlots);

// Planning journalier du médecin connecté
router.get('/doctor/daily', protect, authorize('medecin'), appointmentController.getDoctorDailySchedule);

// Annuler un rendez-vous
router.patch('/:id/cancel', protect, appointmentController.cancelAppointment);

// Reprogrammer un rendez-vous
router.patch('/:id/reschedule', protect, appointmentController.updateAppointment);

// Bloquer un créneau (indisponibilité médecin)
router.post('/unavailability', protect, authorize('medecin'), appointmentController.setIndisponibilite);

// Confirmer un rendez-vous (secrétaire / admin)
router.patch('/:id/confirm', protect, authorize('secretaire', 'administrateur'), appointmentController.confirmAppointment);

// Marquer no-show (secrétaire / admin)
router.patch('/:id/no-show', protect, authorize('secretaire', 'administrateur'), appointmentController.markNoShow);

module.exports = router;
