const DoctorProfile = require('../models/DoctorProfile');

// Recherche de médecins par critères
exports.searchDoctors = async (req, res) => {
  try {
    const { specialty, location, language, name } = req.query;
    let query = {};

    if (specialty) query.specialties = { $regex: new RegExp(specialty, 'i') };
    if (location) query.location = { $regex: new RegExp(location, 'i') };
    if (language) query.languages = { $regex: new RegExp(language, 'i') };
    if (name) {
      query.$or = [
        { firstName: { $regex: new RegExp(name, 'i') } },
        { lastName: { $regex: new RegExp(name, 'i') } }
      ];
    }

    const doctors = await DoctorProfile.find(query).populate('account', 'email');

    res.status(200).json({
      message: "Recherche effectuée avec succès",
      count: doctors.length,
      doctors
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la recherche", error: error.message });
  }
};

// Profil du médecin connecté
exports.getMe = async (req, res) => {
  try {
    const doctorProfile = await DoctorProfile.findOne({ account: req.user.id }).populate('account', 'email');
    if (!doctorProfile) return res.status(404).json({ message: "Profil médecin introuvable." });
    res.status(200).json({ doctor: doctorProfile });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// Mettre à jour le profil du médecin connecté
exports.updateMe = async (req, res) => {
  try {
    const allowed = ['firstName', 'lastName', 'specialties', 'languages', 'location', 'sector', 'baseFee', 'schedule'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const doctorProfile = await DoctorProfile.findOneAndUpdate(
      { account: req.user.id },
      updates,
      { new: true }
    );
    if (!doctorProfile) return res.status(404).json({ message: "Profil médecin introuvable." });
    res.status(200).json({ doctor: doctorProfile });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// Ajouter un congé
exports.addLeave = async (req, res) => {
  try {
    const { startDate, endDate, reason } = req.body;
    const doctorProfile = await DoctorProfile.findOneAndUpdate(
      { account: req.user.id },
      { $push: { leaves: { startDate, endDate, reason } } },
      { new: true }
    );
    if (!doctorProfile) return res.status(404).json({ message: "Profil médecin introuvable." });
    res.status(201).json({ message: "Congé ajouté.", leaves: doctorProfile.leaves });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// Lister les congés
exports.listLeaves = async (req, res) => {
  try {
    const doctorProfile = await DoctorProfile.findOne({ account: req.user.id }, 'leaves');
    if (!doctorProfile) return res.status(404).json({ message: "Profil médecin introuvable." });
    res.status(200).json({ leaves: doctorProfile.leaves });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// Supprimer un congé
exports.removeLeave = async (req, res) => {
  try {
    const { lid } = req.params;
    const doctorProfile = await DoctorProfile.findOneAndUpdate(
      { account: req.user.id },
      { $pull: { leaves: { _id: lid } } },
      { new: true }
    );
    if (!doctorProfile) return res.status(404).json({ message: "Profil médecin introuvable." });
    res.status(200).json({ message: "Congé supprimé.", leaves: doctorProfile.leaves });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};
