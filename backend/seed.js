/**
 * Seed script — creates demo accounts for all four roles.
 * Run: node seed.js
 * Requires MONGO_URI and JWT_SECRET env vars (same as server.js).
 */
require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/medisync';

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Dynamic require after connect so models register properly
  const Account = require('./src/models/Account');
  const PatientProfile = require('./src/models/PatientProfile');
  const DoctorProfile = require('./src/models/DoctorProfile');
  const Facility = require('./src/models/Facility');

  // Clear existing seed data (accounts only — keeps real data)
  const seedEmails = [
    'admin@medisync.demo',
    'doctor@medisync.demo',
    'secretary@medisync.demo',
    'marwane.elbaraka@gmail.com',
    'patient2@medisync.demo'
  ];
  await Account.deleteMany({ email: { $in: seedEmails } });

  const password = 'Demo1234!';

  // Admin
  const admin = await Account.create({
    email: 'admin@medisync.demo',
    password,
    role: 'administrateur',
    firstName: 'Ali',
    lastName: 'Benali',
    isActive: true
  });
  console.log('✓ Admin created:', admin.email);

  // Doctor
  const doctorAcc = await Account.create({
    email: 'doctor@medisync.demo',
    password,
    role: 'medecin',
    firstName: 'Fatima',
    lastName: 'Cherif',
    isActive: true
  });
  await DoctorProfile.create({
    account: doctorAcc._id,
    firstName: 'Fatima',
    lastName: 'Cherif',
    specialties: ['Cardiologie', 'Médecine générale'],
    city: 'Casablanca',
    languages: ['Français', 'Arabe'],
    baseFee: 250,
    bio: 'Cardiologue expérimentée avec 15 ans de pratique.',
    isAvailable: true
  });
  console.log('✓ Doctor created:', doctorAcc.email);

  // Secretary
  const secAcc = await Account.create({
    email: 'secretary@medisync.demo',
    password,
    role: 'secretaire',
    firstName: 'Nadia',
    lastName: 'Ouhbi',
    isActive: true
  });
  console.log('✓ Secretary created:', secAcc.email);

  // Patient 1
  const pat1Acc = await Account.create({
    email: 'marwane.elbaraka@gmail.com',
    password,
    role: 'patient',
    firstName: 'Youssef',
    lastName: 'Tazi',
    isActive: true
  });
  await PatientProfile.create({
    account: pat1Acc._id,
    firstName: 'Youssef',
    lastName: 'Tazi',
    dateOfBirth: new Date('1985-06-15'),
    bloodType: 'A+',
    allergies: ['Pénicilline'],
    chronicConditions: ['Hypertension'],
    socialSecurityNumber: 'PAT-001'
  });
  console.log('✓ Patient 1 created:', pat1Acc.email);

  // Patient 2
  const pat2Acc = await Account.create({
    email: 'patient2@medisync.demo',
    password,
    role: 'patient',
    firstName: 'Salma',
    lastName: 'Idrissi',
    isActive: true
  });
  await PatientProfile.create({
    account: pat2Acc._id,
    firstName: 'Salma',
    lastName: 'Idrissi',
    dateOfBirth: new Date('1992-03-22'),
    bloodType: 'O-',
    allergies: [],
    chronicConditions: [],
    socialSecurityNumber: 'PAT-002'
  });
  console.log('✓ Patient 2 created:', pat2Acc.email);

  // Facility
  await Facility.findOneAndUpdate(
    {},
    {
      name: 'Clinique MediSync',
      address: '15, Boulevard Hassan II, Casablanca 20000',
      contactPhone: '+212 5 22 00 00 00',
      contactEmail: 'contact@medisync.demo',
      specialtiesOffered: ['Cardiologie', 'Médecine générale', 'Pédiatrie'],
      openingHours: 'Lun–Ven 08h–18h, Sam 09h–13h',
      rooms: [
        { roomName: 'Salle 1 — Consultation', equipment: ['ECG', 'Tensiomètre'] },
        { roomName: 'Salle 2 — Consultation', equipment: ['Stéthoscope'] },
        { roomName: 'Salle 3 — Urgences', equipment: ['Défibrillateur', 'Oxymètre'] }
      ]
    },
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
