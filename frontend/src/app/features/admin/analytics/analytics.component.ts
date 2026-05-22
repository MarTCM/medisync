import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AnalyticsService } from '../../../core/services/analytics.service';

@Component({
  selector: 'app-admin-analytics',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2>Analytiques</h2>
          <div class="page-subtitle">Indicateurs clés et performance de la clinique</div>
        </div>
        <div style="display:flex; gap:8px">
          <button mat-stroked-button (click)="exportPdf()">
            <mat-icon>picture_as_pdf</mat-icon> Exporter PDF
          </button>
          <button mat-stroked-button (click)="exportExcel()">
            <mat-icon>table_chart</mat-icon> Exporter Excel
          </button>
        </div>
      </div>

      <div *ngIf="loading" style="text-align:center;padding:48px;color:var(--text-muted)">Chargement…</div>

      <ng-container *ngIf="!loading && kpis">
        <!-- KPI grid -->
        <div class="stat-grid">
          <div class="stat-card" style="cursor:default">
            <div class="stat-icon cyan"><mat-icon>people</mat-icon></div>
            <div>
              <div class="stat-label">Patients</div>
              <div class="stat-value">{{ kpis.totalPatients }}</div>
              <div class="stat-sub">enregistrés</div>
            </div>
          </div>
          <div class="stat-card" style="cursor:default">
            <div class="stat-icon blue"><mat-icon>event</mat-icon></div>
            <div>
              <div class="stat-label">Rendez-vous (mois)</div>
              <div class="stat-value">{{ kpis.totalAppointmentsMonth }}</div>
              <div class="stat-sub">consultations</div>
            </div>
          </div>
          <div class="stat-card" style="cursor:default">
            <div class="stat-icon red"><mat-icon>person_off</mat-icon></div>
            <div>
              <div class="stat-label">Taux no-show</div>
              <div class="stat-value">{{ kpis.noShowRate }}</div>
              <div class="stat-sub">{{ kpis.noShowCount }} absences</div>
            </div>
          </div>
          <div class="stat-card" style="cursor:default">
            <div class="stat-icon green"><mat-icon>payments</mat-icon></div>
            <div>
              <div class="stat-label">CA cumulé</div>
              <div class="stat-value">{{ totalRevenue }} <span style="font-size:14px">DH</span></div>
              <div class="stat-sub">{{ revenue.length }} mois</div>
            </div>
          </div>
        </div>

        <!-- Consultations per doctor -->
        <div class="card" style="margin-bottom:20px" *ngIf="kpis.consultationsPerDoctor?.length">
          <div class="card-header">
            <h3>Consultations par médecin</h3>
            <div class="card-subtitle">Ce mois</div>
          </div>
          <div *ngFor="let d of kpis.consultationsPerDoctor" style="margin-bottom:14px">
            <div style="display:flex;justify-content:space-between;margin-bottom:6px">
              <span style="font-weight:500;font-size:13.5px">Dr. {{ d.doctorName }}</span>
              <strong style="font-size:13.5px;color:var(--primary-dark)">{{ d.count }} consultations</strong>
            </div>
            <div style="height:8px;background:var(--surface-2);border-radius:4px;overflow:hidden">
              <div [style.width.%]="barPct(d.count)"
                style="height:100%;background:linear-gradient(90deg, var(--primary) 0%, var(--accent) 100%);border-radius:4px;transition:width 0.4s"></div>
            </div>
          </div>
        </div>

        <!-- Revenue table -->
        <div class="card" *ngIf="revenue?.length">
          <div class="card-header">
            <h3>Revenus mensuels</h3>
            <div class="card-subtitle">Historique des recettes</div>
          </div>
          <div class="data-table" style="border:none">
            <table>
              <thead>
                <tr>
                  <th>Période</th>
                  <th style="text-align:right">Factures</th>
                  <th style="text-align:right">Montant</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let r of revenue">
                  <td>{{ formatPeriod(r) }}</td>
                  <td style="text-align:right;color:var(--text-muted)">{{ r.count || '—' }}</td>
                  <td style="text-align:right;font-weight:600">{{ r.total }} DH</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </ng-container>
    </div>
  `
})
export class AdminAnalyticsComponent implements OnInit {
  kpis: any = null;
  revenue: any[] = [];
  loading = true;

  constructor(private analyticsSvc: AnalyticsService) {}

  ngOnInit(): void {
    this.analyticsSvc.getKpis().subscribe({
      next: k => {
        this.kpis = k;
        this.revenue = k?.revenueByMonth || [];
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  get totalRevenue(): number {
    return this.revenue.reduce((sum, r) => sum + (r.total || 0), 0);
  }

  formatPeriod(r: any): string {
    if (r.month) return r.month;
    if (r._id?.year && r._id?.month) {
      const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
      return `${months[r._id.month - 1]} ${r._id.year}`;
    }
    return '—';
  }

  barPct(count: number): number {
    const max = Math.max(...(this.kpis?.consultationsPerDoctor ?? []).map((d: any) => d.count), 1);
    return Math.round((count / max) * 100);
  }

  exportPdf(): void {
    this.analyticsSvc.exportPdf().subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'analytics.pdf'; a.click();
      URL.revokeObjectURL(url);
    });
  }

  exportExcel(): void {
    this.analyticsSvc.exportExcel().subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'analytics.xlsx'; a.click();
      URL.revokeObjectURL(url);
    });
  }
}
