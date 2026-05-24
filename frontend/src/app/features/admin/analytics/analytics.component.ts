/**
 * Composant AdminAnalyticsComponent — tableau de bord analytique.
 *
 * - Affiche les KPIs et la ventilation du chiffre d'affaires (graphes Chart.js).
 * - Filtres de période (granularité jour/semaine/mois/année, plage from/to).
 * - Boutons d'export PDF / Excel via AnalyticsService.exportPdf / exportExcel.
 */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { AnalyticsService, AnalyticsExportParams } from '../../../core/services/analytics.service';
import { toLocalDateString } from '../../../core/utils/date';

@Component({
  selector: 'app-admin-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatDatepickerModule, MatNativeDateModule, NgChartsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2>Analytiques</h2>
          <div class="page-subtitle">Indicateurs clés et performance de la clinique</div>
        </div>
      </div>

      <!-- Export controls -->
      <div class="card" style="padding:14px 18px;margin-bottom:18px">
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
          <mat-form-field appearance="outline" style="width:170px;margin-bottom:-22px">
            <mat-label>Périodicité</mat-label>
            <mat-select [(ngModel)]="granularity">
              <mat-option value="day">Jour</mat-option>
              <mat-option value="week">Semaine</mat-option>
              <mat-option value="month">Mois</mat-option>
              <mat-option value="year">Année</mat-option>
              <mat-option value="custom">Personnalisé</mat-option>
            </mat-select>
          </mat-form-field>

          <ng-container *ngIf="granularity === 'custom'">
            <mat-form-field appearance="outline" style="width:170px;margin-bottom:-22px">
              <mat-label>Du</mat-label>
              <input matInput [matDatepicker]="fromPicker" [(ngModel)]="fromDate">
              <mat-datepicker-toggle matIconSuffix [for]="fromPicker"></mat-datepicker-toggle>
              <mat-datepicker #fromPicker></mat-datepicker>
            </mat-form-field>
            <mat-form-field appearance="outline" style="width:170px;margin-bottom:-22px">
              <mat-label>Au</mat-label>
              <input matInput [matDatepicker]="toPicker" [(ngModel)]="toDate">
              <mat-datepicker-toggle matIconSuffix [for]="toPicker"></mat-datepicker-toggle>
              <mat-datepicker #toPicker></mat-datepicker>
            </mat-form-field>
          </ng-container>

          <span style="flex:1"></span>

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
          <div class="stat-card" style="cursor:default">
            <div class="stat-icon amber"><mat-icon>meeting_room</mat-icon></div>
            <div>
              <div class="stat-label">Occupation salles</div>
              <div class="stat-value">{{ kpis.avgRoomOccupancy || 0 }}%</div>
              <div class="stat-sub">moyenne du mois</div>
            </div>
          </div>
        </div>

        <!-- Charts grid -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:18px;margin-top:18px">
          <div class="card" *ngIf="lineChartData.datasets[0].data.length">
            <div class="card-header">
              <h3>Évolution des recettes</h3>
              <div class="card-subtitle">12 derniers mois</div>
            </div>
            <div style="height:280px;padding:8px">
              <canvas baseChart
                [data]="lineChartData"
                [options]="lineChartOptions"
                type="line"></canvas>
            </div>
          </div>

          <div class="card" *ngIf="pieChartData.labels?.length">
            <div class="card-header">
              <h3>Consultations par spécialité</h3>
              <div class="card-subtitle">Ce mois</div>
            </div>
            <div style="height:280px;padding:8px;display:flex;justify-content:center">
              <canvas baseChart
                [data]="pieChartData"
                [options]="pieChartOptions"
                type="pie"></canvas>
            </div>
          </div>
        </div>

        <!-- Consultations per doctor -->
        <div class="card" style="margin-top:18px;margin-bottom:20px" *ngIf="kpis.consultationsPerDoctor?.length">
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

        <!-- Room occupancy -->
        <div class="card" style="margin-bottom:20px" *ngIf="kpis.roomOccupancy?.length">
          <div class="card-header">
            <h3>Occupation des salles</h3>
            <div class="card-subtitle">Ratio temps occupé / heures ouvrables</div>
          </div>
          <div *ngFor="let r of kpis.roomOccupancy" style="margin-bottom:14px">
            <div style="display:flex;justify-content:space-between;margin-bottom:6px">
              <span style="font-weight:500;font-size:13.5px">{{ r.roomName }}</span>
              <strong style="font-size:13.5px;color:var(--primary-dark)">{{ r.ratePct }}%</strong>
            </div>
            <div style="height:8px;background:var(--surface-2);border-radius:4px;overflow:hidden">
              <div [style.width.%]="r.ratePct"
                style="height:100%;background:#D97706;border-radius:4px;transition:width 0.4s"></div>
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

  granularity: 'day' | 'week' | 'month' | 'year' | 'custom' = 'month';
  fromDate: Date | null = null;
  toDate: Date | null = null;

  // Line chart (revenue evolution)
  lineChartData: ChartData<'line'> = { labels: [], datasets: [{ data: [], label: 'Recettes (DH)', borderColor: '#00838F', backgroundColor: 'rgba(0,131,143,0.15)', fill: true, tension: 0.35 }] };
  lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } }
  };

  // Pie chart (specialty breakdown)
  pieChartData: ChartData<'pie'> = { labels: [], datasets: [{ data: [], backgroundColor: ['#00838F', '#26A69A', '#5C6BC0', '#EF5350', '#FFA726', '#66BB6A', '#AB47BC', '#8D6E63'] }] };
  pieChartOptions: ChartConfiguration<'pie'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'right' } }
  };

  constructor(private analyticsSvc: AnalyticsService) {}

  ngOnInit(): void {
    this.analyticsSvc.getKpis().subscribe({
      next: k => {
        this.kpis = k;
        this.revenue = k?.revenueByMonth || [];
        this.buildCharts();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  buildCharts(): void {
    const months = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'];
    this.lineChartData = {
      labels: this.revenue.map(r => r._id ? `${months[r._id.month - 1]} ${String(r._id.year).slice(2)}` : (r.month || '—')),
      datasets: [{
        data: this.revenue.map(r => r.total || 0),
        label: 'Recettes (DH)',
        borderColor: '#00838F',
        backgroundColor: 'rgba(0,131,143,0.15)',
        fill: true,
        tension: 0.35
      }]
    };

    const bySpec = this.kpis?.consultationsBySpecialty || [];
    this.pieChartData = {
      labels: bySpec.map((s: any) => s.specialty),
      datasets: [{
        data: bySpec.map((s: any) => s.count),
        backgroundColor: ['#00838F', '#26A69A', '#5C6BC0', '#EF5350', '#FFA726', '#66BB6A', '#AB47BC', '#8D6E63']
      }]
    };
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

  private buildExportParams(): AnalyticsExportParams {
    if (this.granularity === 'custom') {
      const params: AnalyticsExportParams = { granularity: 'day' };
      if (this.fromDate) params.from = toLocalDateString(this.fromDate);
      if (this.toDate) params.to = toLocalDateString(this.toDate);
      return params;
    }
    return { granularity: this.granularity };
  }

  exportPdf(): void {
    this.analyticsSvc.exportPdf(this.buildExportParams()).subscribe(blob => this.downloadBlob(blob, 'analytics.pdf'));
  }

  exportExcel(): void {
    this.analyticsSvc.exportExcel(this.buildExportParams()).subscribe(blob => this.downloadBlob(blob, 'analytics.xlsx'));
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }
}
