const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const invoiceController = require('../controllers/invoiceController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const validate = require('../middleware/validate');

// Créer une facture
router.post('/',
  protect,
  authorize('secretaire', 'administrateur'),
  body('appointmentId').notEmpty().withMessage('ID rendez-vous requis.'),
  body('patientId').notEmpty().withMessage('ID patient requis.'),
  body('doctorId').notEmpty().withMessage('ID médecin requis.'),
  body('amount').isNumeric({ min: 0 }).withMessage('Montant invalide.'),
  body('nomenclature').notEmpty().withMessage('Nomenclature requise.'),
  validate,
  invoiceController.createInvoice
);

// Mes factures (patient connecté)
router.get('/mine', protect, authorize('patient'), invoiceController.listByPatient);

// Toutes les factures (secrétaire / admin)
router.get('/', protect, authorize('secretaire', 'administrateur'), invoiceController.listAll);

// Factures impayées / en attente > 30 jours
router.get('/overdue', protect, authorize('secretaire', 'administrateur'), invoiceController.listOverdue);

// Télécharger une facture en PDF
router.get('/:id/pdf', protect, authorize('secretaire', 'administrateur', 'patient'), invoiceController.generateInvoicePDF);

// Télécharger la feuille de soins (formulaire Sécu)
router.get('/:id/feuille-soins', protect, authorize('secretaire', 'administrateur'), invoiceController.generateFeuilleSoinsPDF);

// Envoyer la facture PDF par email au patient
router.post('/:id/send-email', protect, authorize('secretaire', 'administrateur'), invoiceController.sendInvoiceEmail);

// Marquer une facture comme payée
router.patch('/:id/pay', protect, authorize('secretaire', 'administrateur'), invoiceController.markPaid);

module.exports = router;
