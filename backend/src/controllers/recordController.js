const MedicalRecord = require('../models/MedicalRecord');
const DoctorProfile = require('../models/DoctorProfile');
const Appointment = require('../models/Appointment');
const PatientProfile = require('../models/PatientProfile');
const PDFDocument = require('pdfkit');
const { logAudit } = require('../utils/auditLogger');

// 1. Ajouter une consultation au dossier médical (Médecin)
exports.addConsultation = async (req, res) => {
  try {
    const { patientId, appointmentId, report, prescriptions } = req.body;

    const doctorProfile = await DoctorProfile.findOne({ account: req.user.id });
    if (!doctorProfile) {
      return res.status(404).json({ message: "Profil médecin introuvable." });
    }

    const cleanPrescriptions = (prescriptions || []).filter(p => p.medication && p.medication.trim());

    const newConsultation = {
      appointmentId,
      doctorId: doctorProfile._id,
      report,
      prescriptions: cleanPrescriptions
    };

    let record = await MedicalRecord.findOne({ patient: patientId });

    if (record) {
      record.consultations.push(newConsultation);
      await record.save();
    } else {
      record = await MedicalRecord.create({
        patient: patientId,
        consultations: [newConsultation]
      });
    }

    if (appointmentId) {
      await Appointment.findByIdAndUpdate(appointmentId, { status: 'terminé' });
    }

    await logAudit('MODIFICATION_DOSSIER', req, patientId, `Consultation ajoutée par le Dr.`);

    res.status(200).json({
      message: "La consultation a été ajoutée avec succès au dossier médical.",
      record
    });

  } catch (error) {
    console.error('[addConsultation] error:', error.message, error.errors ? JSON.stringify(error.errors) : '');
    res.status(500).json({ message: "Erreur lors de l'ajout au dossier", error: error.message });
  }
};

// 2. Téléverser un document médical
exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Aucun fichier n'a été fourni." });
    }

    const patientProfile = await PatientProfile.findOne({ account: req.user.id });
    if (!patientProfile) {
      return res.status(404).json({ message: "Profil patient introuvable." });
    }

    let record = await MedicalRecord.findOne({ patient: patientProfile._id });

    if (!record) {
      record = await MedicalRecord.create({
        patient: patientProfile._id,
        attachments: []
      });
    }

    const newAttachment = {
      fileUrl: req.file.filename,
      fileName: req.file.originalname,
      fileType: req.file.originalname.split('.').pop().toUpperCase(),
      uploadedBy: req.user.id
    };

    record.attachments.push(newAttachment);
    await record.save();

    res.status(201).json({
      message: "Document ajouté avec succès au dossier médical.",
      attachment: newAttachment
    });

  } catch (error) {
    res.status(500).json({ message: "Erreur lors du téléversement", error: error.message });
  }
};

// 2b. Téléverser un document dans le dossier d'un patient (Médecin)
exports.uploadDocumentForPatient = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Aucun fichier n'a été fourni." });
    }

    const { patientId } = req.params;
    let record = await MedicalRecord.findOne({ patient: patientId });

    if (!record) {
      record = await MedicalRecord.create({ patient: patientId, attachments: [] });
    }

    const newAttachment = {
      fileUrl: req.file.filename,
      fileName: req.file.originalname,
      fileType: req.file.originalname.split('.').pop().toUpperCase(),
      uploadedBy: req.user.id
    };

    record.attachments.push(newAttachment);
    await record.save();

    res.status(201).json({
      message: "Document ajouté au dossier du patient.",
      attachment: newAttachment
    });

  } catch (error) {
    res.status(500).json({ message: "Erreur lors du téléversement", error: error.message });
  }
};

// 3. Récupérer son propre dossier médical (Patient)
exports.getMyRecord = async (req, res) => {
  try {
    const patientProfile = await PatientProfile.findOne({ account: req.user.id });
    if (!patientProfile) {
      return res.status(404).json({ message: "Profil patient introuvable." });
    }

    const record = await MedicalRecord.findOne({ patient: patientProfile._id })
      .populate('consultations.doctorId', 'firstName lastName specialties');

    if (!record) {
      return res.status(404).json({ message: "Aucun dossier médical trouvé. Vous n'avez pas encore consulté." });
    }

    await logAudit('ACCES_DOSSIER', req, patientProfile._id, `Patient a consulté son dossier médical`);

    res.status(200).json({
      message: "Dossier médical récupéré avec succès",
      record
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération du dossier", error: error.message });
  }
};

// 3b. Mettre à jour ses antécédents et allergies (Patient)
exports.updateMyRecord = async (req, res) => {
  try {
    const patientProfile = await PatientProfile.findOne({ account: req.user.id });
    if (!patientProfile) {
      return res.status(404).json({ message: "Profil patient introuvable." });
    }

    const { history, allergies } = req.body;
    const update = {};
    if (Array.isArray(history)) update.history = history.map(s => String(s).trim()).filter(Boolean);
    if (Array.isArray(allergies)) update.allergies = allergies.map(s => String(s).trim()).filter(Boolean);

    const record = await MedicalRecord.findOneAndUpdate(
      { patient: patientProfile._id },
      { $set: update },
      { new: true, upsert: true, populate: { path: 'consultations.doctorId', select: 'firstName lastName specialties' } }
    );

    await logAudit('MODIFICATION_DOSSIER', req, patientProfile._id, 'Patient a mis à jour ses antécédents/allergies');

    res.status(200).json({ message: "Dossier mis à jour.", record });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la mise à jour du dossier", error: error.message });
  }
};

// 4. Récupérer le dossier d'un patient (Médecin / Secrétaire / Admin)
exports.getPatientRecord = async (req, res) => {
  try {
    const { patientId } = req.params;
    const record = await MedicalRecord.findOne({ patient: patientId })
      .populate('consultations.doctorId', 'firstName lastName specialties');

    if (!record) {
      return res.status(404).json({ message: "Aucun dossier médical trouvé pour ce patient." });
    }

    res.status(200).json({ record });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération du dossier", error: error.message });
  }
};

// 5. Générer le PDF d'une ordonnance
exports.generatePrescriptionPDF = async (req, res) => {
  try {
    const { consultationId } = req.params;

    let patientProfile;

    // Patient connecté ou staff récupérant pour un patient
    if (req.user.role === 'patient') {
      patientProfile = await PatientProfile.findOne({ account: req.user.id });
    } else if (req.query.patientId) {
      patientProfile = await PatientProfile.findById(req.query.patientId);
    }

    if (!patientProfile) {
      return res.status(404).json({ message: "Profil patient introuvable." });
    }

    const record = await MedicalRecord.findOne({ patient: patientProfile._id })
      .populate('consultations.doctorId');

    if (!record) return res.status(404).json({ message: "Dossier introuvable." });

    const consultation = record.consultations.id(consultationId);

    if (!consultation || !consultation.prescriptions || consultation.prescriptions.length === 0) {
      return res.status(404).json({ message: "Aucune prescription trouvée pour cette consultation." });
    }

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Ordonnance-${consultationId}.pdf`);

    doc.pipe(res);

    doc.fontSize(20).font('Helvetica-Bold').text('CLINIQUE MEDISYNC', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).font('Helvetica').text(`Médecin : Dr. ${consultation.doctorId.firstName} ${consultation.doctorId.lastName}`);
    doc.text(`Spécialité : ${consultation.doctorId.specialties.join(', ')}`);
    doc.moveDown();

    doc.text(`Patient : ${patientProfile.firstName} ${patientProfile.lastName}`, { align: 'right' });
    doc.text(`Date : ${new Date(consultation.date).toLocaleDateString('fr-FR')}`, { align: 'right' });
    doc.moveDown(2);

    doc.fontSize(16).font('Helvetica-Bold').text('PRESCRIPTION MÉDICALE', { underline: true });
    doc.moveDown();

    doc.fontSize(12).font('Helvetica');
    consultation.prescriptions.forEach((item, index) => {
      doc.font('Helvetica-Bold').text(`${index + 1}. ${item.medication}`);
      doc.font('Helvetica').text(`   Posologie : ${item.dosage}`);
      doc.text(`   Durée : ${item.duration}`);
      doc.moveDown();
    });

    doc.moveDown(3);
    doc.text('Signature du médecin :', { align: 'right' });

    doc.end();

  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la génération du PDF", error: error.message });
  }
};
