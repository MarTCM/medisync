import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DoctorProfile, Leave } from '../models';

@Injectable({ providedIn: 'root' })
export class DoctorService {
  private readonly api = `${environment.apiUrl}/doctors`;

  constructor(private http: HttpClient) {}

  search(params: { specialty?: string; location?: string; language?: string; name?: string }): Observable<{ doctors: DoctorProfile[] }> {
    return this.http.get<{ doctors: DoctorProfile[] }>(`${this.api}/search`, { params: params as any });
  }

  getMe(): Observable<{ doctor: DoctorProfile }> {
    return this.http.get<{ doctor: DoctorProfile }>(`${this.api}/me`);
  }

  updateMe(data: Partial<DoctorProfile>): Observable<{ doctor: DoctorProfile }> {
    return this.http.patch<{ doctor: DoctorProfile }>(`${this.api}/me`, data);
  }

  addLeave(leave: { startDate: string; endDate: string; reason?: string }): Observable<any> {
    return this.http.post(`${this.api}/me/leaves`, leave);
  }

  listLeaves(): Observable<{ leaves: Leave[] }> {
    return this.http.get<{ leaves: Leave[] }>(`${this.api}/me/leaves`);
  }

  removeLeave(lid: string): Observable<any> {
    return this.http.delete(`${this.api}/me/leaves/${lid}`);
  }
}
