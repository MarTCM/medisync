/**
 * Coquille (shell) du portail administrateur.
 *
 * - Layout parent des routes /admin/* (barre latérale + zone de contenu router-outlet).
 * - Affiche les liens vers dashboard, staff, facility, analytics, audit, 2fa.
 */
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  template: `
    <div class="app-shell">
      <nav class="sidebar-nav">
        <div class="nav-logo">
          <div class="logo-mark"><mat-icon>local_hospital</mat-icon></div>
          <div class="logo-text">
            <div class="logo-title">MediSync</div>
            <div class="logo-role">Administration</div>
          </div>
        </div>

        <div class="nav-section">
          <div class="nav-label">Pilotage</div>
          <a routerLink="/admin" routerLinkActive="active-link" [routerLinkActiveOptions]="{exact:true}">
            <mat-icon>dashboard</mat-icon> Tableau de bord
          </a>
          <a routerLink="/admin/analytics" routerLinkActive="active-link">
            <mat-icon>insights</mat-icon> Analytiques
          </a>

          <div class="nav-label" style="margin-top:18px">Gestion</div>
          <a routerLink="/admin/staff" routerLinkActive="active-link">
            <mat-icon>badge</mat-icon> Personnel
          </a>
          <a routerLink="/admin/facility" routerLinkActive="active-link">
            <mat-icon>apartment</mat-icon> Établissement
          </a>

          <div class="nav-label" style="margin-top:18px">Sécurité</div>
          <a routerLink="/admin/audit" routerLinkActive="active-link">
            <mat-icon>fact_check</mat-icon> Journal d'audit
          </a>
          <a routerLink="/admin/2fa" routerLinkActive="active-link">
            <mat-icon>shield</mat-icon> 2FA
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
export class AdminShellComponent {
  constructor(public auth: AuthService) {}
}
