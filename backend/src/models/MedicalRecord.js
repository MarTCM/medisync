const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema({
  // 1. Le lien unique vers le patient
  patient: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'PatientProfile', 
    required: true,
    unique: true // Un patient ne possède qu'un seul dossier médical centralisé
  },
  
  // 2. Informations médicales générales
  history: [{ type: String }], // Antécédents médicaux (ex: "Diabète de type 2")
  allergies: [{ type: String }], // (ex: "Pénicilline")
  
  // 3. Historique des consultations (Géré par les médecins)
  consultations: [{
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'DoctorProfile', required: true },
    date: { type: Date, default: Date.now },
    
    report: { type: String, required: true }, // Le compte rendu structuré
    
    // Prescriptions électroniques
    prescriptions: [{
      medication: { type: String, required: true },
      dosage: { type: String, default: '' },
      duration: { type: String, default: '' }
    }]
  }],

  // 4. Documents externes (Analyses, imagerie)
  attachments: [{
    fileUrl: { type: String, required: true }, // Le chemin où le fichier est stocké sur le serveur
    fileName: { type: String }, // Nom d'origine du fichier (ex: "radio_poumon.dcm")
    
    // Contrainte stricte du cahier des charges sur les formats
    fileType: { 
      type: String, 
      enum: ['PDF', 'JPG', 'PNG', 'DICOM'], 
      required: true 
    },
    
    uploadedAt: { type: Date, default: Date.now },
    // Pour savoir qui a ajouté le document (le patient lui-même ou un médecin)
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' } 
    
    /* 
      NOTE: La contrainte de taille maximale (20 Mo) n'est pas gérée ici par Mongoose. 
      Elle sera gérée plus tard dans le routeur/contrôleur par la bibliothèque 'multer' 
      avant même que le fichier ne touche la base de données.
    */
  }]
}, { timestamps: true });

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);