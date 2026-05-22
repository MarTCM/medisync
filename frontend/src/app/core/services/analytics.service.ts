import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly api = `${environment.apiUrl}/analytics`;

  constructor(private http: HttpClient) {}

  getKpis(): Observable<any> {
    return this.http.get(`${this.api}/kpis`);
  }

  getRevenue(): Observable<any> {
    return this.http.get(`${this.api}/revenue`);
  }

  exportPdf(): Observable<Blob> {
    return this.http.get(`${this.api}/export.pdf`, { responseType: 'blob' });
  }

  exportExcel(): Observable<Blob> {
    return this.http.get(`${this.api}/export.xlsx`, { responseType: 'blob' });
  }
}
