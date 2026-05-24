/**
 * Contrôleur facility — configuration de la clinique (modèle singleton).
 *
 * - getFacility : lecture des informations de la clinique (ouvert à tous les rôles authentifiés).
 * - upsertFacility : crée ou met à jour le document unique (upsert) — réservé à l'administrateur.
 * - addRoom / removeRoom : gestion des salles d'examen (équipements rattachés à chaque salle).
 */
const Facility = require('../models/Facility');

// Récupérer la configuration de la clinique (singleton)
exports.getFacility = async (req, res) => {
  try {
    const facility = await Facility.findOne();
    if (!facility) return res.status(404).json({ message: "Aucune clinique configurée." });
    res.status(200).json({ facility });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// Créer ou mettre à jour la clinique (upsert du singleton)
exports.upsertFacility = async (req, res) => {
  try {
    const { name, address, contactEmail, contactPhone, specialtiesOffered, openingHours } = req.body;

    const facility = await Facility.findOneAndUpdate(
      {},
      { name, address, contactEmail, contactPhone, specialtiesOffered, openingHours },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({ message: "Clinique mise à jour.", facility });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// Ajouter une salle
exports.addRoom = async (req, res) => {
  try {
    const { roomName, equipment } = req.body;
    const facility = await Facility.findOneAndUpdate(
      {},
      { $push: { rooms: { roomName, equipment: equipment || [] } } },
      { new: true, upsert: true }
    );
    res.status(201).json({ message: "Salle ajoutée.", rooms: facility.rooms });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// Supprimer une salle
exports.removeRoom = async (req, res) => {
  try {
    const { rid } = req.params;
    const facility = await Facility.findOneAndUpdate(
      {},
      { $pull: { rooms: { _id: rid } } },
      { new: true }
    );
    if (!facility) return res.status(404).json({ message: "Clinique non configurée." });
    res.status(200).json({ message: "Salle supprimée.", rooms: facility.rooms });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};
