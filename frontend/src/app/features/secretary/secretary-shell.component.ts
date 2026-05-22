import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-secretary-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  template: `
    <div class="app-shell">
      <nav class="sidebar-nav">
        <div class="nav-logo">
          <div class="logo-mark"><mat-icon>local_hospital</mat-icon></div>
          <div class="logo-text">
            <div class="logo-title">MediSync</div>
            <div class="logo-role">Secrétariat</div>
          </div>
        </div>

        <div class="nav-section">
          <div class="nav-label">Navigation</div>
          <a routerLink="/secretary" routerLinkActive="active-link" [routerLinkActiveOptions]="{exact:true}">
            <mat-icon>event_note</mat-icon> Planning
          </a>
          <a routerLink="/secretary/patients" routerLinkActive="active-link">
            <mat-icon>people</mat-icon> Patients
          </a>
          <a routerLink="/secretary/invoices" routerLinkActive="active-link">
            <mat-icon>receipt</mat-icon> Facturation
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
export class SecretaryShellComponent {
  constructor(public auth: AuthService) {}
}
