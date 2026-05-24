/**
 * Middleware upload — gestion des téléversements de documents médicaux (multer).
 *
 * - Stockage local dans le dossier uploads/ avec un nom unique (timestamp + aléatoire).
 * - Filtre de sécurité : seuls les formats PDF, JPG/JPEG, PNG et DICOM (.dcm) sont acceptés.
 * - Limite de taille fixée à 20 Mo par fichier, conformément au cahier des charges.
 * - Utilisé par recordRoutes (/upload, /upload/:patientId).
 */
const multer = require('multer');
const path = require('path');

// 1. Configuration de l'endroit où stocker les fichiers localement
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Il faudra créer un dossier "uploads" à la racine de votre projet
  },
  filename: function (req, file, cb) {
    // On renomme le fichier pour éviter les doublons (ex: 168943928-radio.dcm)
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// 2. Filtre de sécurité : On n'accepte que les formats du cahier des charges
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.dcm'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true); // Le fichier est accepté
  } else {
    cb(new Error("Format de fichier non autorisé. Seuls PDF, JPG, PNG et DICOM sont acceptés."), false);
  }
};

// 3. Initialisation de Multer avec la limite de 20 Mo
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20 Mégaoctets (en octets)
  }
});

module.exports = upload;
