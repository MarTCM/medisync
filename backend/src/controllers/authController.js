const Account = require('../models/Account');
const PatientProfile = require('../models/PatientProfile');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { OAuth2Client } = require('google-auth-library');
const { logAudit } = require('../utils/auditLogger');

const googleClient = new OAuth2Client(process.env.GOOGLE_OAUTH_CLIENT_ID);

const generateToken = (id, expiresIn = process.env.JWT_EXPIRES_IN || '1d') => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn });
};

// ==========================================
// INSCRIPTION (POST /api/auth/register)
// ==========================================
exports.register = async (req, res) => {
  try {
    const { email, socialSecurityNumber, password, role, firstName, lastName } = req.body;

    if (!email && !socialSecurityNumber) {
      return res.status(400).json({ message: "Veuillez fournir un email ou un numéro de sécurité sociale." });
    }

    const query = [];
    if (email) query.push({ email });
    if (socialSecurityNumber) query.push({ socialSecurityNumber });

    const userExists = await Account.findOne({ $or: query });
    if (userExists) {
      return res.status(400).json({ message: "Un compte existe déjà avec cet identifiant." });
    }

    const account = await Account.create({ email, socialSecurityNumber, password, role });

    let profile = null;
    if (role === 'patient') {
      if (!firstName || !lastName) {
        await Account.findByIdAndDelete(account._id);
        return res.status(400).json({ message: "Le prénom et le nom sont obligatoires pour un patient." });
      }
      profile = await PatientProfile.create({ account: account._id, firstName, lastName });
    }

    // Audit log (req.user may not exist for self-registration — use account directly)
    try {
      await logAudit('CREATION_COMPTE', { user: account, ip: req.ip }, account._id, `Nouveau compte ${role} créé`);
    } catch (_) {}

    const token = generateToken(account._id);

    res.status(201).json({
      message: "Compte créé avec succès",
      token,
      account: { id: account._id, role: account.role },
      profile
    });

  } catch (error) {
    res.status(400).json({ message: "Erreur de validation", details: error.message });
  }
};

// ==========================================
// CONNEXION (POST /api/auth/login)
// ==========================================
exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ message: "Veuillez fournir un identifiant et un mot de passe." });
    }

    const account = await Account.findOne({
      $or: [{ email: identifier }, { socialSecurityNumber: identifier }]
    });

    if (!account) {
      return res.status(401).json({ message: "Identifiants incorrects." });
    }

    const isMatch = await account.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Identifiants incorrects." });
    }

    // 2FA required for admin with 2FA configured
    if (account.role === 'administrateur' && account.twoFactorSecret) {
      const tempToken = generateToken(account._id, '5m');
      return res.status(200).json({
        requires2FA: true,
        tempToken
      });
    }

    const token = generateToken(account._id);

    // Audit log
    try {
      await logAudit('CONNEXION', { user: account, ip: req.ip }, null, `Connexion réussie (${account.role})`);
    } catch (_) {}

    res.status(200).json({
      message: "Connexion réussie",
      token,
      account: { id: account._id, role: account.role }
    });

  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// ==========================================
// CONNEXION GOOGLE OAUTH (POST /api/auth/google)
// ==========================================
exports.googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: "idToken Google manquant." });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_OAUTH_CLIENT_ID
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, given_name: firstName, family_name: lastName } = payload;

    let account = await Account.findOne({ $or: [{ googleId }, { email }] });

    if (!account) {
      account = await Account.create({ email, googleId, role: 'patient' });
      await PatientProfile.create({
        account: account._id,
        firstName: firstName || 'Prénom',
        lastName: lastName || 'Nom'
      });
    } else if (!account.googleId) {
      account.googleId = googleId;
      await account.save();
    }

    try {
      await logAudit('CONNEXION', { user: account, ip: req.ip }, null, 'Connexion via Google OAuth');
    } catch (_) {}

    const token = generateToken(account._id);
    res.status(200).json({
      message: "Connexion Google réussie",
      token,
      account: { id: account._id, role: account.role }
    });

  } catch (error) {
    res.status(401).json({ message: "Token Google invalide", error: error.message });
  }
};

// ==========================================
// PROFIL PATIENT (GET /api/auth/me)
// ==========================================
exports.getMe = async (req, res) => {
  try {
    if (req.user.role === 'patient') {
      const profile = await PatientProfile.findOne({ account: req.user.id });
      return res.status(200).json({ profile });
    }
    res.status(200).json({ profile: null });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// ==========================================
// 2FA — Setup (POST /api/auth/2fa/setup)
// ==========================================
exports.setup2FA = async (req, res) => {
  try {
    const account = await Account.findById(req.user.id);
    if (account.role !== 'administrateur') {
      return res.status(403).json({ message: "Le 2FA est réservé aux administrateurs." });
    }

    const secret = speakeasy.generateSecret({ name: `MediSync (${account.email})` });
    account.twoFactorSecret = secret.base32;
    await account.save({ validateModifiedOnly: true });

    const qrCode = await qrcode.toDataURL(secret.otpauth_url);

    res.status(200).json({ qrCode, otpauthUrl: secret.otpauth_url });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la configuration du 2FA", error: error.message });
  }
};

// ==========================================
// 2FA — Confirm setup (POST /api/auth/2fa/confirm-setup)
// L'admin connecté entre le code TOTP après avoir scanné le QR.
// On vérifie que le code correspond bien au secret généré.
// ==========================================
exports.confirmSetup2FA = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || !/^\d{6}$/.test(String(code))) {
      return res.status(400).json({ message: "Code TOTP invalide (6 chiffres requis)." });
    }

    const account = await Account.findById(req.user.id);
    if (!account || !account.twoFactorSecret) {
      return res.status(400).json({ message: "Aucun secret 2FA en cours. Régénérez le QR code." });
    }

    const isValid = speakeasy.totp.verify({
      secret: account.twoFactorSecret,
      encoding: 'base32',
      token: String(code),
      window: 1
    });

    if (!isValid) {
      return res.status(401).json({ message: "Code TOTP invalide. Réessayez." });
    }

    try {
      await logAudit('CREATION_COMPTE', { user: account, ip: req.ip }, account._id, '2FA activé');
    } catch (_) {}

    res.status(200).json({ message: "2FA activé avec succès." });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la confirmation du 2FA", error: error.message });
  }
};

// ==========================================
// 2FA — Verify (POST /api/auth/2fa/verify)
// ==========================================
exports.verify2FA = async (req, res) => {
  try {
    const { tempToken, code } = req.body;

    if (!tempToken || !code) {
      return res.status(400).json({ message: "Token temporaire et code TOTP requis." });
    }

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Token temporaire invalide ou expiré." });
    }

    const account = await Account.findById(decoded.id);
    if (!account || !account.twoFactorSecret) {
      return res.status(401).json({ message: "Compte introuvable ou 2FA non configuré." });
    }

    const isValid = speakeasy.totp.verify({
      secret: account.twoFactorSecret,
      encoding: 'base32',
      token: String(code),
      window: 1
    });

    if (!isValid) {
      return res.status(401).json({ message: "Code TOTP invalide." });
    }

    try {
      await logAudit('CONNEXION', { user: account, ip: req.ip }, null, 'Connexion admin avec 2FA');
    } catch (_) {}

    const token = generateToken(account._id);
    res.status(200).json({
      message: "Authentification 2FA réussie",
      token,
      account: { id: account._id, role: account.role }
    });

  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la vérification 2FA", error: error.message });
  }
};

// ==========================================
// 2FA — Disable (POST /api/auth/2fa/disable)
// ==========================================
exports.disable2FA = async (req, res) => {
  try {
    const { code } = req.body;
    const account = await Account.findById(req.user.id);

    if (!account.twoFactorSecret) {
      return res.status(400).json({ message: "Le 2FA n'est pas activé sur ce compte." });
    }

    const isValid = speakeasy.totp.verify({
      secret: account.twoFactorSecret,
      encoding: 'base32',
      token: String(code),
      window: 1
    });

    if (!isValid) {
      return res.status(401).json({ message: "Code TOTP invalide." });
    }

    account.twoFactorSecret = undefined;
    await account.save({ validateModifiedOnly: true });

    res.status(200).json({ message: "2FA désactivé avec succès." });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la désactivation du 2FA", error: error.message });
  }
};
