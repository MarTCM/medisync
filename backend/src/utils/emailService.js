const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || 'Clinique MediSync <onboarding@resend.dev>';

exports.verifyTransporter = async () => {
  if (!process.env.RESEND_API_KEY) {
    console.error('EMAIL DISABLED — RESEND_API_KEY manquant dans .env');
    return false;
  }
  console.log('Email transporter ready (Resend).');
  return true;
};

exports.sendNotification = async (to, subject, text, attachment = null) => {
  try {
    if (!to) {
      console.warn('sendNotification: no recipient address provided, skipping.');
      return;
    }

    const payload = { from: FROM, to, subject, text };

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
