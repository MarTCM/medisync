import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Appointment } from '../models';

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private readonly api = `${environment.apiUrl}/appointments`;

  constructor(private http: HttpClient) {}

  create(data: Partial<Appointment> & { date: string; time: string }): Observable<{ appointment: Appointment }> {
    return this.http.post<{ appointment: Appointment }>(this.api, data);
  }

  getAll(date?: string): Observable<{ appointments: Appointment[] }> {
    if (date) {
      return this.http.get<{ appointments: Appointment[] }>(this.api, { params: { date } });
    }
    return this.http.get<{ appointments: Appointment[] }>(this.api);
  }

  getMine(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.api}/my-appointments`);
  }

  getDoctorDaily(date: string): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.api}/doctor/daily`, { params: { date } });
  }

  cancel(id: string): Observable<any> {
    return this.http.patch(`${this.api}/${id}/cancel`, {});
  }

  reschedule(id: string, date: string, time: string): Observable<any> {
    return this.http.patch(`${this.api}/${id}/reschedule`, { date, time });
  }

  confirm(id: string): Observable<any> {
    return this.http.patch(`${this.api}/${id}/confirm`, {});
  }

  markNoShow(id: string): Observable<any> {
    return this.http.patch(`${this.api}/${id}/no-show`, {});
  }

  setUnavailability(data: { date: string; startTime: string; endTime: string; reason?: string }): Observable<any> {
    return this.http.post(`${this.api}/unavailability`, data);
  }
}
