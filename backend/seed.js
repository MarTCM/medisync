/**
 * Seed script — creates demo accounts for all four roles.
 * Run: node seed.js
 * Safe to re-run: uses upsert for profiles so ObjectIds stay stable across runs.
 * Requires MONGO_URI and JWT_SECRET env vars (same as server.js).
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/medisync';

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const Account     = require('./src/models/Account');
  const PatientProfile = require('./src/models/PatientProfile');
  const DoctorProfile  = require('./src/models/DoctorProfile');
  const Appointment    = require('./src/models/Appointment');
  const Facility       = require('./src/models/Facility');

  const password = await bcrypt.hash('Demo1234!', 10);

  // ── Admin ────────────────────────────────────────────────────────────────
  const admin = await Account.findOneAndUpdate(
    { email: 'admin@medisync.demo' },
    { email: 'admin@medisync.demo', password, role: 'administrateur',
      firstName: 'Ali', lastName: 'Benali', isActive: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log('✓ Admin upserted:', admin.email);

  // ── Doctor ───────────────────────────────────────────────────────────────
  const doctorAcc = await Account.findOneAndUpdate(
    { email: 'doctor@medisync.demo' },
    { email: 'doctor@medisync.demo', password, role: 'medecin',
      firstName: 'Fatima', lastName: 'Cherif', isActive: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const doctorProfile = await DoctorProfile.findOneAndUpdate(
    { firstName: 'Fatima', lastName: 'Cherif' },
    { account: doctorAcc._id, firstName: 'Fatima', lastName: 'Cherif',
      specialties: ['Cardiologie', 'Médecine générale'],
      city: 'Casablanca', languages: ['Français', 'Arabe'],
      baseFee: 250, bio: 'Cardiologue expérimentée avec 15 ans de pratique.',
      isAvailable: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log('✓ Doctor upserted:', doctorAcc.email, '— DoctorProfile:', doctorProfile._id);

  // Heal appointments pointing to a stale DoctorProfile (single-doctor demo)
  const doctorHeal = await Appointment.updateMany(
    { doctor: { $ne: doctorProfile._id } },
    { $set: { doctor: doctorProfile._id } }
  );
  if (doctorHeal.modifiedCount > 0) {
    console.log(`✓ Re-linked ${doctorHeal.modifiedCount} appointment(s) to current DoctorProfile`);
  }

  // ── Secretary ────────────────────────────────────────────────────────────
  await Account.findOneAndUpdate(
    { email: 'secretary@medisync.demo' },
    { email: 'secretary@medisync.demo', password, role: 'secretaire',
      firstName: 'Nadia', lastName: 'Ouhbi', isActive: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log('✓ Secretary upserted');

  // ── Patient 1 ────────────────────────────────────────────────────────────
  const pat1Acc = await Account.findOneAndUpdate(
    { email: 'marwane.elbaraka@gmail.com' },
    { email: 'marwane.elbaraka@gmail.com', password, role: 'patient',
      firstName: 'Youssef', lastName: 'Tazi', isActive: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const pat1Profile = await PatientProfile.findOneAndUpdate(
    { firstName: 'Youssef', lastName: 'Tazi' },
    { account: pat1Acc._id, firstName: 'Youssef', lastName: 'Tazi',
      dateOfBirth: new Date('1985-06-15'), bloodType: 'A+',
      allergies: ['Pénicilline'], chronicConditions: ['Hypertension'],
      socialSecurityNumber: 'PAT-001' },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log('✓ Patient 1 upserted:', pat1Acc.email, '— PatientProfile:', pat1Profile._id);

  // ── Patient 2 ────────────────────────────────────────────────────────────
  const pat2Acc = await Account.findOneAndUpdate(
    { email: 'patient2@medisync.demo' },
    { email: 'patient2@medisync.demo', password, role: 'patient',
      firstName: 'Salma', lastName: 'Idrissi', isActive: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const pat2Profile = await PatientProfile.findOneAndUpdate(
    { firstName: 'Salma', lastName: 'Idrissi' },
    { account: pat2Acc._id, firstName: 'Salma', lastName: 'Idrissi',
      dateOfBirth: new Date('1992-03-22'), bloodType: 'O-',
      allergies: [], chronicConditions: [],
      socialSecurityNumber: 'PAT-002' },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log('✓ Patient 2 upserted:', pat2Acc.email, '— PatientProfile:', pat2Profile._id);

  // Heal appointments whose patient reference points to a deleted PatientProfile
  const allPatientProfileIds = await PatientProfile.find({}, '_id');
  const validPatientIds = allPatientProfileIds.map(p => p._id);
  const patientHeal = await Appointment.updateMany(
    { patient: { $nin: validPatientIds }, reason: { $ne: 'indisponibilité' } },
    { $set: { patient: pat1Profile._id } }
  );
  if (patientHeal.modifiedCount > 0) {
    console.log(`✓ Re-linked ${patientHeal.modifiedCount} appointment(s) to current PatientProfile`);
  }

  // ── Facility ─────────────────────────────────────────────────────────────
  await Facility.findOneAndUpdate(
    {},
    { name: 'Clinique MediSync',
      address: '15, Boulevard Hassan II, Casablanca 20000',
      contactPhone: '+212 5 22 00 00 00',
      contactEmail: 'contact@medisync.demo',
      specialtiesOffered: ['Cardiologie', 'Médecine générale', 'Pédiatrie'],
      openingHours: 'Lun–Ven 08h–18h, Sam 09h–13h',
      rooms: [
        { roomName: 'Salle 1 — Consultation', equipment: ['ECG', 'Tensiomètre'] },
        { roomName: 'Salle 2 — Consultation', equipment: ['Stéthoscope'] },
        { roomName: 'Salle 3 — Urgences', equipment: ['Défibrillateur', 'Oxymètre'] }
      ] },
    { upsert: true, new: true }
  );
  console.log('✓ Facility upserted');

  console.log('\n--- Demo credentials (password: Demo1234!) ---');
  console.log('Admin    :', 'admin@medisync.demo');
  console.log('Doctor   :', 'doctor@medisync.demo');
  console.log('Secretary:', 'secretary@medisync.demo');
  console.log('Patient 1:', 'marwane.elbaraka@gmail.com');
  console.log('Patient 2:', 'patient2@medisync.demo');

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
