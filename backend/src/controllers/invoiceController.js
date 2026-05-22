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