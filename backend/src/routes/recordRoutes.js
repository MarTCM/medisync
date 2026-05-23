const express = require('express');
const router = express.Router();
const recordController = require('../controllers/recordController');

const auth = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const upload = require('../middleware/upload');

// Médecin : ajouter une consultation au dossier
router.post('/', auth.protect, authorize('medecin'), recordController.addConsultation);

// Patient : mettre à jour ses antécédents et allergies
router.patch('/my-record', auth.protect, authorize('patient'), recordController.updateMyRecord);

// Patient : téléverser un document médical
router.post('/upload', auth.protect, authorize('patient'), upload.single('document'), recordController.uploadDocument);

// Médecin : téléverser un document dans le dossier d'un patient spécifique
router.post('/upload/:patientId', auth.protect, authorize('medecin'), upload.single('document'), recordController.uploadDocumentForPatient);

// Patient : consulter son propre dossier
router.get('/my-record', auth.protect, authorize('patient'), recordController.getMyRecord);

// Patient : télécharger le PDF d'une ordonnance
router.get('/my-record/consultations/:consultationId/prescription/pdf', auth.protect, authorize('patient'), recordController.generatePrescriptionPDF);

// Médecin / secrétaire / admin : accéder au dossier d'un patient
router.get('/patient/:patientId', auth.protect, authorize('medecin', 'secretaire', 'administrateur'), recordController.getPatientRecord);

module.exports = router;