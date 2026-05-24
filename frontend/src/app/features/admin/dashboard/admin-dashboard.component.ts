/**
 * Composant AdminDashboardComponent — tableau de bord administrateur.
 *
 * - Cartes KPI (rendez-vous du jour, factures en attente, taux d'occupation, etc.) via AnalyticsService.
 * - Navigation rapide vers les écrans d'administration (staff, facility, analytics, audit, 2fa).
 */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AnalyticsService } from '../../../core/services/analytics.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2>Tableau de bord</h2>
          <div class="page-subtitle">Vue d'ensemble de l'activité de la clinique</div>
        </div>
        <a mat-raised-button color="primary" routerLink="/admin/analytics">
          <mat-icon>insights</mat-icon> Voir les analytiques
        </a>
      </div>

      <!-- KPI grid -->
      <div class="stat-grid">
        <a class="stat-card" routerLink="/admin/analytics">
          <div class="stat-icon green"><mat-icon>payments</mat-icon></div>
          <div>
            <div class="stat-label">Rendez-vous (mois)</div>
            <div class="stat-value">{{ kpis?.totalAppointmentsMonth ?? '—' }}</div>
            <div class="stat-sub">consultations programmées</div>
          </div>
        </a>
        <a class="stat-card" routerLink="/admin/analytics">
          <div class="stat-icon amber"><mat-icon>person_off</mat-icon></div>
          <div>
            <div class="stat-label">Taux de no-show</div>
            <div class="stat-value">{{ kpis?.noShowRate ?? '—' }}</div>
            <div class="stat-sub">{{ kpis?.noShowCount || 0 }} absences ce mois</div>
          </div>
        </a>
        <a class="stat-card" routerLink="/admin/staff">
          <div class="stat-icon purple"><mat-icon>badge</mat-icon></div>
          <div>
            <div class="stat-label">Personnel</div>
            <div class="stat-value">{{ kpis?.consultationsPerDoctor?.length ?? '—' }}</div>
            <div class="stat-sub">médecins actifs</div>
          </div>
        </a>
        <a class="stat-card" routerLink="/admin/analytics">
          <div class="stat-icon cyan"><mat-icon>people</mat-icon></div>
          <div>
            <div class="stat-label">Patients</div>
            <div class="stat-value">{{ kpis?.totalPatients ?? '—' }}</div>
            <div class="stat-sub">enregistrés</div>
          </div>
        </a>
      </div>

      <!-- Top doctors -->
      <div class="card" style="margin-bottom:20px" *ngIf="kpis?.consultationsPerDoctor?.length">
        <div class="card-header">
          <h3>Top consultations du mois</h3>
          <div class="card-subtitle">Activité par praticien</div>
        </div>
        <div *ngFor="let d of kpis.consultationsPerDoctor.slice(0, 5)"
          style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
          <div style="display:flex;align-items:center;gap:12px">
            <div class="avatar-circle" style="width:32px;height:32px;font-size:12px">
              {{ docInitials(d.doctorName) }}
            </div>
            <strong style="font-size:14px">Dr. {{ d.doctorName }}</strong>
          </div>
          <div style="display:flex;align-items:center;gap:14px">
            <div style="width:120px;height:6px;background:var(--surface-2);border-radius:3px;overflow:hidden">
              <div [style.width]="(d.count / topMax * 100) + '%'"
                style="height:100%;background:var(--primary);border-radius:3px"></div>
            </div>
            <strong style="font-size:14px;color:var(--primary-dark);min-width:32px;text-align:right">{{ d.count }}</strong>
          </div>
        </div>
      </div>

      <!-- Quick nav -->
      <div class="card">
        <div class="card-header"><h3>Accès rapide</h3></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px">
          <a routerLink="/admin/facility" class="stat-card" style="padding:16px 18px">
            <div style="display:flex;align-items:center;gap:14px">
              <div class="stat-icon teal" style="margin-bottom:0;flex-shrink:0"><mat-icon>apartment</mat-icon></div>
              <div>
                <div style="font-weight:600;font-size:14px;color:var(--text)">Établissement</div>
                <div style="font-size:12px;color:var(--text-muted)">Salles et équipements</div>
              </div>
            </div>
          </a>
          <a routerLink="/admin/audit" class="stat-card" style="padding:16px 18px">
            <div style="display:flex;align-items:center;gap:14px">
              <div class="stat-icon amber" style="margin-bottom:0;flex-shrink:0"><mat-icon>fact_check</mat-icon></div>
              <div>
                <div style="font-weight:600;font-size:14px;color:var(--text)">Journal d'audit</div>
                <div style="font-size:12px;color:var(--text-muted)">Traçabilité RGPD</div>
              </div>
            </div>
          </a>
          <a routerLink="/admin/2fa" class="stat-card" style="padding:16px 18px">
            <div style="display:flex;align-items:center;gap:14px">
              <div class="stat-icon red" style="margin-bottom:0;flex-shrink:0"><mat-icon>shield</mat-icon></div>
              <div>
                <div style="font-weight:600;font-size:14px;color:var(--text)">Sécurité 2FA</div>
                <div style="font-size:12px;color:var(--text-muted)">Double authentification</div>
              </div>
            </div>
          </a>
        </div>
      </div>
    </div>
  `
})
export class AdminDashboardComponent implements OnInit {
  kpis: any = null;
  topMax = 1;

  constructor(private analyticsSvc: AnalyticsService) {}

  ngOnInit(): void {
    this.analyticsSvc.getKpis().subscribe({
      next: k => {
        this.kpis = k;
        if (k?.consultationsPerDoctor?.length) {
          this.topMax = Math.max(...k.consultationsPerDoctor.map((d: any) => d.count));
        }
      }
    });
  }

  docInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map(s => s.charAt(0)).slice(0, 2).join('').toUpperCase();
  }
}
