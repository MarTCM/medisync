export interface Account {
  id: string;
  email?: string;
  role: 'patient' | 'medecin' | 'secretaire' | 'administrateur';
}

export interface PatientProfile {
  _id: string;
  account: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  dependents?: Dependent[];
}

export interface Dependent {
  _id?: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  relation: 'enfant' | 'conjoint' | 'parent';
}

export interface DoctorProfile {
  _id: string;
  account: string | Account;
  firstName: string;
  lastName: string;
  specialties: string[];
  languages?: string[];
  location?: string;
  sector: 1 | 2 | 3;
  baseFee: number;
  schedule?: {
    workDays: string[];
    startHour: string;
    endHour: string;
    defaultConsultationDuration: 15 | 30 | 60;
  };
  leaves?: Leave[];
}

export interface Leave {
  _id?: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface Appointment {
  _id: string;
  patient: string | PatientProfile;
  doctor: string | DoctorProfile;
  dependentId?: string;
  startTime: string;
  endTime: string;
  duration: 15 | 30 | 60;
  reason: string;
  notes?: string;
  room?: string;
  status: 'en attente' | 'confirmé' | 'annulé' | 'terminé' | 'indisponible' | 'no-show';
  createdAt: string;
}

export interface Prescription {
  medication: string;
  dosage: string;
  duration: string;
}

export interface Consultation {
  _id: string;
  appointmentId?: string;
  doctorId: string | DoctorProfile;
  date: string;
  report: string;
  prescriptions: Prescription[];
}

export interface Attachment {
  _id?: string;
  fileUrl: string;
  fileName: string;
  fileType: 'PDF' | 'JPG' | 'PNG' | 'DICOM';
  uploadedAt: string;
}

export interface MedicalRecord {
  _id: string;
  patient: string;
  history: string[];
  allergies: string[];
  consultations: Consultation[];
  attachments: Attachment[];
}

export interface Invoice {
  _id: string;
  appointment: string;
  patient: string | PatientProfile;
  doctor: string | DoctorProfile;
  amount: number;
  nomenclature: string;
  status: 'payé' | 'en attente' | 'impayé';
  issuedAt: string;
  paidAt?: string;
}

export interface Review {
  _id: string;
  appointment: string;
  patient: string;
  doctor: string;
  rating: number;
  comment?: string;
  isIssueReport: boolean;
}

export interface Facility {
  _id?: string;
  name: string;
  address: string;
  contactEmail?: string;
  contactPhone?: string;
  specialtiesOffered: string[];
  openingHours: string;
  rooms: Room[];
}

export interface Room {
  _id?: string;
  roomName: string;
  equipment: string[];
}

export interface AuditLog {
  _id: string;
  userAccount: Account;
  action: string;
  targetId?: string;
  ipAddress?: string;
  details?: string;
  createdAt: string;
}

export interface AuthResponse {
  token?: string;
  requires2FA?: boolean;
  tempToken?: string;
  account?: Account;
  message?: string;
}
