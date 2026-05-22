const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const accountSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, "Format d'email invalide"]
  },
  socialSecurityNumber: {
    type: String,
    unique: true,
    sparse: true,
  },
  password: {
    type: String,
    // Required only for non-OAuth accounts
    required: function () { return !this.googleId; },
    match: [
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      'Le mot de passe doit contenir au moins 8 caractères, une majuscule, un chiffre et un caractère spécial'
    ]
  },
  googleId: {
    type: String
  },
  role: {
    type: String,
    enum: ['patient', 'medecin', 'secretaire', 'administrateur'],
    required: true,
  },
  twoFactorSecret: {
    type: String
  },
  // false for patient accounts created via Google OAuth that haven't yet
  // filled their social security number and personal info
  profileCompleted: {
    type: Boolean,
    default: true
  },
}, { timestamps: true });

accountSchema.index({ role: 1 });

// Validation: email ou numéro de sécurité sociale requis
accountSchema.pre('validate', function () {
  if (!this.email && !this.socialSecurityNumber && !this.googleId) {
    throw new Error('Vous devez fournir soit une adresse email, soit un numéro de sécurité sociale pour créer un compte.');
  }
});

// Hachage du mot de passe avant sauvegarde
accountSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

accountSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Account', accountSchema);
