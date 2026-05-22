import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AppointmentService } from '../../../core/services/appointment.service';
import { Appointment } from '../../../core/models';

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2>Bonjour 👋</h2>
          <div class="page-subtitle">Bienvenue dans votre espace MediSync</div>
        </div>
        <a mat-raised-button color="primary" routerLink="/patient/search">
          <mat-icon>add</mat-icon> Prendre un rendez-vous
        </a>
      </div>

      <!-- Quick links -->
      <div class="stat-grid">
        <a class="stat-card" routerLink="/patient/search">
          <div class="stat-icon cyan"><mat-icon>search</mat-icon></div>
          <div>
            <div class="stat-label">Recherche</div>
            <div class="stat-value" style="font-size:17px">Trouver un médecin</div>
            <div class="stat-sub">Par spécialité, langue ou ville</div>
          </div>
        </a>
        <a class="stat-card" routerLink="/patient/appointments">
          <div class="stat-icon blue"><mat-icon>event</mat-icon></div>
          <div>
            <div class="stat-label">Rendez-vous</div>
            <div class="stat-value">{{ upcoming.length }}</div>
            <div class="stat-sub">{{ upcoming.length > 1 ? 'consultations à venir' : 'consultation à venir' }}</div>
          </div>
        </a>
        <a class="stat-card" routerLink="/patient/record">
          <div class="stat-icon purple"><mat-icon>folder_shared</mat-icon></div>
          <div>
            <div class="stat-label">Dossier médical</div>
            <div class="stat-value" style="font-size:17px">Mes documents</div>
            <div class="stat-sub">Consultations & ordonnances</div>
          </div>
        </a>
        <a class="stat-card" routerLink="/patient/invoices">
          <div class="stat-icon amber"><mat-icon>receipt_long</mat-icon></div>
          <div>
            <div class="stat-label">Factures</div>
            <div class="stat-value" style="font-size:17px">Paiements</div>
            <div class="stat-sub">Suivi des règlements</div>
          </div>
        </a>
      </div>

      <!-- Next appointment hero -->
      <div *ngIf="next" class="card" style="background:linear-gradient(135deg, #ECFEFF 0%, #F0FDFA 100%); border-color:#CFFAFE; margin-bottom:24px">
        <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap">
          <div style="width:56px;height:56px;border-radius:14px;background:white;display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow-xs);flex-shrink:0">
            <mat-icon style="font-size:28px;width:28px;height:28px;color:var(--primary)">event_available</mat-icon>
          </div>
          <div style="flex:1;min-width:240px">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--primary-dark);margin-bottom:4px">Prochain rendez-vous</div>
            <div style="font-size:18px;font-weight:700;color:var(--text)">
              <ng-container *ngIf="isObj(next.doctor)">Dr. {{ $any(next.doctor).firstName }} {{ $any(next.doctor).lastName }}</ng-container>
            </div>
            <div style="font-size:13.5px;color:var(--text-secondary);margin-top:3px">
              <mat-icon style="font-size:14px;width:14px;height:14px;vertical-align:-2px">schedule</mat-icon>
              {{ next.startTime | date:'EEEE d MMMM y \\'à\\' HH:mm':'':'fr' }} · {{ next.reason }}
            </div>
          </div>
          <span [class]="'status-badge ' + next.status">{{ next.status }}</span>
        </div>
      </div>

      <!-- Upcoming appointments -->
      <div class="card">
        <div class="card-header">
          <div>
            <h3>Prochains rendez-vous</h3>
            <div class="card-subtitle">Vos consultations programmées</div>
          </div>
          <a mat-button routerLink="/patient/appointments" style="font-size:13px">
            Voir tout <mat-icon style="font-size:16px;width:16px;height:16px">arrow_forward</mat-icon>
          </a>
        </div>

        <div *ngIf="loading" style="color:var(--text-muted);padding:24px 0;text-align:center">Chargement…</div>

        <ng-container *ngIf="!loading">
          <div *ngFor="let apt of upcoming" class="apt-row" style="cursor:default">
            <div class="apt-time">
              {{ apt.startTime | date:'d MMM':'':'fr' }}
              <span style="display:block;font-size:12px;font-weight:500;color:var(--text-muted)">{{ apt.startTime | date:'HH:mm' }}</span>
            </div>
            <div class="apt-info">
              <div class="apt-name">
                <ng-container *ngIf="isObj(apt.doctor)">Dr. {{ $any(apt.doctor).firstName }} {{ $any(apt.doctor).lastName }}</ng-container>
              </div>
              <div class="apt-meta">{{ apt.reason }}</div>
            </div>
            <span [class]="'status-badge ' + apt.status">{{ apt.status }}</span>
          </div>

          <div *ngIf="upcoming.length === 0" class="empty-state" style="border:none;padding:32px 0">
            <mat-icon>event_available</mat-icon>
            <div class="empty-title">Aucun rendez-vous à venir</div>
            <p>Prenez rendez-vous avec un médecin dès maintenant</p>
            <a mat-raised-button color="primary" routerLink="/patient/search" class="empty-action">
              <mat-icon>search</mat-icon> Trouver un médecin
            </a>
          </div>
        </ng-container>
      </div>
    </div>
  `
})
export class PatientDashboardComponent implements OnInit {
  upcoming: Appointment[] = [];
  next: Appointment | null = null;
  loading = true;

  constructor(private apptSvc: AppointmentService) {}

  ngOnInit(): void {
    this.apptSvc.getMine().subscribe({
      next: apts => {
        const now = new Date();
        const future = (apts || [])
          .filter(a => new Date(a.startTime) > now && a.status !== 'annulé')
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        this.next = future[0] || null;
        this.upcoming = future.slice(0, 5);
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  isObj(d: any): boolean { return d && typeof d === 'object'; }
}
