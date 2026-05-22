const Account = require('../models/Account');
const DoctorProfile = require('../models/DoctorProfile');
const SecretaryProfile = require('../models/SecretaryProfile');
const PatientProfile = require('../models/PatientProfile');
const AuditLog = require('../models/AuditLog');
const { logAudit } = require('../utils/auditLogger');

// Créer un compte personnel médical (médecin ou secrétaire)
exports.createStaffAccount = async (req, res) => {
  try {
    const { email, password, role, firstName, lastName, specialties, baseFee } = req.body;

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
      profileToReturn = await DoctorProfile.create({
        account: newAccount._id,
        firstName,
        lastName,
        specialties: Array.isArray(specialties) ? specialties : [specialties],
        baseFee: baseFee || 0
      });
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

// Lister le personnel (médecins et secrétaires)
exports.listStaff = async (req, res) => {
  try {
    const accounts = await Account.find(
      { role: { $in: ['medecin', 'secretaire'] } },
      { password: 0, twoFactorSecret: 0 }
    ).sort({ createdAt: -1 });

    res.status(200).json({ staff: accounts });
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
