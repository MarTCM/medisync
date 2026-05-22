import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-practitioner-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  template: `
    <div class="app-shell">
      <nav class="sidebar-nav">
        <div class="nav-logo">
          <div class="logo-mark"><mat-icon>local_hospital</mat-icon></div>
          <div class="logo-text">
            <div class="logo-title">MediSync</div>
            <div class="logo-role">Médecin</div>
          </div>
        </div>

        <div class="nav-section">
          <div class="nav-label">Navigation</div>
          <a routerLink="/doctor" routerLinkActive="active-link" [routerLinkActiveOptions]="{exact:true}">
            <mat-icon>today</mat-icon> Planning
          </a>
          <a routerLink="/doctor/availability" routerLinkActive="active-link">
            <mat-icon>schedule</mat-icon> Disponibilités
          </a>
          <a routerLink="/doctor/leaves" routerLinkActive="active-link">
            <mat-icon>beach_access</mat-icon> Congés / Absences
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
export class PractitionerShellComponent {
  constructor(public auth: AuthService) {}
}
