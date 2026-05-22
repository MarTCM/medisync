const mongoose = require('mongoose');

const secretaryProfileSchema = new mongoose.Schema({
  account: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Account', 
    required: true,
    unique: true
  },
  firstName: { 
    type: String, 
    required: true 
  },
  lastName: { 
    type: String, 
    required: true 
  },
  // Vous pouvez ajouter d'autres champs plus tard si besoin (ex: téléphone de poste)
}, { timestamps: true });

module.exports = mongoose.model('SecretaryProfile', secretaryProfileSchema);
