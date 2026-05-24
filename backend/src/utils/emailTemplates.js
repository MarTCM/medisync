/**
 * Templates HTML des emails transactionnels MediSync.
 *
 * - Chaque fonction retourne { subject, html, text } prêt à passer à sendNotification().
 * - Couvre : confirmation de réservation, modification, confirmation par la secrétaire,
 *   rappels 24h et 1h avant le rendez-vous, envoi de facture (avec PJ PDF).
 * - Utilise un shell HTML commun (table-based pour compatibilité clients mail) et getFacilityInfo() pour le branding.
 */
const { getFacilityInfo } = require('./emailService');

function fmtDate(d) {
  return new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtTime(d) {
  return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function shell(clinicName, bodyContent) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:Inter,Arial,sans-serif;color:#0F172A;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
        <!-- HEADER -->
        <tr>
          <td style="background:#0891B2;padding:28px 32px;text-align:center;">
            <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.3px;">${clinicName}</span>
          </td>
        </tr>
        <!-- BODY -->
        <tr><td style="padding:28px 32px 24px;">${bodyContent}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function infoTable(rows) {
  const rowsHtml = rows.map(([label, value], i) => `
    <tr style="background:${i % 2 === 0 ? '#F8FAFC' : '#ffffff'};">
      <td style="padding:10px 14px;color:#64748B;font-size:13px;width:42%;vertical-align:top;">${label}</td>
      <td style="padding:10px 14px;font-size:14px;font-weight:600;vertical-align:top;">${value}</td>
    </tr>`).join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2E8F0;border-radius:6px;overflow:hidden;margin:20px 0;">${rowsHtml}</table>`;
}

function footer(clinic) {
  const parts = [clinic.name, clinic.address, clinic.contactPhone, clinic.contactEmail].filter(Boolean);
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;border-top:1px solid #E2E8F0;">
      <tr><td style="padding:20px 32px;text-align:center;font-size:12px;color:#64748B;line-height:1.8;">
        <strong style="color:#0891B2;">${parts[0]}</strong><br>
        ${parts.slice(1).join(' &nbsp;·&nbsp; ')}<br>
        <span style="color:#14B8A6;font-size:11px;">Ne pas répondre à cet email</span>
      </td></tr>
    </table>`;
}

function greeting(firstName, lastName) {
  return `<p style="margin:0 0 6px;font-size:15px;font-weight:600;">Bonjour ${firstName} ${lastName},</p>`;
}

// ──────────────────────────────────────────────────────────────
// 1. Booking confirmation
// ──────────────────────────────────────────────────────────────
exports.bookingConfirmationTemplate = async ({ patientFirstName, patientLastName, date, time, duration, reason, notes, doctorName }) => {
  const clinic = await getFacilityInfo();
  const subject = `Confirmation de votre rendez-vous — ${clinic.name}`;

  const body = `
    ${greeting(patientFirstName, patientLastName)}
    <p style="margin:4px 0 0;font-size:14px;color:#64748B;">Votre rendez-vous a bien été enregistré.</p>
    ${infoTable([
      ['Date', fmtDate(new Date(`${date}T${time}`))],
      ['Heure', time],
      ['Durée', `${duration} minutes`],
      ['Motif', reason],
      ['Médecin', doctorName],
      ['Notes', notes || '—'],
    ])}`;

  const html = shell(clinic.name, body) + footer(clinic);
  const text = `Bonjour ${patientFirstName} ${patientLastName}, votre RDV du ${date} à ${time} (${duration} min, ${reason}) avec ${doctorName} a été enregistré.`;

  return { subject, html, text };
};

// ──────────────────────────────────────────────────────────────
// 2. Reschedule notification
// ──────────────────────────────────────────────────────────────
exports.rescheduleNotificationTemplate = async ({ patientFirstName, patientLastName, date, time, duration, reason, doctorName }) => {
  const clinic = await getFacilityInfo();
  const subject = `Modification de votre rendez-vous — ${clinic.name}`;

  const body = `
    ${greeting(patientFirstName, patientLastName)}
    <p style="margin:4px 0 0;font-size:14px;color:#64748B;">Votre rendez-vous a été reprogrammé.</p>
    ${infoTable([
      ['Nouvelle date', fmtDate(new Date(`${date}T${time}`))],
      ['Nouvel horaire', time],
      ['Durée', `${duration} minutes`],
      ['Motif', reason],
      ['Médecin', doctorName],
    ])}`;

  const html = shell(clinic.name, body) + footer(clinic);
  const text = `Bonjour ${patientFirstName} ${patientLastName}, votre RDV a été déplacé au ${date} à ${time} avec ${doctorName}.`;

  return { subject, html, text };
};

// ──────────────────────────────────────────────────────────────
// 3. Secretary confirmation
// ──────────────────────────────────────────────────────────────
exports.secretaryConfirmationTemplate = async ({ patientFirstName, patientLastName, startTime, duration, reason, notes, doctorFirstName, doctorLastName, doctorSpecialties }) => {
  const clinic = await getFacilityInfo();
  const subject = `Votre rendez-vous est confirmé — ${clinic.name}`;
  const doctorName = [doctorFirstName, doctorLastName].filter(Boolean).length
    ? `Dr. ${doctorFirstName} ${doctorLastName}`
    : 'votre médecin';

  const rows = [
    ['Date', fmtDate(startTime)],
    ['Heure', fmtTime(startTime)],
    ['Durée', `${duration} minutes`],
    ['Médecin', doctorName],
  ];
  if (doctorSpecialties?.length) rows.push(['Spécialité', doctorSpecialties.join(', ')]);
  rows.push(['Motif', reason], ['Notes', notes || '—']);

  const badge = `<span style="display:inline-block;background:#DCFCE7;color:#16A34A;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:600;margin-bottom:18px;">Confirmé</span>`;

  const body = `
    ${greeting(patientFirstName, patientLastName)}
    <p style="margin:4px 0 12px;font-size:14px;color:#64748B;">La secrétaire a validé votre rendez-vous.</p>
    ${badge}
    ${infoTable(rows)}`;

  const html = shell(clinic.name, body) + footer(clinic);
  const text = `Bonjour ${patientFirstName} ${patientLastName}, votre RDV du ${fmtDate(startTime)} à ${fmtTime(startTime)} avec ${doctorName} est confirmé.`;

  return { subject, html, text };
};

// ──────────────────────────────────────────────────────────────
// 4. 24h reminder
// ──────────────────────────────────────────────────────────────
exports.reminder24hTemplate = async ({ patientFirstName, patientLastName, startTime, duration, reason, doctorName }) => {
  const clinic = await getFacilityInfo();
  const subject = `Rappel : Votre rendez-vous demain — ${clinic.name}`;

  const banner = `<div style="background:#FEF3C7;border-left:4px solid #F59E0B;padding:12px 16px;border-radius:4px;margin:16px 0 4px;font-size:14px;font-weight:600;color:#92400E;">Dans 24 heures</div>`;

  const body = `
    ${greeting(patientFirstName, patientLastName)}
    <p style="margin:4px 0 0;font-size:14px;color:#64748B;">Vous avez un rendez-vous demain.</p>
    ${banner}
    ${infoTable([
      ['Date', fmtDate(startTime)],
      ['Heure', fmtTime(startTime)],
      ['Durée', `${duration} minutes`],
      ['Motif', reason],
      ['Médecin', doctorName],
    ])}`;

  const html = shell(clinic.name, body) + footer(clinic);
  const text = `Bonjour ${patientFirstName} ${patientLastName}, rappel : RDV demain à ${fmtTime(startTime)} avec ${doctorName}.`;

  return { subject, html, text };
};

// ──────────────────────────────────────────────────────────────
// 5. 1h reminder
// ──────────────────────────────────────────────────────────────
exports.reminder1hTemplate = async ({ patientFirstName, patientLastName, startTime, duration, reason, doctorName }) => {
  const clinic = await getFacilityInfo();
  const subject = `Rappel imminent : Votre rendez-vous dans 1 heure — ${clinic.name}`;

  const banner = `<div style="background:#FEE2E2;border-left:4px solid #EF4444;padding:12px 16px;border-radius:4px;margin:16px 0 4px;font-size:14px;font-weight:600;color:#991B1B;">Dans 1 heure</div>`;

  const body = `
    ${greeting(patientFirstName, patientLastName)}
    <p style="margin:4px 0 0;font-size:14px;color:#64748B;">Votre rendez-vous commence dans une heure.</p>
    ${banner}
    ${infoTable([
      ['Date', fmtDate(startTime)],
      ['Heure', fmtTime(startTime)],
      ['Durée', `${duration} minutes`],
      ['Motif', reason],
      ['Médecin', doctorName],
    ])}`;

  const html = shell(clinic.name, body) + footer(clinic);
  const text = `Bonjour ${patientFirstName} ${patientLastName}, rappel : RDV dans 1 heure à ${fmtTime(startTime)} avec ${doctorName}.`;

  return { subject, html, text };
};

// ──────────────────────────────────────────────────────────────
// 6. Invoice email
// ──────────────────────────────────────────────────────────────
exports.invoiceEmailTemplate = async ({ patientFirstName, patientLastName, invoiceId, amount, nomenclature, issuedAt, doctorFirstName, doctorLastName }) => {
  const clinic = await getFacilityInfo();
  const invoiceShortId = invoiceId.toString().substring(0, 8).toUpperCase();
  const subject = `Votre facture MediSync — N° ${invoiceShortId}`;
  const doctorName = `Dr. ${doctorFirstName} ${doctorLastName}`;

  const invoiceCard = `
    <div style="border:1px solid #E2E8F0;border-top:4px solid #0891B2;border-radius:6px;padding:18px 20px;margin:20px 0;">
      <div style="font-size:12px;color:#64748B;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">N° Facture</div>
      <div style="font-size:18px;font-weight:700;color:#0F172A;font-family:monospace;">${invoiceShortId}</div>
    </div>`;

  const totalRow = `
    <div style="background:#0891B2;color:#ffffff;padding:14px 20px;border-radius:6px;text-align:right;font-size:18px;font-weight:700;margin-top:4px;">
      TOTAL : ${amount} DH
    </div>`;

  const pdfNote = `<p style="font-size:13px;color:#64748B;margin:14px 0 0;">Le PDF de votre facture est joint à cet email.</p>`;

  const body = `
    ${greeting(patientFirstName, patientLastName)}
    <p style="margin:4px 0 0;font-size:14px;color:#64748B;">Veuillez trouver ci-joint votre facture.</p>
    ${invoiceCard}
    ${infoTable([
      ["Date d'émission", fmtDate(issuedAt)],
      ['Médecin', doctorName],
      ['Acte médical', nomenclature],
    ])}
    ${totalRow}
    ${pdfNote}`;

  const html = shell(clinic.name, body) + footer(clinic);
  const text = `Bonjour ${patientFirstName} ${patientLastName}, votre facture N°${invoiceShortId} d'un montant de ${amount} DH (acte : ${nomenclature}) par ${doctorName} est jointe à cet email.`;

  return { subject, html, text };
};
