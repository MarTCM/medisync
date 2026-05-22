const Account = require('../models/Account');
const DoctorProfile = require('../models/DoctorProfile');
const SecretaryProfile = require('../models/SecretaryProfile');
const PatientProfile = require('../models/PatientProfile');
const AuditLog = require('../models/AuditLog');
const { logAudit } = require('../utils/auditLogger');

// Créer un compte personnel médical (médecin ou secrétaire)
exports.createStaffAccount = async (req, res) => {
  try {
    const {
      email, password, role, firstName, lastName,
      specialties, baseFee, languages, location, sector, schedule
    } = req.body;

    if (!['medecin', 'secretaire'].includes(role)) {
      return res.status(400).json({ message: "Cette route est réservée à la création du personnel médical." });
    }

    const existingAccount = await Account.findOne({ email });
    if (existingAccount) {
      return res.status(409).json({ message: "Un compte avec cet email existe déjà." });
    }

    const newAccount = await Account.create({ email, password, role });

    let profileToReturn;

    if (role === 'medecin') {
      const doctorData = {
        account: newAccount._id,
        firstName,
        lastName,
        specialties: Array.isArray(specialties) ? specialties : [specialties],
        baseFee: baseFee || 0
      };
      if (Array.isArray(languages)) doctorData.languages = languages;
      if (location) doctorData.location = location;
      if ([1, 2, 3].includes(Number(sector))) doctorData.sector = Number(sector);
      if (schedule && typeof schedule === 'object') doctorData.schedule = schedule;
      profileToReturn = await DoctorProfile.create(doctorData);
    } else if (role === 'secretaire') {
      profileToReturn = await SecretaryProfile.create({
        account: newAccount._id,
        firstName,
        lastName
      });
    }

    await logAudit('CREATION_COMPTE', req, newAccount._id, `Compte ${role} créé par l'admin`);

    res.status(201).json({
      message: `Compte ${role} créé avec succès.`,
      account: { id: newAccount._id, email: newAccount.email, role: newAccount.role },
      profile: profileToReturn
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la création du compte", error: error.message });
  }
};

// Mettre à jour les infos d'un membre du personnel
exports.updateStaffAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const account = await Account.findById(id);
    if (!account) return res.status(404).json({ message: "Compte introuvable." });
    if (!['medecin', 'secretaire'].includes(account.role)) {
      return res.status(400).json({ message: "Cette route est réservée au personnel médical." });
    }

    const { email, firstName, lastName, specialties, baseFee, languages, location, sector, schedule } = req.body;

    if (email && email !== account.email) {
      const dup = await Account.findOne({ email, _id: { $ne: account._id } });
      if (dup) return res.status(409).json({ message: "Un compte avec cet email existe déjà." });
      account.email = email;
      await account.save();
    }

    let profile;
    if (account.role === 'medecin') {
      const updates = {};
      if (firstName !== undefined) updates.firstName = firstName;
      if (lastName !== undefined) updates.lastName = lastName;
      if (specialties !== undefined) updates.specialties = Array.isArray(specialties) ? specialties : [specialties];
      if (baseFee !== undefined) updates.baseFee = Number(baseFee);
      if (languages !== undefined) updates.languages = Array.isArray(languages) ? languages : [languages];
      if (location !== undefined) updates.location = location;
      if (sector !== undefined && [1, 2, 3].includes(Number(sector))) updates.sector = Number(sector);
      if (schedule !== undefined) updates.schedule = schedule;
      profile = await DoctorProfile.findOneAndUpdate({ account: account._id }, updates, { new: true });
    } else {
      const updates = {};
      if (firstName !== undefined) updates.firstName = firstName;
      if (lastName !== undefined) updates.lastName = lastName;
      profile = await SecretaryProfile.findOneAndUpdate({ account: account._id }, updates, { new: true });
    }

    await logAudit('MODIFICATION_COMPTE', req, account._id, `Compte ${account.role} modifié par l'admin`);

    res.status(200).json({
      message: "Compte mis à jour.",
      account: { id: account._id, email: account.email, role: account.role },
      profile
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la mise à jour du compte", error: error.message });
  }
};

// Supprimer un compte (et son profil associé)
exports.deleteAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const account = await Account.findById(id);
    if (!account) return res.status(404).json({ message: "Compte introuvable." });
    if (account.role === 'administrateur') {
      return res.status(403).json({ message: "Impossible de supprimer un compte administrateur." });
    }
    if (String(account._id) === String(req.user.id)) {
      return res.status(403).json({ message: "Impossible de supprimer votre propre compte." });
    }

    if (account.role === 'medecin') {
      await DoctorProfile.findOneAndDelete({ account: account._id });
    } else if (account.role === 'secretaire') {
      await SecretaryProfile.findOneAndDelete({ account: account._id });
    } else if (account.role === 'patient') {
      await PatientProfile.findOneAndDelete({ account: account._id });
    }
    await Account.findByIdAndDelete(account._id);

    await logAudit('SUPPRESSION_COMPTE', req, account._id, `Compte ${account.role} supprimé par l'admin`);

    res.status(200).json({ message: "Compte supprimé." });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la suppression du compte", error: error.message });
  }
};

// Lister le personnel (médecins et secrétaires) avec profil associé
exports.listStaff = async (req, res) => {
  try {
    const accounts = await Account.find(
      { role: { $in: ['medecin', 'secretaire'] } },
      { password: 0, twoFactorSecret: 0 }
    ).sort({ createdAt: -1 }).lean();

    const accountIds = accounts.map(a => a._id);
    const [doctors, secretaries] = await Promise.all([
      DoctorProfile.find({ account: { $in: accountIds } }).lean(),
      SecretaryProfile.find({ account: { $in: accountIds } }).lean()
    ]);
    const docByAccount = new Map(doctors.map(d => [String(d.account), d]));
    const secByAccount = new Map(secretaries.map(s => [String(s.account), s]));

    const staff = accounts.map(a => ({
      ...a,
      profile: a.role === 'medecin' ? docByAccount.get(String(a._id)) || null
        : a.role === 'secretaire' ? secByAccount.get(String(a._id)) || null
        : null
    }));

    res.status(200).json({ staff });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération du personnel", error: error.message });
  }
};

// Lister les patients (admin + secrétaire)
exports.listPatients = async (req, res) => {
  try {
    const patients = await PatientProfile.find()
      .populate('account', 'email')
      .sort({ lastName: 1 });
    res.status(200).json({ patients });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des patients", error: error.message });
  }
};

// Journal d'audit paginé
exports.listAudit = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find()
        .populate('userAccount', 'email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments()
    ]);

    res.status(200).json({
      logs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des logs", error: error.message });
  }
};
