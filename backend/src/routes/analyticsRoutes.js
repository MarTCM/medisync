/**
 * Routes /api/analytics — indicateurs de performance et exports.
 *
 * - Réservées à l'administrateur (KPI globaux, ventilation du chiffre d'affaires).
 * - Exposent les exports PDF (PDFKit) et Excel (ExcelJS) pour les rapports d'activité.
 * - Tableaux et graphiques côté frontend (Chart.js) consomment ces endpoints.
 */
const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

// Tous les endpoints analytics réservés à l'administrateur
router.get('/kpis', protect, authorize('administrateur'), analyticsController.kpis);
router.get('/revenue', protect, authorize('administrateur'), analyticsController.revenueBreakdown);
router.get('/export.pdf', protect, authorize('administrateur'), analyticsController.exportPdf);
router.get('/export.xlsx', protect, authorize('administrateur'), analyticsController.exportExcel);

module.exports = router;
