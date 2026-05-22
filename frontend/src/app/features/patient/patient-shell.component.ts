import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-patient-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  template: `
    <div class="app-shell">
      <nav class="sidebar-nav">
        <div class="nav-logo">
          <div class="logo-mark"><mat-icon>local_hospital</mat-icon></div>
          <div class="logo-text">
            <div class="logo-title">MediSync</div>
            <div class="logo-role">Patient</div>
          </div>
        </div>

        <div class="nav-section">
          <div class="nav-label">Navigation</div>
          <a routerLink="/patient" routerLinkActive="active-link" [routerLinkActiveOptions]="{exact:true}">
            <mat-icon>dashboard</mat-icon> Tableau de bord
          </a>
          <a routerLink="/patient/search" routerLinkActive="active-link">
            <mat-icon>search</mat-icon> Trouver un médecin
          </a>
          <a routerLink="/patient/appointments" routerLinkActive="active-link">
            <mat-icon>event</mat-icon> Mes rendez-vous
          </a>
          <a routerLink="/patient/record" routerLinkActive="active-link">
            <mat-icon>folder_shared</mat-icon> Dossier médical
          </a>
          <a routerLink="/patient/invoices" routerLinkActive="active-link">
            <mat-icon>receipt_long</mat-icon> Mes factures
          </a>
          <a routerLink="/patient/review" routerLinkActive="active-link">
            <mat-icon>rate_review</mat-icon> Laisser un avis
          </a>
        </div>

        <div class="nav-footer">
          <a (click)="auth.logout()">
            <mat-icon>logout</mat-icon> Déconnexion
          </a>
        </div>
      </nav>
      <div class="main-content">
        <router-outlet />
      </div>
    </div>
  `
})
export class PatientShellComponent {
  constructor(public auth: AuthService) {}
}
