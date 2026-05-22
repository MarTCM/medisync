import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { InvoiceService } from '../../../core/services/invoice.service';
import { Invoice } from '../../../core/models';

@Component({
  selector: 'app-my-invoices',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2>Mes factures</h2>
          <div class="page-subtitle">Suivi des paiements et téléchargement des factures</div>
        </div>
      </div>

      <div *ngIf="loading" style="text-align:center;padding:48px;color:var(--text-muted)">Chargement…</div>

      <ng-container *ngIf="!loading">
        <!-- Summary -->
        <div class="stat-grid" *ngIf="invoices.length > 0">
          <div class="stat-card" style="cursor:default">
            <div class="stat-icon green"><mat-icon>check_circle</mat-icon></div>
            <div>
              <div class="stat-label">Payées</div>
              <div class="stat-value">{{ countByStatus('payé') }}</div>
            </div>
          </div>
          <div class="stat-card" style="cursor:default">
            <div class="stat-icon amber"><mat-icon>schedule</mat-icon></div>
            <div>
              <div class="stat-label">En attente</div>
              <div class="stat-value">{{ pendingCount }}</div>
            </div>
          </div>
          <div class="stat-card" style="cursor:default">
            <div class="stat-icon red"><mat-icon>warning</mat-icon></div>
            <div>
              <div class="stat-label">En retard</div>
              <div class="stat-value">{{ overdueCount }}</div>
            </div>
          </div>
          <div class="stat-card" style="cursor:default">
            <div class="stat-icon cyan"><mat-icon>payments</mat-icon></div>
            <div>
              <div class="stat-label">Total payé</div>
              <div class="stat-value">{{ totalPaid }} <span style="font-size:14px">DH</span></div>
            </div>
          </div>
        </div>

        <div *ngIf="invoices.length === 0" class="empty-state">
          <mat-icon>receipt_long</mat-icon>
          <div class="empty-title">Aucune facture</div>
          <p>Vos factures apparaîtront ici après vos consultations</p>
        </div>

        <div class="data-table" *ngIf="invoices.length > 0">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Médecin</th>
                <th>Acte</th>
                <th>Montant</th>
                <th>Statut</th>
                <th style="text-align:right">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let inv of invoices">
                <td>{{ inv.issuedAt | date:'d MMM y':'':'fr' }}</td>
                <td>
                  <ng-container *ngIf="isObj(inv.doctor)">
                    Dr. {{ $any(inv.doctor).firstName }} {{ $any(inv.doctor).lastName }}
                  </ng-container>
                </td>
                <td>{{ inv.nomenclature }}</td>
                <td style="font-weight:600">{{ inv.amount }} DH</td>
                <td><span [class]="'status-badge ' + inv.status">{{ inv.status }}</span></td>
                <td style="text-align:right">
                  <button mat-stroked-button (click)="download(inv)" style="font-size:12px;height:32px;line-height:30px">
                    <mat-icon style="font-size:14px;width:14px;height:14px">download</mat-icon> PDF
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </ng-container>
    </div>
  `
})
export class MyInvoicesComponent implements OnInit {
  invoices: Invoice[] = [];
  loading = true;

  constructor(private invoiceSvc: InvoiceService) {}

  ngOnInit(): void {
    this.invoiceSvc.getMine().subscribe({
      next: res => { this.invoices = res.invoices || []; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  get totalPaid(): number {
    return this.invoices.filter(i => i.status === 'payé').reduce((sum, i) => sum + (i.amount || 0), 0);
  }

  get pendingCount(): number {
    return this.invoices.filter(i => this.isUnpaid(i) && !this.isOverdue(i)).length;
  }

  get overdueCount(): number {
    return this.invoices.filter(i => this.isUnpaid(i) && this.isOverdue(i)).length;
  }

  countByStatus(s: string): number {
    return this.invoices.filter(i => i.status === s).length;
  }

  private isUnpaid(inv: Invoice): boolean {
    return inv.status === 'en attente' || inv.status === 'impayé';
  }

  private isOverdue(inv: Invoice): boolean {
    if (!inv.issuedAt) return false;
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return new Date(inv.issuedAt).getTime() < cutoff;
  }

  download(inv: Invoice): void {
    this.invoiceSvc.downloadPdf(inv._id).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Facture-${inv._id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  isObj(d: any): boolean { return d && typeof d === 'object'; }
}
