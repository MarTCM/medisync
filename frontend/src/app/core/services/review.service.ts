/**
 * Service ReviewService — dépôt d'avis patients après consultation.
 *
 * - create : envoi d'une note + commentaire (et signalement d'insatisfaction le cas échéant).
 * - Seuls les patients peuvent appeler ce service ; un seul avis par RDV (contrôlé côté backend).
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly api = `${environment.apiUrl}/reviews`;

  constructor(private http: HttpClient) {}

  create(data: { appointmentId: string; rating: number; comment?: string; isIssueReport?: boolean }): Observable<any> {
    return this.http.post(this.api, data);
  }
}
