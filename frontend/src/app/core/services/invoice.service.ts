/**
 * Service InvoiceService — facturation et règlements côté frontend.
 *
 * - create : crée une facture liée à un RDV (secrétaire/admin).
 * - getMine / getAll / getOverdue : listings selon le rôle, réponses à déballer (.invoices).
 * - downloadPdf : téléchargement du PDF en blob (utilisé par mes-factures et l'écran secrétaire).
 * - markPaid : marque une facture comme réglée.
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Invoice } from '../models';

@Injectable({ providedIn: 'root' })
export class InvoiceService {
  private readonly api = `${environment.apiUrl}/invoices`;

  constructor(private http: HttpClient) {}

  create(data: { appointmentId: string; patientId: string; doctorId: string; amount: number; nomenclature: string }): Observable<{ invoice: Invoice }> {
    return this.http.post<{ invoice: Invoice }>(this.api, data);
  }

  getMine(): Observable<{ invoices: Invoice[] }> {
    return this.http.get<{ invoices: Invoice[] }>(`${this.api}/mine`);
  }

  getAll(): Observable<{ invoices: Invoice[] }> {
    return this.http.get<{ invoices: Invoice[] }>(this.api);
  }

  getOverdue(): Observable<{ invoices: Invoice[] }> {
    return this.http.get<{ invoices: Invoice[] }>(`${this.api}/overdue`);
  }

  downloadPdf(id: string): Observable<Blob> {
    return this.http.get(`${this.api}/${id}/pdf`, { responseType: 'blob' });
  }

  downloadFeuilleSoins(id: string): Observable<Blob> {
    return this.http.get(`${this.api}/${id}/feuille-soins`, { responseType: 'blob' });
  }

  sendEmail(id: string): Observable<any> {
    return this.http.post(`${this.api}/${id}/send-email`, {});
  }

  markPaid(id: string): Observable<any> {
    return this.http.patch(`${this.api}/${id}/pay`, {});
  }
}
