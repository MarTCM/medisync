/**
 * Routes /api/reviews — avis patients après consultation.
 *
 * - POST / : seul un patient peut déposer un avis ; un seul avis par rendez-vous (contrainte unique sur le modèle Review).
 */
const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/role');

// Un patient laisse un avis après sa consultation
router.post('/', auth.protect, authorize('patient'), reviewController.createReview);

module.exports = router;