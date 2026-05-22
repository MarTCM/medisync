import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuditLog } from '../models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly api = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) {}

  createStaff(data: {
    email: string; password: string; role: string; firstName: string; lastName: string;
    specialties?: string[]; baseFee?: number;
    languages?: string[]; location?: string; sector?: 1 | 2 | 3;
    schedule?: { workDays?: string[]; startHour?: string; endHour?: string; defaultConsultationDuration?: 15 | 30 | 60 };
  }): Observable<any> {
    return this.http.post(`${this.api}/create-staff`, data);
  }

  updateStaff(id: string, data: {
    email?: string; firstName?: string; lastName?: string;
    specialties?: string[]; baseFee?: number;
    languages?: string[]; location?: string; sector?: 1 | 2 | 3;
    schedule?: { workDays?: string[]; startHour?: string; endHour?: string; defaultConsultationDuration?: 15 | 30 | 60 };
  }): Observable<any> {
    return this.http.patch(`${this.api}/staff/${id}`, data);
  }

  deleteAccount(id: string): Observable<any> {
    return this.http.delete(`${this.api}/accounts/${id}`);
  }

  listStaff(): Observable<{ staff: any[] }> {
    return this.http.get<{ staff: any[] }>(`${this.api}/staff`);
  }

  listPatients(): Observable<{ patients: any[] }> {
    return this.http.get<{ patients: any[] }>(`${this.api}/patients`);
  }

  listAudit(page = 1, limit = 50): Observable<{ logs: AuditLog[]; pagination: any }> {
    return this.http.get<{ logs: AuditLog[]; pagination: any }>(`${this.api}/audit`, {
      params: { page: page.toString(), limit: limit.toString() }
    });
  }
}
