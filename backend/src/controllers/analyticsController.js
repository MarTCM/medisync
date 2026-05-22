const Appointment = require('../models/Appointment');
const Invoice = require('../models/Invoice');
const DoctorProfile = require('../models/DoctorProfile');
const PatientProfile = require('../models/PatientProfile');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { logAudit } = require('../utils/auditLogger');

// Indicateurs clés de performance
exports.kpis = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalAppointmentsMonth,
      noShowCount,
      totalConfirmed,
      consultationsPerDoctor,
      revenueByMonth,
      totalPatients
    ] = await Promise.all([
      Appointment.countDocuments({ startTime: { $gte: startOfMonth }, status: { $ne: 'annulé' } }),
      Appointment.countDocuments({ startTime: { $gte: startOfMonth }, status: 'no-show' }),
      Appointment.countDocuments({ startTime: { $gte: startOfMonth }, status: { $in: ['confirmé', 'terminé', 'no-show'] } }),
      Appointment.aggregate([
        { $match: { status: 'terminé', startTime: { $gte: startOfMonth } } },
        { $group: { _id: '$doctor', count: { $sum: 1 } } },
        { $lookup: { from: 'doctorprofiles', localField: '_id', foreignField: '_id', as: 'doctor' } },
        { $unwind: '$doctor' },
        { $project: { _id: 0, doctorName: { $concat: ['$doctor.firstName', ' ', '$doctor.lastName'] }, count: 1 } },
        { $sort: { count: -1 } }
      ]),
      Invoice.aggregate([
        { $match: { status: 'payé' } },
        { $group: { _id: { year: { $year: '$issuedAt' }, month: { $month: '$issuedAt' } }, total: { $sum: '$amount' } } },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 12 }
      ]),
      PatientProfile.countDocuments()
    ]);

    const noShowRate = totalConfirmed > 0 ? ((noShowCount / totalConfirmed) * 100).toFixed(1) : 0;

    res.status(200).json({
      totalAppointmentsMonth,
      noShowCount,
      noShowRate: `${noShowRate}%`,
      consultationsPerDoctor,
      revenueByMonth,
      totalPatients
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors du calcul des KPIs", error: error.message });
  }
};

// Détail des revenus par médecin
exports.revenueBreakdown = async (req, res) => {
  try {
    const breakdown = await Invoice.aggregate([
      { $match: { status: 'payé' } },
      {
        $group: {
          _id: { doctor: '$doctor', year: { $year: '$issuedAt' }, month: { $month: '$issuedAt' } },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $lookup: { from: 'doctorprofiles', localField: '_id.doctor', foreignField: '_id', as: 'doctor' } },
      { $unwind: '$doctor' },
      {
        $project: {
          _id: 0,
          doctorName: { $concat: ['$doctor.firstName', ' ', '$doctor.lastName'] },
          year: '$_id.year',
          month: '$_id.month',
          total: 1,
          count: 1
        }
      },
      { $sort: { year: -1, month: -1, total: -1 } }
    ]);

    res.status(200).json({ breakdown });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors du calcul des revenus", error: error.message });
  }
};

// Export PDF du rapport analytique
exports.exportPdf = async (req, res) => {
  try {
    await logAudit('EXPORT_DONNEES', req, null, 'Export rapport analytique PDF');

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalMonth, noShowCount, totalConfirmed, revenueResult] = await Promise.all([
      Appointment.countDocuments({ startTime: { $gte: startOfMonth }, status: { $ne: 'annulé' } }),
      Appointment.countDocuments({ startTime: { $gte: startOfMonth }, status: 'no-show' }),
      Appointment.countDocuments({ startTime: { $gte: startOfMonth }, status: { $in: ['confirmé', 'terminé', 'no-show'] } }),
      Invoice.aggregate([{ $match: { status: 'payé', issuedAt: { $gte: startOfMonth } } }, { $group: { _id: null, total: { $sum: '$amount' } } }])
    ]);

    const noShowRate = totalConfirmed > 0 ? ((noShowCount / totalConfirmed) * 100).toFixed(1) : 0;
    const revenue = revenueResult[0]?.total || 0;

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Rapport-Analytics-${now.toISOString().slice(0, 7)}.pdf`);
    doc.pipe(res);

    doc.fontSize(20).font('Helvetica-Bold').text('RAPPORT ANALYTIQUE — MEDISYNC', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).font('Helvetica').text(`Période : ${startOfMonth.toLocaleDateString('fr-FR')} — ${now.toLocaleDateString('fr-FR')}`, { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(14).font('Helvetica-Bold').text('Indicateurs Clés du Mois');
    doc.moveDown();
    doc.fontSize(12).font('Helvetica');
    doc.text(`Total rendez-vous : ${totalMonth}`);
    doc.text(`Taux de no-show : ${noShowRate}%`);
    doc.text(`Revenus encaissés : ${revenue} DH`);
    doc.moveDown(3);
    doc.fontSize(10).font('Helvetica-Oblique').text(`Rapport généré le ${now.toLocaleDateString('fr-FR')}`, { align: 'right' });

    doc.end();
  } catch (error) {
    if (!res.headersSent) res.status(500).json({ message: "Erreur génération PDF", error: error.message });
  }
};

// Export Excel du rapport analytique
exports.exportExcel = async (req, res) => {
  try {
    await logAudit('EXPORT_DONNEES', req, null, 'Export rapport analytique Excel');

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [consultationsPerDoctor, revenueByMonth, recentInvoices] = await Promise.all([
      Appointment.aggregate([
        { $match: { status: 'terminé' } },
        { $group: { _id: '$doctor', count: { $sum: 1 } } },
        { $lookup: { from: 'doctorprofiles', localField: '_id', foreignField: '_id', as: 'doctor' } },
        { $unwind: '$doctor' },
        { $project: { _id: 0, name: { $concat: ['$doctor.firstName', ' ', '$doctor.lastName'] }, count: 1 } }
      ]),
      Invoice.aggregate([
        { $match: { status: 'payé' } },
        { $group: { _id: { year: { $year: '$issuedAt' }, month: { $month: '$issuedAt' } }, total: { $sum: '$amount' } } },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 12 }
      ]),
      Invoice.find({ issuedAt: { $gte: startOfMonth } })
        .populate('patient', 'firstName lastName')
        .populate('doctor', 'firstName lastName')
        .sort({ issuedAt: -1 })
        .limit(100)
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MediSync';
    workbook.created = now;

    // Sheet 1: Consultations par médecin
    const sheet1 = workbook.addWorksheet('Consultations par Médecin');
    sheet1.columns = [
      { header: 'Médecin', key: 'name', width: 30 },
      { header: 'Nb Consultations', key: 'count', width: 20 }
    ];
    sheet1.getRow(1).font = { bold: true };
    consultationsPerDoctor.forEach(r => sheet1.addRow(r));

    // Sheet 2: Revenus mensuels
    const sheet2 = workbook.addWorksheet('Revenus Mensuels');
    sheet2.columns = [
      { header: 'Année', key: 'year', width: 10 },
      { header: 'Mois', key: 'month', width: 10 },
      { header: 'Total (DH)', key: 'total', width: 15 }
    ];
    sheet2.getRow(1).font = { bold: true };
    revenueByMonth.forEach(r => sheet2.addRow({ year: r._id.year, month: r._id.month, total: r.total }));

    // Sheet 3: Factures du mois
    const sheet3 = workbook.addWorksheet('Factures du Mois');
    sheet3.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Patient', key: 'patient', width: 25 },
      { header: 'Médecin', key: 'doctor', width: 25 },
      { header: 'Montant (DH)', key: 'amount', width: 15 },
      { header: 'Statut', key: 'status', width: 15 }
    ];
    sheet3.getRow(1).font = { bold: true };
    recentInvoices.forEach(inv => sheet3.addRow({
      date: inv.issuedAt?.toLocaleDateString('fr-FR'),
      patient: `${inv.patient?.firstName} ${inv.patient?.lastName}`,
      doctor: `Dr. ${inv.doctor?.firstName} ${inv.doctor?.lastName}`,
      amount: inv.amount,
      status: inv.status
    }));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Rapport-Analytics-${now.toISOString().slice(0, 7)}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    if (!res.headersSent) res.status(500).json({ message: "Erreur génération Excel", error: error.message });
  }
};
