/**
 * Service email — envoi de notifications via Resend.
 *
 * - sendNotification(to, subject, text, attachment?, html?) envoie un email (avec PJ facultative).
 * - getFacilityInfo() lit (et met en cache) les coordonnées de la clinique pour personnaliser les emails.
 * - verifyTransporter() est appelé au démarrage du serveur pour signaler une clé RESEND_API_KEY manquante.
 * - Les erreurs d'envoi sont loguées mais ne bloquent jamais la requête HTTP appelante.
 */
const { Resend } = require('resend');
const Facility = require('../models/Facility');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || 'Clinique MediSync <onboarding@resend.dev>';

let _facilityCache = null;

exports.getFacilityInfo = async () => {
  if (!_facilityCache) {
    const f = await Facility.findOne();
    _facilityCache = {
      name:         f?.name         || 'Clinique MediSync',
      address:      f?.address      || '',
      contactPhone: f?.contactPhone || '',
      contactEmail: f?.contactEmail || '',
    };
  }
  return _facilityCache;
};

exports.verifyTransporter = async () => {
  if (!process.env.RESEND_API_KEY) {
    console.error('EMAIL DISABLED — RESEND_API_KEY manquant dans .env');
    return false;
  }
  console.log('Email transporter ready (Resend).');
  return true;
};

exports.sendNotification = async (to, subject, text, attachment = null, html = null) => {
  try {
    if (!to) {
      console.warn('sendNotification: no recipient address provided, skipping.');
      return;
    }

    const payload = { from: FROM, to, subject, text };

    if (html) payload.html = html;

    if (attachment) {
      payload.attachments = [{
        filename: attachment.filename,
        content: attachment.content,
      }];
    }

    const { data, error } = await resend.emails.send(payload);
    if (error) {
      console.error('Erreur envoi email (Resend):', error.message || error);
      return;
    }
    console.log(`Email envoyé à : ${to} (id=${data?.id})`);
  } catch (err) {
    console.error('Erreur envoi email:', err.message);
  }
};
