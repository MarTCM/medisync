/**
 * server.js — Point d'entrée de l'API Express MediSync.
 *
 * - Initialise Express, CORS (autorise l'URL frontend du .env), parser JSON et journalisation Morgan.
 * - Connecte MongoDB via config/db et lance le planificateur de rappels horaire (utils/reminderScheduler).
 * - Monte tous les routeurs métiers sous /api/* (admin, auth, appointments, records, doctors, reviews, invoices, facility, analytics).
 * - Sert les fichiers téléversés depuis /uploads (créé automatiquement si absent).
 * - Expose un endpoint de santé /health et des handlers globaux 404 / 500.
 * - Vérifie au démarrage que le transport email Resend est configuré (RESEND_API_KEY).
 */
require('dns').setDefaultResultOrder('ipv4first');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const connectDB = require('./src/config/db');
const { verifyTransporter } = require('./src/utils/emailService');

// Ensure uploads directory exists (multer crashes if missing)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Routes
const adminRoutes = require('./src/routes/adminRoutes');
const appointmentRoutes = require('./src/routes/appointmentRoutes');
const authRoutes = require('./src/routes/authRoutes');
const recordRoutes = require('./src/routes/recordRoutes');
const doctorRoutes = require('./src/routes/doctorRoutes');
const reviewRoutes = require('./src/routes/reviewRoutes');
const invoiceRoutes = require('./src/routes/invoiceRoutes');
const facilityRoutes = require('./src/routes/facilityRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');

connectDB();

// Cron reminder scheduler (hourly)
require('./src/utils/reminderScheduler');

const app = express();

// Global middleware
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:4200' }));
app.use(express.json());
app.use(morgan('dev'));

// Static file serving for uploaded documents
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// API routes
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/facility', facilityRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ message: 'Route non trouvée' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Erreur serveur', error: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
  const emailOk = await verifyTransporter();
  if (!emailOk) {
    console.error('============================================');
    console.error(' EMAIL DISABLED — add RESEND_API_KEY to .env');
    console.error('============================================');
  }
});
