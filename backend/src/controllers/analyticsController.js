/**
 * Contrôleur analytics — KPI et exports de rapports d'activité.
 *
 * - kpis : agrège nombre de rendez-vous, chiffre d'affaires, taux de remplissage, etc. sur la période choisie.
 * - revenueBreakdown : ventilation du chiffre d'affaires par médecin / spécialité / période.
 * - exportPdf / exportExcel : génère les rapports téléchargeables via PDFKit et ExcelJS.
 * - Helper parseRange normalise la fenêtre temporelle (jour / semaine / mois / année) depuis la requête.
 * - Tous les exports sont journalisés par logAudit (action EXPORT_DONNEES).
 */
const Appointment = require('../models/Appointment');
const Invoice = require('../models/Invoice');
const DoctorProfile = require('../models/DoctorProfile');
const PatientProfile = require('../models/PatientProfile');
const Facility = require('../models/Facility');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { logAudit } = require('../utils/auditLogger');

// --- Helpers for periodicity + range ---

function parseRange(query) {
  const granularity = ['day', 'week', 'month', 'year'].includes(query.granularity) ? query.granularity : 'month';
  const now = new Date();
  let from, to;

  if (query.from && query.to) {
    from = new Date(`${query.from}T00:00:00`);
    to   = new Date(`${query.to}T23:59:59`);
  } else if (granularity === 'day') {
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    to   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  } else if (granularity === 'week') {
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
    to   = new Date(from.getTime() + 6 * 86400000 + 86399000);
  } else if (granularity === 'year') {
    from = new Date(now.getFullYear(), 0, 1);
    to   = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
  } else {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    to   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  }
  return { from, to, granularity };
}

function groupIdForGranularity(granularity) {
  if (granularity === 'day')   return { year: { $year: '$issuedAt' }, month: { $month: '$issuedAt' }, day: { $dayOfMonth: '$issuedAt' } };
  if (granularity === 'week')  return { year: { $year: '$issuedAt' }, week: { $week: '$issuedAt' } };
  if (granularity === 'year')  return { year: { $year: '$issuedAt' } };
  return { year: { $year: '$issuedAt' }, month: { $month: '$issuedAt' } };
}

function formatPeriod(id, granularity) {
  if (granularity === 'day')   return `${String(id.day).padStart(2,'0')}/${String(id.month).padStart(2,'0')}/${id.year}`;
  if (granularity === 'week')  return `Sem ${id.week} ${id.year}`;
  if (granularity === 'year')  return `${id.year}`;
  const months = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'];
  return `${months[id.month - 1]} ${id.year}`;
}

// --- Room occupancy: per-room appointment minutes / theoretical opening minutes ---

async function computeRoomOccupancy(from, to) {
  const facility = await Facility.findOne();
  if (!facility || !facility.rooms?.length) return [];

  // Theoretical capacity: working hours (defaut 8h = 480min) * weekdays in range
  const workDayMinutes = 480;
  let workDays = 0;
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) workDays += 1;
  }
  const theoreticalMinutes = Math.max(1, workDays * workDayMinutes);

  const aggregation = await Appointment.aggregate([
    {
      $match: {
        startTime: { $gte: from, $lte: to },
        status: { $in: ['confirmé', 'terminé', 'en attente'] },
        room: { $exists: true, $ne: null }
      }
    },
    { $group: { _id: '$room', minutes: { $sum: '$duration' } } }
  ]);

  return facility.rooms.map(r => {
    const found = aggregation.find(a => a._id === r.roomName);
    const minutes = found?.minutes || 0;
    return {
      roomName: r.roomName,
      ratePct: Math.min(100, Math.round((minutes / theoreticalMinutes) * 100))
    };
  });
}

// Indicateurs clés de performance
exports.kpis = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [
      totalAppointmentsMonth,
      noShowCount,
      totalConfirmed,
      consultationsPerDoctor,
      revenueByMonth,
      totalPatients,
      consultationsBySpecialty,
      roomOccupancy
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
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 12 }
      ]),
      PatientProfile.countDocuments(),
      Appointment.aggregate([
        { $match: { status: { $in: ['confirmé', 'terminé'] }, startTime: { $gte: startOfMonth } } },
        { $lookup: { from: 'doctorprofiles', localField: 'doctor', foreignField: '_id', as: 'doctor' } },
        { $unwind: '$doctor' },
        { $project: { specialty: { $arrayElemAt: ['$doctor.specialties', 0] } } },
        { $group: { _id: '$specialty', count: { $sum: 1 } } },
        { $project: { _id: 0, specialty: { $ifNull: ['$_id', 'Non spécifiée'] }, count: 1 } },
        { $sort: { count: -1 } }
      ]),
      computeRoomOccupancy(startOfMonth, endOfMonth)
    ]);

    const noShowRate = totalConfirmed > 0 ? ((noShowCount / totalConfirmed) * 100).toFixed(1) : 0;
    const avgRoomOccupancy = roomOccupancy.length
      ? Math.round(roomOccupancy.reduce((s, r) => s + r.ratePct, 0) / roomOccupancy.length)
      : 0;

    res.status(200).json({
      totalAppointmentsMonth,
      noShowCount,
      noShowRate: `${noShowRate}%`,
      consultationsPerDoctor,
      revenueByMonth,
      totalPatients,
      consultationsBySpecialty,
      roomOccupancy,
      avgRoomOccupancy
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

// Export PDF du rapport analytique (avec période personnalisable)
exports.exportPdf = async (req, res) => {
  try {
    await logAudit('EXPORT_DONNEES', req, null, 'Export rapport analytique PDF');
    const { from, to, granularity } = parseRange(req.query);

    const [totalAppts, noShowCount, totalConfirmed, revenueResult, byPeriod, roomOcc] = await Promise.all([
      Appointment.countDocuments({ startTime: { $gte: from, $lte: to }, status: { $ne: 'annulé' } }),
      Appointment.countDocuments({ startTime: { $gte: from, $lte: to }, status: 'no-show' }),
      Appointment.countDocuments({ startTime: { $gte: from, $lte: to }, status: { $in: ['confirmé', 'terminé', 'no-show'] } }),
      Invoice.aggregate([
        { $match: { status: 'payé', issuedAt: { $gte: from, $lte: to } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Invoice.aggregate([
        { $match: { status: 'payé', issuedAt: { $gte: from, $lte: to } } },
        { $group: { _id: groupIdForGranularity(granularity), total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } }
      ]),
      computeRoomOccupancy(from, to)
    ]);

    const noShowRate = totalConfirmed > 0 ? ((noShowCount / totalConfirmed) * 100).toFixed(1) : 0;
    const revenue = revenueResult[0]?.total || 0;
    const invoiceCount = revenueResult[0]?.count || 0;

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Rapport-${granularity}-${from.toISOString().slice(0,10)}_${to.toISOString().slice(0,10)}.pdf`);
    doc.pipe(res);

    doc.fontSize(20).font('Helvetica-Bold').text('RAPPORT ANALYTIQUE — MEDISYNC', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).font('Helvetica').text(`Période : ${from.toLocaleDateString('fr-FR')} — ${to.toLocaleDateString('fr-FR')} (${granularity})`, { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(14).font('Helvetica-Bold').text('Indicateurs Clés');
    doc.moveDown();
    doc.fontSize(12).font('Helvetica');
    doc.text(`Total rendez-vous : ${totalAppts}`);
    doc.text(`Taux de no-show : ${noShowRate}%`);
    doc.text(`Revenus encaissés : ${revenue} DH (${invoiceCount} factures)`);
    doc.moveDown();

    if (byPeriod.length) {
      doc.fontSize(14).font('Helvetica-Bold').text('Recettes par période');
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
      byPeriod.forEach(p => {
        doc.text(`  • ${formatPeriod(p._id, granularity)} : ${p.total} DH (${p.count} factures)`);
      });
      doc.moveDown();
    }

    if (roomOcc.length) {
      doc.fontSize(14).font('Helvetica-Bold').text('Occupation des salles');
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
      roomOcc.forEach(r => doc.text(`  • ${r.roomName} : ${r.ratePct}%`));
      doc.moveDown();
    }

    doc.fontSize(10).font('Helvetica-Oblique').text(`Rapport généré le ${new Date().toLocaleDateString('fr-FR')}`, { align: 'right' });
    doc.end();
  } catch (error) {
    if (!res.headersSent) res.status(500).json({ message: "Erreur génération PDF", error: error.message });
  }
};

// Export Excel du rapport analytique (avec période personnalisable)
exports.exportExcel = async (req, res) => {
  try {
    await logAudit('EXPORT_DONNEES', req, null, 'Export rapport analytique Excel');
    const { from, to, granularity } = parseRange(req.query);

    const [consultationsPerDoctor, byPeriod, recentInvoices, roomOcc] = await Promise.all([
      Appointment.aggregate([
        { $match: { status: 'terminé', startTime: { $gte: from, $lte: to } } },
        { $group: { _id: '$doctor', count: { $sum: 1 } } },
        { $lookup: { from: 'doctorprofiles', localField: '_id', foreignField: '_id', as: 'doctor' } },
        { $unwind: '$doctor' },
        { $project: { _id: 0, name: { $concat: ['$doctor.firstName', ' ', '$doctor.lastName'] }, count: 1 } }
      ]),
      Invoice.aggregate([
        { $match: { status: 'payé', issuedAt: { $gte: from, $lte: to } } },
        { $group: { _id: groupIdForGranularity(granularity), total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } }
      ]),
      Invoice.find({ issuedAt: { $gte: from, $lte: to } })
        .populate('patient', 'firstName lastName')
        .populate('doctor', 'firstName lastName')
        .sort({ issuedAt: -1 })
        .limit(200),
      computeRoomOccupancy(from, to)
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MediSync';
    workbook.created = new Date();

    const sheet1 = workbook.addWorksheet('Consultations par Médecin');
    sheet1.columns = [
      { header: 'Médecin', key: 'name', width: 30 },
      { header: 'Nb Consultations', key: 'count', width: 20 }
    ];
    sheet1.getRow(1).font = { bold: true };
    consultationsPerDoctor.forEach(r => sheet1.addRow(r));

    const sheet2 = workbook.addWorksheet(`Recettes (${granularity})`);
    sheet2.columns = [
      { header: 'Période', key: 'period', width: 20 },
      { header: 'Nb factures', key: 'count', width: 15 },
      { header: 'Total (DH)', key: 'total', width: 15 }
    ];
    sheet2.getRow(1).font = { bold: true };
    byPeriod.forEach(p => sheet2.addRow({
      period: formatPeriod(p._id, granularity),
      count: p.count,
      total: p.total
    }));

    const sheet3 = workbook.addWorksheet('Factures de la période');
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
      patient: `${inv.patient?.firstName || ''} ${inv.patient?.lastName || ''}`.trim(),
      doctor: `Dr. ${inv.doctor?.firstName || ''} ${inv.doctor?.lastName || ''}`.trim(),
      amount: inv.amount,
      status: inv.status
    }));

    if (roomOcc.length) {
      const sheet4 = workbook.addWorksheet('Occupation salles');
      sheet4.columns = [
        { header: 'Salle', key: 'roomName', width: 30 },
        { header: 'Occupation (%)', key: 'ratePct', width: 20 }
      ];
      sheet4.getRow(1).font = { bold: true };
      roomOcc.forEach(r => sheet4.addRow(r));
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Rapport-${granularity}-${from.toISOString().slice(0,10)}_${to.toISOString().slice(0,10)}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    if (!res.headersSent) res.status(500).json({ message: "Erreur génération Excel", error: error.message });
  }
};
