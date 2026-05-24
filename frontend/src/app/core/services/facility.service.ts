/**
 * Service FacilityService — configuration de la clinique (singleton).
 *
 * - get : lecture des informations (réponse { facility } à déballer).
 * - upsert : crée ou met à jour le document unique de la clinique (admin uniquement côté backend).
 * - addRoom / removeRoom : gestion des salles et de leur équipement.
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Facility } from '../models';

@Injectable({ providedIn: 'root' })
export class FacilityService {
  private readonly api = `${environment.apiUrl}/facility`;

  constructor(private http: HttpClient) {}

  get(): Observable<{ facility: Facility }> {
    return this.http.get<{ facility: Facility }>(this.api);
  }

  upsert(data: Partial<Facility>): Observable<{ facility: Facility }> {
    return this.http.put<{ facility: Facility }>(this.api, data);
  }

  addRoom(roomName: string, equipment: string[]): Observable<any> {
    return this.http.post(`${this.api}/rooms`, { roomName, equipment });
  }

  removeRoom(rid: string): Observable<any> {
    return this.http.delete(`${this.api}/rooms/${rid}`);
  }
}
