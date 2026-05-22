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
