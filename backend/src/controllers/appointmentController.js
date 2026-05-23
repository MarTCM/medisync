const Appointment = require('../models/Appointment');
const PatientProfile = require('../models/PatientProfile');
const DoctorProfile = require('../models/DoctorProfile');
const { sendNotification } = require('../utils/emailService');

// Resolve dependent info from a populated patient object and attach it to each appointment plain object
function enrichWithDependent(appointments) {
  return appointments.map(apt => {
    const obj = apt.toObject ? apt.toObject() : apt;
    if (obj.dependentId && obj.patient && obj.patient.dependents) {
      const dep = obj.patient.dependents.find(d => String(d._id) === String(obj.dependentId));
      if (dep) obj.dependentInfo = dep;
    }
    return obj;
  });
}

// 1. Créer un nouveau rendez-vous
exports.createAppointment = async (req, res) => {
  try {
    const { doctorId, date, time, duration, notes, reason, newDependent } = req.body;
    let { dependentId } = req.body;

    let targetPatientProfile;
    if (req.user.role === 'secretaire' || req.user.role === 'administrateur') {
      if (!req.body.patientId) {
        return res.status(400).json({ message: "L'ID du patient est requis pour la secrétaire." });
      }
      // patientId is already the PatientProfile._id when coming from secretary
      targetPatientProfile = await PatientProfile.findById(req.body.patientId);
    } else {
      // Patient role: look up PatientProfile from account
      targetPatientProfile = await PatientProfile.findOne({ account: req.user.id });
    }

    if (!targetPatientProfile) {
      return res.status(404).json({ message: "Profil patient introuvable." });
    }

    // If booking for a new third party, create the dependent and use its _id
    if (!dependentId && newDependent && newDependent.firstName && newDependent.lastName) {
      const dep = {
        firstName: newDependent.firstName,
        lastName: newDependent.lastName,
        dateOfBirth: newDependent.dateOfBirth,
        relation: newDependent.relation || 'enfant',
        allergies: Array.isArray(newDependent.allergies) ? newDependent.allergies : [],
        notes: newDependent.notes || ''
      };
      targetPatientProfile.dependents.push(dep);
      await targetPatientProfile.save();
      dependentId = targetPatientProfile.dependents[targetPatientProfile.dependents.length - 1]._id;
    }

    const validDurations = [15, 30, 60];
    if (!validDurations.includes(Number(duration))) {
      return res.status(400).json({
        message: "Durée invalide. Les consultations doivent durer 15, 30 ou 60 minutes."
      });
    }

    const startDateTime = new Date(`${date}T${time}`);
    const endDateTime = new Date(startDateTime.getTime() + Number(duration) * 60000);

    // Vérification des conflits — bypassée pour les urgences (insertion prioritaire)
    if (reason !== 'urgence') {
      const conflict = await Appointment.findOne({
        doctor: doctorId,
        status: { $ne: 'annulé' },
        startTime: { $lt: endDateTime },
        endTime: { $gt: startDateTime }
      });

      if (conflict) {
        return res.status(409).json({ message: "Le médecin est déjà occupé sur ce créneau horaire." });
      }
    }

    const newAppointment = await Appointment.create({
      patient: targetPatientProfile._id,
      doctor: doctorId,
      dependentId: dependentId || undefined,
      startTime: startDateTime,
      endTime: endDateTime,
      duration: Number(duration),
      notes: notes,
      status: 'en attente',
      reason: reason
    });

    const patientWithAccount = await PatientProfile.findById(targetPatientProfile._id).populate('account', 'email');
    const patientEmail = patientWithAccount?.account?.email;
    sendNotification(
      patientEmail,
      "Confirmation de votre rendez-vous - MediSync",
      `Bonjour, votre rendez-vous du ${date} à ${time} a été pris en compte.`
    ).catch(() => {});

    res.status(201).json({
      message: "Rendez-vous créé avec succès",
      appointment: newAppointment
    });

  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la création du rendez-vous", error: error.message });
  }
};

// 2. Liste complète des rendez-vous (secrétaire / admin) — filtrée par date si fournie
exports.getAllAppointments = async (req, res) => {
  try {
    const filter = {};
    if (req.query.date) {
      const start = new Date(`${req.query.date}T00:00:00`);
      const end   = new Date(`${req.query.date}T23:59:59`);
      filter.startTime = { $gte: start, $lte: end };
    }

    const appointments = await Appointment.find(filter)
      .populate('patient', 'firstName lastName dateOfBirth dependents')
      .populate('doctor', 'firstName lastName specialties baseFee')
      .sort({ startTime: 1 });

    res.status(200).json({
      message: "Planning récupéré avec succès",
      total: appointments.length,
      appointments: enrichWithDependent(appointments)
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération du planning", error: error.message });
  }
};

// 3. Historique des rendez-vous du patient connecté
exports.getMyAppointments = async (req, res) => {
  try {
    const patientProfile = await PatientProfile.findOne({ account: req.user.id });
    if (!patientProfile) {
      return res.status(404).json({ message: "Profil patient introuvable." });
    }

    const appointments = await Appointment.find({ patient: patientProfile._id })
      .populate('patient', 'firstName lastName dateOfBirth dependents')
      .populate('doctor', 'firstName lastName specialties')
      .sort({ startTime: -1 });

    res.status(200).json(enrichWithDependent(appointments));
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des rendez-vous", error: error.message });
  }
};

exports.updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, time } = req.body;

    const startDateTime = new Date(`${date}T${time}`);
    const existing = await Appointment.findById(id);
    const endDateTime = existing
      ? new Date(startDateTime.getTime() + existing.duration * 60000)
      : startDateTime;

    const appointment = await Appointment.findByIdAndUpdate(
      id,
      { startTime: startDateTime, endTime: endDateTime },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({ message: "Rendez-vous introuvable." });
    }

    try {
      await sendNotification(
        req.user.email,
        "Modification de votre rendez-vous - MediSync",
        `Bonjour, votre rendez-vous a été déplacé au ${date} à ${time}.`
      );
    } catch (err) {
      console.error("Erreur email modification");
    }

    res.status(200).json({ message: "Rendez-vous modifié et patient notifié.", appointment });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la modification", error: error.message });
  }
};

// 4. Annuler un rendez-vous
exports.cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findById(id).populate('patient');
    if (!appointment) {
      return res.status(404).json({ message: "Rendez-vous introuvable." });
    }

    appointment.status = 'annulé';
    await appointment.save();

    res.status(200).json({ message: "Rendez-vous annulé avec succès." });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de l'annulation", error: error.message });
  }
};

// 5. Bloquer un créneau d'indisponibilité — reste intact ci-dessous
exports.setIndisponibilite = async (req, res) => {
  try {
    const { date, startTime, endTime, reason } = req.body;
    const doctorProfile = await DoctorProfile.findOne({ account: req.user.id });
    if (!doctorProfile) {
      return res.status(404).json({ message: "Profil médecin introuvable." });
    }

    const start = new Date(`${date}T${startTime}`);
    const end = new Date(`${date}T${endTime}`);

    const existingAppointments = await Appointment.findOne({
      doctor: doctorProfile._id,
      status: { $in: ['en attente', 'confirmé'] },
      startTime: { $lt: end },
      endTime: { $gt: start }
    });

    if (existingAppointments) {
      return res.status(400).json({
        message: "Impossible de bloquer ce créneau : des rendez-vous sont déjà programmés."
      });
    }

    const block = await Appointment.create({
      doctor: doctorProfile._id,
      patient: null,
      startTime: start,
      endTime: end,
      duration: Math.round((end - start) / 60000),
      reason: 'indisponibilité',
      status: 'indisponible'
    });

    res.status(201).json({ message: "Créneau bloqué avec succès.", block });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors du blocage du créneau", error: error.message });
  }
};

// 6. Créneaux disponibles pour un médecin à une date donnée (patient)
exports.getAvailableSlots = async (req, res) => {
  try {
    const { doctorId, date, duration: durationParam } = req.query;
    if (!doctorId || !date) {
      return res.status(400).json({ message: 'doctorId et date sont requis.' });
    }

    const doctorProfile = await DoctorProfile.findById(doctorId);
    if (!doctorProfile) {
      return res.status(404).json({ message: 'Médecin introuvable.' });
    }

    const schedule = doctorProfile.schedule || {};
    const workDays = schedule.workDays || [];
    const startHour = schedule.startHour || '09:00';
    const endHour = schedule.endHour || '18:00';
    const defaultDuration = schedule.defaultConsultationDuration || 30;
    const duration = [15, 30, 60].includes(Number(durationParam)) ? Number(durationParam) : defaultDuration;

    const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const dateForDay = new Date(`${date}T12:00:00`);
    const dayName = dayNames[dateForDay.getDay()];

    if (workDays.length > 0 && !workDays.includes(dayName)) {
      return res.status(200).json({ slots: [] });
    }

    const requestedDate = new Date(`${date}T12:00:00`);
    const onLeave = (doctorProfile.leaves || []).some(leave => {
      return requestedDate >= new Date(leave.startDate) && requestedDate <= new Date(leave.endDate);
    });
    if (onLeave) {
      return res.status(200).json({ slots: [] });
    }

    const [startH, startM] = startHour.split(':').map(Number);
    const [endH, endM] = endHour.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    const allSlotTimes = [];
    for (let m = startMinutes; m + duration <= endMinutes; m += duration) {
      const h = String(Math.floor(m / 60)).padStart(2, '0');
      const min = String(m % 60).padStart(2, '0');
      allSlotTimes.push(`${h}:${min}`);
    }

    const startOfDay = new Date(`${date}T00:00:00`);
    const endOfDay = new Date(`${date}T23:59:59`);

    const booked = await Appointment.find({
      doctor: doctorId,
      status: { $ne: 'annulé' },
      startTime: { $gte: startOfDay, $lte: endOfDay }
    });

    const slots = allSlotTimes.map(time => {
      const slotStart = new Date(`${date}T${time}:00`);
      const slotEnd = new Date(slotStart.getTime() + duration * 60000);
      const isTaken = booked.some(appt => appt.startTime < slotEnd && appt.endTime > slotStart);
      return { time, available: !isTaken };
    });

    res.status(200).json({ slots });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des créneaux', error: error.message });
  }
};

// 7. Planning journalier du médecin
exports.getDoctorDailySchedule = async (req, res) => {
  try {
    const { date } = req.query;
    const doctorProfile = await DoctorProfile.findOne({ account: req.user.id });
    if (!doctorProfile) {
      return res.status(404).json({ message: "Profil médecin introuvable." });
    }

    const startOfDay = new Date(`${date}T00:00:00`);
    const endOfDay = new Date(`${date}T23:59:59`);

    const schedule = await Appointment.find({
      doctor: doctorProfile._id,
      startTime: { $gte: startOfDay, $lte: endOfDay },
      status: { $ne: 'annulé' }
    }).populate('patient', 'firstName lastName phoneNumber dateOfBirth dependents');

    res.status(200).json(enrichWithDependent(schedule));
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération du planning", error: error.message });
  }
};

// 8. Confirmer un rendez-vous (Secrétaire)
exports.confirmAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status: 'confirmé' },
      { new: true }
    ).populate('patient');

    if (!appointment) {
      return res.status(404).json({ message: "Rendez-vous introuvable." });
    }

    if (appointment.patient) {
      const patientWithAccount = await PatientProfile.findById(appointment.patient._id).populate('account', 'email');
      sendNotification(
        patientWithAccount?.account?.email,
        "Confirmation de votre rendez-vous - MediSync",
        `Bonjour, la secrétaire a confirmé votre rendez-vous du ${appointment.startTime.toLocaleDateString('fr-FR')}.`
      ).catch(() => {});
    }

    res.status(200).json({ message: "Rendez-vous confirmé avec succès.", appointment });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la confirmation", error: error.message });
  }
};

// 9. Marquer un rendez-vous comme no-show (Secrétaire)
exports.markNoShow = async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status: 'no-show' },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({ message: "Rendez-vous introuvable." });
    }

    res.status(200).json({ message: "Rendez-vous marqué no-show.", appointment });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors du no-show", error: error.message });
  }
};
