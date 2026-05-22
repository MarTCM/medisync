const PDFDocument = require('pdfkit');
const Invoice = require('../models/Invoice');
const PatientProfile = require('../models/PatientProfile');
const { sendNotification } = require('../utils/emailService');

// ==========================================
// 1. CRÉER UNE FACTURE (Indispensable pour tester)
// ==========================================
exports.createInvoice = async (req, res) => {
    try {
        const { appointmentId, patientId, doctorId, amount, nomenclature } = req.body;

        const existing = await Invoice.findOne({ appointment: appointmentId });
        if (existing) {
          return res.status(409).json({ message: "Une facture existe déjà pour ce rendez-vous.", invoice: existing });
        }

        const newInvoice = await Invoice.create({
            appointment: appointmentId,
            patient: patientId,
            doctor: doctorId,
            amount: Number(amount),
            nomenclature: nomenclature,
            status: 'en attente'
        });

        res.status(201).json({ message: "Facture créée avec succès", invoice: newInvoice });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ message: "Identifiant invalide fourni (rendez-vous, patient ou médecin).", error: error.message });
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: "Données invalides.", error: error.message });
        }
        console.error('createInvoice error:', error);
        res.status(500).json({ message: "Erreur lors de la création de la facture", error: error.message });
    }
};

// ==========================================
// 2. TÉLÉCHARGER LE PDF (Votre fonction, pour impression)
// ==========================================
exports.generateInvoicePDF = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('patient', 'firstName lastName')
      .populate('doctor', 'firstName lastName');

    if (!invoice) return res.status(404).json({ message: "Facture introuvable." });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="facture_MediSync_${invoice._id}.pdf"`);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    // --- DESSIN DU PDF ---
    doc.fontSize(20).font('Helvetica-Bold').text('CLINIQUE MEDISYNC', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('Helvetica').text('Adresse de la clinique, Tétouan', { align: 'center' });
    doc.text('Téléphone : +212 5 39 XX XX XX', { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(16).font('Helvetica-Bold').text(`FACTURE N° ${invoice._id.toString().substring(0, 8).toUpperCase()}`);
    doc.fontSize(12).font('Helvetica').text(`Date d'émission : ${invoice.issuedAt.toLocaleDateString()}`);
    doc.text(`Statut : ${invoice.status.toUpperCase()}`);
    doc.moveDown();
    doc.text(`Patient : ${invoice.patient.firstName} ${invoice.patient.lastName}`);
    doc.text(`Médecin traitant : Dr. ${invoice.doctor.firstName} ${invoice.doctor.lastName}`);
    doc.moveDown(2);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();
    doc.font('Helvetica-Bold').text('Description de l\'acte', 50, doc.y, { continued: true });
    doc.text('Montant', { align: 'right' });
    doc.moveDown(0.5);
    doc.font('Helvetica');
    doc.text(invoice.nomenclature, 50, doc.y, { continued: true });
    doc.text(`${invoice.amount} DH`, { align: 'right' });
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(2);
    doc.font('Helvetica-Bold').fontSize(14).text(`TOTAL À PAYER : ${invoice.amount} DH`, { align: 'right' });
    doc.moveDown(3);
    doc.fontSize(10).font('Helvetica-Oblique').text('Merci de votre confiance. Pour toute question, contactez le secrétariat.', { align: 'center' });
    
    doc.end();
  } catch (error) {
    if (!res.headersSent) res.status(500).json({ error: error.message });
  }
};

// ==========================================
// 3. ENVOYER LA FACTURE PAR EMAIL (La nouveauté)
// ==========================================
exports.sendInvoiceEmail = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate({ path: 'patient', populate: { path: 'account', select: 'email' } })
      .populate('doctor', 'firstName lastName');

    if (!invoice) return res.status(404).json({ message: "Facture introuvable." });

    const patientEmail = invoice.patient?.account?.email;
    if (!patientEmail) return res.status(400).json({ message: "Email du patient introuvable." });

    const doc = new PDFDocument({ margin: 50 });
    const buffers = []; 

    // On stocke le PDF en mémoire au lieu de l'envoyer au navigateur
    doc.on('data', buffers.push.bind(buffers));
    
    doc.on('end', async () => {
      const pdfData = Buffer.concat(buffers);
      
      const pdfAttachment = {
        filename: `Facture_MediSync_${invoice._id}.pdf`,
        content: pdfData,
        contentType: 'application/pdf'
      };

      try {
        await sendNotification(
          patientEmail,
          "Votre facture MediSync",
          `Bonjour ${invoice.patient.firstName},\n\nVeuillez trouver ci-joint votre facture.\n\nCordialement,\nClinique MediSync.`,
          pdfAttachment
        );
        res.status(200).json({ message: "Facture générée et envoyée par email avec succès !" });
      } catch (emailErr) {
        res.status(500).json({ message: "Erreur lors de l'envoi de l'email", error: emailErr.message });
      }
    });

    // --- DESSIN DU PDF (Le même design que la fonction précédente) ---
    doc.fontSize(20).font('Helvetica-Bold').text('CLINIQUE MEDISYNC', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text(`FACTURE N° ${invoice._id.toString().substring(0, 8).toUpperCase()}`);
    doc.fontSize(12).font('Helvetica').text(`Date d'émission : ${invoice.issuedAt.toLocaleDateString()}`);
    doc.moveDown();
    doc.text(`Patient : ${invoice.patient.firstName} ${invoice.patient.lastName}`);
    doc.text(`Médecin traitant : Dr. ${invoice.doctor.firstName} ${invoice.doctor.lastName}`);
    doc.moveDown(2);
    doc.text(`Acte : ${invoice.nomenclature}`);
    doc.text(`Montant : ${invoice.amount} DH`);
    doc.moveDown(2);
    doc.font('Helvetica-Bold').fontSize(14).text(`TOTAL À PAYER : ${invoice.amount} DH`, { align: 'right' });
    
    doc.end();

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ==========================================
// 4. MARQUER COMME PAYÉ
// ==========================================
exports.markPaid = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { status: 'payé', paidAt: new Date() },
      { new: true }
    );
    if (!invoice) return res.status(404).json({ message: "Facture introuvable." });
    res.status(200).json({ message: "Facture marquée comme payée.", invoice });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// ==========================================
// 5. FACTURES DU PATIENT CONNECTÉ
// ==========================================
exports.listByPatient = async (req, res) => {
  try {
    const patientProfile = await PatientProfile.findOne({ account: req.user.id });
    if (!patientProfile) return res.status(404).json({ message: "Profil patient introuvable." });

    const invoices = await Invoice.find({ patient: patientProfile._id })
      .populate('doctor', 'firstName lastName')
      .sort({ issuedAt: -1 });

    res.status(200).json({ invoices });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// ==========================================
// 5b. TOUTES LES FACTURES (secrétaire / admin)
// ==========================================
exports.listAll = async (req, res) => {
  try {
    const invoices = await Invoice.find()
      .populate('patient', 'firstName lastName')
      .populate('doctor', 'firstName lastName')
      .sort({ issuedAt: -1 });
    res.status(200).json({ invoices });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// ==========================================
// 6bis. FEUILLE DE SOINS PDF (formulaire Sécu)
// ==========================================
exports.generateFeuilleSoinsPDF = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate({ path: 'patient', populate: { path: 'account', select: 'email socialSecurityNumber' } })
      .populate({ path: 'doctor',  populate: { path: 'account', select: 'email' } });

    if (!invoice) return res.status(404).json({ message: "Facture introuvable." });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="feuille_soins_${invoice._id}.pdf"`);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(res);

    // Header
    doc.fontSize(16).font('Helvetica-Bold').text('FEUILLE DE SOINS', { align: 'center' });
    doc.fontSize(10).font('Helvetica-Oblique').text('Document à transmettre à l\'organisme d\'assurance maladie', { align: 'center' });
    doc.moveDown(1);

    // Box helper
    const drawBox = (label, value, x, y, w, h) => {
      doc.lineWidth(0.7).rect(x, y, w, h).stroke();
      doc.fontSize(7.5).font('Helvetica').fillColor('#555').text(label, x + 4, y + 3, { width: w - 8 });
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#000').text(value || '—', x + 4, y + 14, { width: w - 8 });
    };

    let y = doc.y;

    // Section 1: Assuré / Patient
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#000').text('1. Identification de l\'assuré', 40, y);
    y += 16;
    const ssn = invoice.patient?.account?.socialSecurityNumber || 'Non renseigné';
    drawBox('Nom et prénom', `${invoice.patient?.lastName || ''} ${invoice.patient?.firstName || ''}`.trim(), 40, y, 340, 32);
    drawBox('N° sécurité sociale', ssn, 385, y, 170, 32);
    y += 40;

    // Section 2: Médecin
    doc.fontSize(11).font('Helvetica-Bold').text('2. Identification du praticien', 40, y);
    y += 16;
    drawBox('Médecin', `Dr. ${invoice.doctor?.firstName || ''} ${invoice.doctor?.lastName || ''}`.trim(), 40, y, 250, 32);
    drawBox('N° identifiant (NAM)', String(invoice.doctor?._id || '').slice(0, 12).toUpperCase(), 295, y, 130, 32);
    drawBox('Secteur', String(invoice.doctor?.sector || '1'), 430, y, 125, 32);
    y += 40;

    // Section 3: Acte
    doc.fontSize(11).font('Helvetica-Bold').text('3. Acte(s) réalisé(s)', 40, y);
    y += 16;
    doc.lineWidth(0.7).rect(40, y, 515, 60).stroke();
    doc.fontSize(8).fillColor('#555').font('Helvetica');
    doc.text('Date', 46, y + 4);
    doc.text('Code (nomenclature)', 110, y + 4);
    doc.text('Désignation', 240, y + 4);
    doc.text('Montant', 480, y + 4, { width: 70, align: 'right' });
    doc.lineWidth(0.3).moveTo(40, y + 18).lineTo(555, y + 18).stroke();
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#000');
    const dateStr = invoice.issuedAt ? invoice.issuedAt.toLocaleDateString('fr-FR') : '';
    doc.text(dateStr, 46, y + 24);
    const code = (invoice.nomenclature || 'CS').split('—')[0].trim().slice(0, 16);
    doc.text(code, 110, y + 24);
    doc.text(invoice.nomenclature || 'Consultation', 240, y + 24, { width: 230 });
    doc.text(`${invoice.amount} DH`, 480, y + 24, { width: 70, align: 'right' });
    y += 68;

    // Section 4: Total
    doc.lineWidth(0.7).rect(40, y, 515, 30).fillAndStroke('#f1f5f9', '#000');
    doc.fillColor('#000').fontSize(12).font('Helvetica-Bold');
    doc.text('TOTAL HONORAIRES', 50, y + 10);
    doc.text(`${invoice.amount} DH`, 40, y + 10, { width: 510, align: 'right' });
    y += 40;

    // Signature
    doc.fontSize(9).font('Helvetica').fillColor('#000');
    doc.text('Signature de l\'assuré :', 40, y + 12);
    doc.lineWidth(0.5).moveTo(155, y + 24).lineTo(280, y + 24).stroke();
    doc.text('Signature et cachet du praticien :', 320, y + 12);
    doc.lineWidth(0.5).moveTo(465, y + 24).lineTo(555, y + 24).stroke();

    // Footer
    doc.fontSize(8).font('Helvetica-Oblique').fillColor('#666')
      .text(`Émis par MediSync le ${new Date().toLocaleDateString('fr-FR')} — Document de référence n° ${String(invoice._id).slice(-8).toUpperCase()}`,
        40, 780, { align: 'center', width: 515 });

    doc.end();
  } catch (error) {
    if (!res.headersSent) res.status(500).json({ message: "Erreur génération feuille de soins", error: error.message });
  }
};

// ==========================================
// 6. FACTURES EN RETARD (> 30 jours impayées)
// ==========================================
exports.listOverdue = async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const invoices = await Invoice.find({
      status: { $in: ['en attente', 'impayé'] },
      issuedAt: { $lt: cutoff }
    })
      .populate('patient', 'firstName lastName')
      .populate('doctor', 'firstName lastName')
      .sort({ issuedAt: 1 });

    res.status(200).json({ total: invoices.length, invoices });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};