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

  const Account        = require('./src/models/Account');
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

  // ── Secretary ────────────────────────────────────────────────────────────
  await Account.findOneAndUpdate(
    { email: 'secretary@medisync.demo' },
    { email: 'secretary@medisync.demo', password, role: 'secretaire',
      firstName: 'Nadia', lastName: 'Ouhbi', isActive: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log('✓ Secretary upserted');

  // ════════════════════════════════════════════════════════════════════════
  // DOCTORS
  // ════════════════════════════════════════════════════════════════════════

  // ── Doctor 1 — Cardiology (primary demo account) ─────────────────────
  const doctorAcc = await Account.findOneAndUpdate(
    { email: 'doctor@medisync.demo' },
    { email: 'doctor@medisync.demo', password, role: 'medecin',
      firstName: 'Fatima', lastName: 'Cherif', isActive: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const doctorProfile = await DoctorProfile.findOneAndUpdate(
    { account: doctorAcc._id },
    {
      account: doctorAcc._id,
      firstName: 'Fatima', lastName: 'Cherif',
      specialties: ['Cardiologie', 'Médecine générale'],
      languages: ['Français', 'Arabe'],
      location: 'Bâtiment A – Salle 3',
      sector: 2,
      baseFee: 250,
      fees: [
        { code: 'C',      label: 'Consultation générale',              price: 250  },
        { code: 'CS',     label: 'Consultation spécialisée',           price: 350  },
        { code: 'ECG',    label: 'Électrocardiogramme',                price: 180  },
        { code: 'ECH-C',  label: 'Échographie cardiaque (Doppler)',     price: 600  },
        { code: 'HOLTER', label: 'Holter ECG 24h',                     price: 900  },
        { code: 'EFR',    label: 'Épreuve fonctionnelle respiratoire',  price: 450  },
        { code: 'CONS-U', label: 'Consultation urgente',               price: 500  },
      ],
      schedule: {
        workDays: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'],
        startHour: '08:30',
        endHour: '17:30',
        defaultConsultationDuration: 30,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log('✓ Doctor 1 upserted:', doctorAcc.email, '— DoctorProfile:', doctorProfile._id);

  // Re-link stale appointments to current DoctorProfile (single-doctor demo)
  const doctorHeal = await Appointment.updateMany(
    { doctor: { $ne: doctorProfile._id } },
    { $set: { doctor: doctorProfile._id } }
  );
  if (doctorHeal.modifiedCount > 0) {
    console.log(`  ↳ Re-linked ${doctorHeal.modifiedCount} appointment(s) to Doctor 1`);
  }

  // ── Doctor 2 — Orthopedics ────────────────────────────────────────────
  const doc2Acc = await Account.findOneAndUpdate(
    { email: 'doctor2@medisync.demo' },
    { email: 'doctor2@medisync.demo', password, role: 'medecin',
      firstName: 'Karim', lastName: 'Amrani', isActive: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await DoctorProfile.findOneAndUpdate(
    { account: doc2Acc._id },
    {
      account: doc2Acc._id,
      firstName: 'Karim', lastName: 'Amrani',
      specialties: ['Orthopédie', 'Traumatologie'],
      languages: ['Français', 'Arabe', 'Anglais'],
      location: 'Bâtiment B – Salle 1',
      sector: 2,
      baseFee: 300,
      fees: [
        { code: 'C',       label: 'Consultation orthopédique',          price: 300  },
        { code: 'CS',      label: 'Consultation spécialisée',           price: 400  },
        { code: 'RX',      label: 'Radiographie standard (2 incid.)',   price: 200  },
        { code: 'INFIL',   label: 'Infiltration articulaire',           price: 700  },
        { code: 'PLAT',    label: 'Plâtre ou attelle',                  price: 350  },
        { code: 'REEDU',   label: 'Bilan de rééducation',              price: 250  },
        { code: 'CONS-U',  label: 'Consultation urgente / traumato',    price: 550  },
      ],
      schedule: {
        workDays: ['Lundi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
        startHour: '09:00',
        endHour: '18:00',
        defaultConsultationDuration: 30,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log('✓ Doctor 2 upserted:', doc2Acc.email);

  // ── Doctor 3 — Pediatrics ─────────────────────────────────────────────
  const doc3Acc = await Account.findOneAndUpdate(
    { email: 'doctor3@medisync.demo' },
    { email: 'doctor3@medisync.demo', password, role: 'medecin',
      firstName: 'Leila', lastName: 'Mansouri', isActive: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await DoctorProfile.findOneAndUpdate(
    { account: doc3Acc._id },
    {
      account: doc3Acc._id,
      firstName: 'Leila', lastName: 'Mansouri',
      specialties: ['Pédiatrie'],
      languages: ['Français', 'Arabe', 'Darija'],
      location: 'Bâtiment A – Salle 5',
      sector: 1,
      baseFee: 200,
      fees: [
        { code: 'C',      label: 'Consultation pédiatrique',            price: 200  },
        { code: 'C-NNE',  label: 'Consultation nouveau-né',             price: 250  },
        { code: 'VACCIN', label: 'Vaccination (hors vaccin)',           price: 100  },
        { code: 'CROISS', label: 'Bilan de croissance',                 price: 300  },
        { code: 'ECH-A',  label: 'Échographie abdominale pédiatrique',  price: 400  },
        { code: 'DERM',   label: 'Acte dermatologique simple',          price: 180  },
        { code: 'CONS-U', label: 'Consultation urgente pédiatrique',    price: 400  },
      ],
      schedule: {
        workDays: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'],
        startHour: '09:00',
        endHour: '17:00',
        defaultConsultationDuration: 20,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log('✓ Doctor 3 upserted:', doc3Acc.email);

  // ── Doctor 4 — Radiology / Medical Imaging ────────────────────────────
  const doc4Acc = await Account.findOneAndUpdate(
    { email: 'doctor4@medisync.demo' },
    { email: 'doctor4@medisync.demo', password, role: 'medecin',
      firstName: 'Omar', lastName: 'Bensouda', isActive: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await DoctorProfile.findOneAndUpdate(
    { account: doc4Acc._id },
    {
      account: doc4Acc._id,
      firstName: 'Omar', lastName: 'Bensouda',
      specialties: ['Radiologie', 'Imagerie médicale'],
      languages: ['Français', 'Arabe', 'Anglais'],
      location: 'Bâtiment C – Salle Imagerie',
      sector: 2,
      baseFee: 350,
      fees: [
        { code: 'C',        label: 'Consultation radiologique',          price: 350  },
        { code: 'RX-TH',   label: 'Radiographie thoracique',            price: 150  },
        { code: 'RX-OS',   label: 'Radiographie osseuse (2 incid.)',    price: 180  },
        { code: 'ECH-AB',  label: 'Échographie abdominale',             price: 500  },
        { code: 'ECH-PEL', label: 'Échographie pelvienne',              price: 500  },
        { code: 'SCAN',    label: 'Scanner (TDM) sans injection',       price: 1400 },
        { code: 'SCAN-C',  label: 'Scanner avec injection de contraste',price: 1800 },
        { code: 'IRM',     label: 'IRM standard',                       price: 2500 },
        { code: 'MAMMO',   label: 'Mammographie bilatérale',            price: 650  },
      ],
      schedule: {
        workDays: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
        startHour: '08:00',
        endHour: '16:00',
        defaultConsultationDuration: 30,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log('✓ Doctor 4 upserted:', doc4Acc.email);

  // ── Doctor 5 — Dermatology ────────────────────────────────────────────
  const doc5Acc = await Account.findOneAndUpdate(
    { email: 'doctor5@medisync.demo' },
    { email: 'doctor5@medisync.demo', password, role: 'medecin',
      firstName: 'Amina', lastName: 'Hajji', isActive: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await DoctorProfile.findOneAndUpdate(
    { account: doc5Acc._id },
    {
      account: doc5Acc._id,
      firstName: 'Amina', lastName: 'Hajji',
      specialties: ['Dermatologie', 'Vénérologie'],
      languages: ['Français', 'Arabe', 'Espagnol'],
      location: 'Bâtiment A – Salle 7',
      sector: 2,
      baseFee: 300,
      fees: [
        { code: 'C',       label: 'Consultation dermatologique',         price: 300  },
        { code: 'CS',      label: 'Consultation spécialisée',            price: 400  },
        { code: 'CRYO',    label: 'Cryothérapie (par lésion)',           price: 200  },
        { code: 'BIOPS',   label: 'Biopsie cutanée',                     price: 600  },
        { code: 'LASER',   label: 'Séance laser dermatologique',         price: 800  },
        { code: 'DERMOS',  label: 'Dermoscopie numérique',               price: 250  },
        { code: 'ACNE',    label: 'Soins acné / extraction comédons',    price: 350  },
        { code: 'CONS-U',  label: 'Consultation urgente',                price: 450  },
      ],
      schedule: {
        workDays: ['Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
        startHour: '10:00',
        endHour: '19:00',
        defaultConsultationDuration: 30,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log('✓ Doctor 5 upserted:', doc5Acc.email);

  // ════════════════════════════════════════════════════════════════════════
  // PATIENTS
  // ════════════════════════════════════════════════════════════════════════

  // ── Patient 1 — Youssef Tazi (primary demo / marwane's account) ───────
  const pat1Acc = await Account.findOneAndUpdate(
    { email: 'marwane.elbaraka@gmail.com' },
    { email: 'marwane.elbaraka@gmail.com', password, role: 'patient',
      firstName: 'Youssef', lastName: 'Tazi', isActive: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const pat1Profile = await PatientProfile.findOneAndUpdate(
    { account: pat1Acc._id },
    {
      account: pat1Acc._id,
      firstName: 'Youssef', lastName: 'Tazi',
      dateOfBirth: new Date('1985-06-15'),
      phoneNumber: '+212 6 61 23 45 67',
      dependents: [
        {
          firstName: 'Nour', lastName: 'Tazi',
          dateOfBirth: new Date('2014-09-03'),
          relation: 'enfant',
          allergies: ['Lactose'],
          notes: 'Suivi pédiatrique annuel',
        },
        {
          firstName: 'Hind', lastName: 'Tazi',
          dateOfBirth: new Date('2017-02-18'),
          relation: 'enfant',
          allergies: [],
          notes: '',
        },
      ],
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log('✓ Patient 1 upserted:', pat1Acc.email, '— PatientProfile:', pat1Profile._id);

  // ── Patient 2 — Salma Idrissi ─────────────────────────────────────────
  const pat2Acc = await Account.findOneAndUpdate(
    { email: 'patient2@medisync.demo' },
    { email: 'patient2@medisync.demo', password, role: 'patient',
      firstName: 'Salma', lastName: 'Idrissi', isActive: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const pat2Profile = await PatientProfile.findOneAndUpdate(
    { account: pat2Acc._id },
    {
      account: pat2Acc._id,
      firstName: 'Salma', lastName: 'Idrissi',
      dateOfBirth: new Date('1992-03-22'),
      phoneNumber: '+212 6 72 34 56 78',
      dependents: [],
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log('✓ Patient 2 upserted:', pat2Acc.email, '— PatientProfile:', pat2Profile._id);

  // ── Patient 3 — Hassan El Fassi ───────────────────────────────────────
  const pat3Acc = await Account.findOneAndUpdate(
    { email: 'patient3@medisync.demo' },
    { email: 'patient3@medisync.demo', password, role: 'patient',
      firstName: 'Hassan', lastName: 'El Fassi', isActive: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await PatientProfile.findOneAndUpdate(
    { account: pat3Acc._id },
    {
      account: pat3Acc._id,
      firstName: 'Hassan', lastName: 'El Fassi',
      dateOfBirth: new Date('1975-11-08'),
      phoneNumber: '+212 6 63 45 67 89',
      dependents: [
        {
          firstName: 'Khadija', lastName: 'El Fassi',
          dateOfBirth: new Date('1978-04-12'),
          relation: 'conjoint',
          allergies: ['Aspirine'],
          notes: 'Suivi cardiologique en cours',
        },
      ],
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log('✓ Patient 3 upserted:', pat3Acc.email);

  // ── Patient 4 — Zineb Moussaoui ───────────────────────────────────────
  const pat4Acc = await Account.findOneAndUpdate(
    { email: 'patient4@medisync.demo' },
    { email: 'patient4@medisync.demo', password, role: 'patient',
      firstName: 'Zineb', lastName: 'Moussaoui', isActive: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await PatientProfile.findOneAndUpdate(
    { account: pat4Acc._id },
    {
      account: pat4Acc._id,
      firstName: 'Zineb', lastName: 'Moussaoui',
      dateOfBirth: new Date('2001-07-30'),
      phoneNumber: '+212 6 54 56 78 90',
      dependents: [],
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log('✓ Patient 4 upserted:', pat4Acc.email);

  // ── Patient 5 — Rachid Benkirane ──────────────────────────────────────
  const pat5Acc = await Account.findOneAndUpdate(
    { email: 'patient5@medisync.demo' },
    { email: 'patient5@medisync.demo', password, role: 'patient',
      firstName: 'Rachid', lastName: 'Benkirane', isActive: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await PatientProfile.findOneAndUpdate(
    { account: pat5Acc._id },
    {
      account: pat5Acc._id,
      firstName: 'Rachid', lastName: 'Benkirane',
      dateOfBirth: new Date('1965-02-14'),
      phoneNumber: '+212 6 65 67 89 01',
      dependents: [
        {
          firstName: 'Samira', lastName: 'Benkirane',
          dateOfBirth: new Date('1968-09-25'),
          relation: 'conjoint',
          allergies: [],
          notes: '',
        },
        {
          firstName: 'Amine', lastName: 'Benkirane',
          dateOfBirth: new Date('1995-12-01'),
          relation: 'enfant',
          allergies: ['Pénicilline'],
          notes: 'Allergie confirmée par test cutané',
        },
        {
          firstName: 'Rim', lastName: 'Benkirane',
          dateOfBirth: new Date('1999-06-17'),
          relation: 'enfant',
          allergies: [],
          notes: '',
        },
      ],
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log('✓ Patient 5 upserted:', pat5Acc.email);

  // Heal appointments whose patient reference points to a deleted PatientProfile
  const allPatientProfileIds = await PatientProfile.find({}, '_id');
  const validPatientIds = allPatientProfileIds.map(p => p._id);
  const patientHeal = await Appointment.updateMany(
    { patient: { $nin: validPatientIds }, reason: { $ne: 'indisponibilité' } },
    { $set: { patient: pat1Profile._id } }
  );
  if (patientHeal.modifiedCount > 0) {
    console.log(`  ↳ Re-linked ${patientHeal.modifiedCount} appointment(s) to Patient 1`);
  }

  // ── Facility ─────────────────────────────────────────────────────────────
  await Facility.findOneAndUpdate(
    {},
    {
      name: 'Clinique MediSync',
      address: '15, Boulevard Hassan II, Casablanca 20000',
      contactPhone: '+212 5 22 00 00 00',
      contactEmail: 'contact@medisync.demo',
      specialtiesOffered: [
        'Cardiologie', 'Médecine générale', 'Orthopédie',
        'Traumatologie', 'Pédiatrie', 'Radiologie',
        'Imagerie médicale', 'Dermatologie', 'Vénérologie',
      ],
      openingHours: 'Lun–Ven 08h–19h, Sam 09h–13h',
      rooms: [
        { roomName: 'Salle 3 – Cardiologie (Dr Cherif)',   equipment: ['ECG', 'Tensiomètre', 'Holter ECG'] },
        { roomName: 'Salle 1 – Orthopédie (Dr Amrani)',    equipment: ['Table d\'examen', 'Matériel de plâtre'] },
        { roomName: 'Salle 5 – Pédiatrie (Dr Mansouri)',   equipment: ['Pèse-bébé', 'Stéthoscope', 'Otoscope'] },
        { roomName: 'Salle Imagerie – (Dr Bensouda)',      equipment: ['Scanner TDM', 'IRM', 'Mammographe', 'Échographe'] },
        { roomName: 'Salle 7 – Dermatologie (Dr Hajji)',   equipment: ['Dermatoscope numérique', 'Laser', 'Cryostat'] },
        { roomName: 'Salle Urgences',                      equipment: ['Défibrillateur', 'Oxymètre', 'Brancard'] },
      ],
    },
    { upsert: true, new: true }
  );
  console.log('✓ Facility upserted');

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n--- Demo credentials (password: Demo1234!) ---');
  console.log('Admin      :', 'admin@medisync.demo');
  console.log('Secretary  :', 'secretary@medisync.demo');
  console.log('Doctor 1   :', 'doctor@medisync.demo',  '  (Cardiologie)');
  console.log('Doctor 2   :', 'doctor2@medisync.demo', ' (Orthopédie / Traumatologie)');
  console.log('Doctor 3   :', 'doctor3@medisync.demo', ' (Pédiatrie)');
  console.log('Doctor 4   :', 'doctor4@medisync.demo', ' (Radiologie / Imagerie)');
  console.log('Doctor 5   :', 'doctor5@medisync.demo', ' (Dermatologie)');
  console.log('Patient 1  :', 'marwane.elbaraka@gmail.com', '(Youssef Tazi — 2 enfants)');
  console.log('Patient 2  :', 'patient2@medisync.demo', '(Salma Idrissi)');
  console.log('Patient 3  :', 'patient3@medisync.demo', '(Hassan El Fassi — conjoint)');
  console.log('Patient 4  :', 'patient4@medisync.demo', '(Zineb Moussaoui)');
  console.log('Patient 5  :', 'patient5@medisync.demo', '(Rachid Benkirane — conjoint + 2 enfants)');

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
