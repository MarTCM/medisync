/**
 * Service RecordService — dossier médical et documents joints.
 *
 * - getMyRecord / updateMyRecord : pour le patient (antécédents, allergies).
 * - addConsultation : pour le médecin (compte rendu + prescriptions).
 * - uploadDocument(ForPatient) : envoi multipart/form-data du document (multer côté backend, 20 Mo max).
 * - getPatientRecord : lecture du dossier par médecin/secrétaire/admin (journalisée).
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MedicalRecord } from '../models';

@Injectable({ providedIn: 'root' })
export class RecordService {
  private readonly api = `${environment.apiUrl}/records`;

  constructor(private http: HttpClient) {}

  getMyRecord(): Observable<{ record: MedicalRecord }> {
    return this.http.get<{ record: MedicalRecord }>(`${this.api}/my-record`);
  }

  updateMyRecord(data: { history?: string[]; allergies?: string[] }): Observable<{ record: MedicalRecord }> {
    return this.http.patch<{ record: MedicalRecord }>(`${this.api}/my-record`, data);
  }

  addConsultation(data: { patientId: string; appointmentId?: string; report: string; prescriptions: any[] }): Observable<any> {
    return this.http.post(this.api, data);
  }

  uploadDocument(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('document', file);
    return this.http.post(`${this.api}/upload`, formData);
  }

  uploadDocumentForPatient(patientId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('document', file);
    return this.http.post(`${this.api}/upload/${patientId}`, formData);
  }

  downloadPrescription(consultationId: string): Observable<Blob> {
    return this.http.get(`${this.api}/my-record/consultations/${consultationId}/prescription/pdf`, {
      responseType: 'blob'
    });
  }

  getPatientRecord(patientId: string): Observable<{ record: MedicalRecord }> {
    return this.http.get<{ record: MedicalRecord }>(`${this.api}/patient/${patientId}`);
  }
}
