const cron = require('node-cron');
const Appointment = require('../models/Appointment');
const { sendNotification } = require('./emailService');
const { reminder24hTemplate, reminder1hTemplate } = require('./emailTemplates');

// Toutes les heures, vérifier les rendez-vous imminents
cron.schedule('0 * * * *', async () => {
  const now = new Date();

  // Rappel 24h avant (fenêtre de ±30 minutes pour l'exécution horaire)
  const target24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const windowStart24h = new Date(target24h.getTime() - 30 * 60 * 1000);
  const windowEnd24h = new Date(target24h.getTime() + 30 * 60 * 1000);

  try {
    const appointments24h = await Appointment.find({
      startTime: { $gte: windowStart24h, $lte: windowEnd24h },
      status: 'confirmé'
    })
      .populate({ path: 'patient', populate: { path: 'account', select: 'email' } })
      .populate('doctor', 'firstName lastName');

    for (const app of appointments24h) {
      const email = app.patient?.account?.email;
      if (email) {
        const doctorName = app.doctor ? `Dr. ${app.doctor.firstName} ${app.doctor.lastName}` : 'votre médecin';
        reminder24hTemplate({
          patientFirstName: app.patient.firstName,
          patientLastName:  app.patient.lastName,
          startTime: app.startTime,
          duration:  app.duration,
          reason:    app.reason,
          doctorName,
        }).then(({ subject, html, text }) => sendNotification(email, subject, text, null, html))
          .catch(err => console.error("Erreur rappel 24h:", err.message));
      }
    }
  } catch (err) {
    console.error("Erreur cron rappels 24h:", err.message);
  }

  // Rappel 1h avant
  const target1h = new Date(now.getTime() + 60 * 60 * 1000);
  const windowStart1h = new Date(target1h.getTime() - 30 * 60 * 1000);
  const windowEnd1h = new Date(target1h.getTime() + 30 * 60 * 1000);

  try {
    const appointments1h = await Appointment.find({
      startTime: { $gte: windowStart1h, $lte: windowEnd1h },
      status: 'confirmé'
    })
      .populate({ path: 'patient', populate: { path: 'account', select: 'email' } })
      .populate('doctor', 'firstName lastName');

    for (const app of appointments1h) {
      const email = app.patient?.account?.email;
      if (email) {
        const doctorName = app.doctor ? `Dr. ${app.doctor.firstName} ${app.doctor.lastName}` : 'votre médecin';
        reminder1hTemplate({
          patientFirstName: app.patient.firstName,
          patientLastName:  app.patient.lastName,
          startTime: app.startTime,
          duration:  app.duration,
          reason:    app.reason,
          doctorName,
        }).then(({ subject, html, text }) => sendNotification(email, subject, text, null, html))
          .catch(err => console.error("Erreur rappel 1h:", err.message));
      }
    }
  } catch (err) {
    console.error("Erreur cron rappels 1h:", err.message);
  }
});
