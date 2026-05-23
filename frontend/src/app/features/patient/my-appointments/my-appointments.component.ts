import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AppointmentService } from '../../../core/services/appointment.service';
import { Appointment } from '../../../core/models';

@Component({
  selector: 'app-my-appointments',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2>Mes rendez-vous</h2>
          <div class="page-subtitle">Suivez et gérez toutes vos consultations</div>
        </div>
        <a mat-raised-button color="primary" routerLink="/patient/search">
          <mat-icon>add</mat-icon> Nouveau RDV
        </a>
      </div>

      <div *ngIf="loading" style="text-align:center;padding:48px;color:var(--text-muted)">
        Chargement…
      </div>

      <div *ngIf="error" class="msg-error">
        <mat-icon>error_outline</mat-icon> {{ error }}
      </div>

      <ng-container *ngIf="!loading && !error">
        <!-- Empty -->
        <div *ngIf="appointments.length === 0" class="empty-state">
          <mat-icon>event_available</mat-icon>
          <div class="empty-title">Aucun rendez-vous</div>
          <p>Prenez votre premier rendez-vous avec un médecin</p>
          <a mat-raised-button color="primary" routerLink="/patient/search" class="empty-action">
            <mat-icon>search</mat-icon> Trouver un médecin
          </a>
        </div>

        <!-- Upcoming -->
        <ng-container *ngIf="upcoming.length">
          <div class="section-label">À venir · {{ upcoming.length }}</div>
          <div class="apt-row" *ngFor="let apt of upcoming">
            <div class="apt-time">
              {{ apt.startTime | date:'d MMM y':'':'fr' }}
              <span style="display:block;font-size:12px;font-weight:500;color:var(--text-muted)">
                {{ apt.startTime | date:'HH:mm' }}
              </span>
            </div>
            <div class="apt-info">
              <div class="apt-name">
                <ng-container *ngIf="isObj(apt.doctor)">Dr. {{ $any(apt.doctor).firstName }} {{ $any(apt.doctor).lastName }}</ng-container>
                <span *ngIf="!isObj(apt.doctor)" style="color:var(--text-muted)">Médecin</span>
              </div>
              <!-- Third-party badge -->
              <div *ngIf="apt.dependentInfo" style="display:inline-flex;align-items:center;gap:5px;margin-top:3px;padding:2px 8px;background:var(--primary-light);border-radius:10px;font-size:12px;color:var(--primary);font-weight:500">
                <mat-icon style="font-size:13px;width:13px;height:13px">group</mat-icon>
                Pour : {{ apt.dependentInfo.firstName }} {{ apt.dependentInfo.lastName }}{{ apt.dependentInfo.dateOfBirth ? ' · ' + getAge(apt.dependentInfo.dateOfBirth) + ' ans' : '' }}
              </div>
              <div class="apt-meta">
                <mat-icon style="font-size:13px;width:13px;height:13px;vertical-align:-2px">medical_services</mat-icon>
                {{ apt.reason }}
              </div>
            </div>
            <div class="apt-actions">
              <span [class]="'status-badge ' + apt.status">{{ apt.status }}</span>
              <button mat-stroked-button
                *ngIf="apt.status === 'en attente' || apt.status === 'confirmé'"
                (click)="cancel(apt)"
                style="font-size:12px;height:32px;line-height:30px;color:#dc2626;border-color:#fecaca">
                <mat-icon style="font-size:14px;width:14px;height:14px">close</mat-icon> Annuler
              </button>
            </div>
          </div>
        </ng-container>

        <!-- Past -->
        <ng-container *ngIf="past.length">
          <div class="section-label">Historique · {{ past.length }}</div>
          <div class="apt-row" *ngFor="let apt of past" style="opacity:0.85">
            <div class="apt-time">
              {{ apt.startTime | date:'d MMM y':'':'fr' }}
              <span style="display:block;font-size:12px;font-weight:500;color:var(--text-muted)">
                {{ apt.startTime | date:'HH:mm' }}
              </span>
            </div>
            <div class="apt-info">
              <div class="apt-name">
                <ng-container *ngIf="isObj(apt.doctor)">Dr. {{ $any(apt.doctor).firstName }} {{ $any(apt.doctor).lastName }}</ng-container>
                <span *ngIf="!isObj(apt.doctor)" style="color:var(--text-muted)">Médecin</span>
              </div>
              <div *ngIf="apt.dependentInfo" style="display:inline-flex;align-items:center;gap:5px;margin-top:3px;padding:2px 8px;background:var(--primary-light);border-radius:10px;font-size:12px;color:var(--primary);font-weight:500">
                <mat-icon style="font-size:13px;width:13px;height:13px">group</mat-icon>
                Pour : {{ apt.dependentInfo.firstName }} {{ apt.dependentInfo.lastName }}{{ apt.dependentInfo.dateOfBirth ? ' · ' + getAge(apt.dependentInfo.dateOfBirth) + ' ans' : '' }}
              </div>
              <div class="apt-meta">{{ apt.reason }}</div>
            </div>
            <div class="apt-actions">
              <span [class]="'status-badge ' + apt.status">{{ apt.status }}</span>
            </div>
          </div>
        </ng-container>
      </ng-container>
    </div>
  `
})
export class MyAppointmentsComponent implements OnInit {
  appointments: Appointment[] = [];
  upcoming: Appointment[] = [];
  past: Appointment[] = [];
  loading = true;
  error = '';

  constructor(private apptSvc: AppointmentService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.error = '';
    this.apptSvc.getMine().subscribe({
      next: apts => {
        this.appointments = (apts || []).filter(a => a._id && a.startTime);
        const now = new Date();
        this.upcoming = this.appointments
          .filter(a => new Date(a.startTime) >= now && a.status !== 'annulé' && a.status !== 'terminé')
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        this.past = this.appointments
          .filter(a => new Date(a.startTime) < now || a.status === 'annulé' || a.status === 'terminé')
          .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.error = err?.error?.message || 'Impossible de charger vos rendez-vous.';
      }
    });
  }

  cancel(apt: Appointment): void {
    if (!confirm('Annuler ce rendez-vous ?')) return;
    this.apptSvc.cancel(apt._id).subscribe({ next: () => this.load() });
  }

  isObj(d: any): boolean { return d && typeof d === 'object'; }

  getAge(dateOfBirth: string): number {
    const birth = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }
}
