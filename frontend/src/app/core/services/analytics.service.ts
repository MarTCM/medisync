import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AnalyticsExportParams {
  granularity?: 'day' | 'week' | 'month' | 'year';
  from?: string;
  to?: string;
}

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

  exportPdf(params?: AnalyticsExportParams): Observable<Blob> {
    return this.http.get(`${this.api}/export.pdf`, { responseType: 'blob', params: this.toParams(params) });
  }

  exportExcel(params?: AnalyticsExportParams): Observable<Blob> {
    return this.http.get(`${this.api}/export.xlsx`, { responseType: 'blob', params: this.toParams(params) });
  }

  private toParams(params?: AnalyticsExportParams): HttpParams {
    let p = new HttpParams();
    if (!params) return p;
    if (params.granularity) p = p.set('granularity', params.granularity);
    if (params.from) p = p.set('from', params.from);
    if (params.to) p = p.set('to', params.to);
    return p;
  }
}
