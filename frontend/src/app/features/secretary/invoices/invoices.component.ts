import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { InvoiceService } from '../../../core/services/invoice.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { Appointment, Invoice } from '../../../core/models';
import { FacturerDialogComponent, FacturerDialogResult } from '../facturer-dialog/facturer-dialog.component';

@Component({
  selector: 'app-secretary-invoices',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule, MatDialogModule, MatSnackBarModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2>Facturation</h2>
          <div class="page-subtitle">Gérez les factures de la clinique</div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tab-bar">
        <button class="tab" [class.active]="tab === 'pending'" (click)="tab = 'pending'">
          À facturer
          <span *ngIf="pendingApts.length" style="margin-left:6px;background:var(--primary);color:#fff;border-radius:10px;padding:1px 7px;font-size:11px">
            {{ pendingApts.length }}
          </span>
        </button>
        <button class="tab" [class.active]="tab === 'waiting'" (click)="tab = 'waiting'">
          En attente ({{ waiting.length }})
        </button>
        <button class="tab" [class.active]="tab === 'overdue'" (click)="tab = 'overdue'">
          En retard ({{ overdue.length }})
        </button>
        <button class="tab" [class.active]="tab === 'completed'" (click)="tab = 'completed'">
          Complétées ({{ completed.length }})
        </button>
      </div>

      <!-- À facturer -->
      <ng-container *ngIf="tab === 'pending'">
        <div *ngIf="loadingPending" style="text-align:center;padding:48px;color:var(--text-muted)">Chargement…</div>
        <div *ngIf="!loadingPending && pendingApts.length === 0" class="empty-state">
          <mat-icon>check_circle</mat-icon>
          <div class="empty-title">Aucun rendez-vous à facturer</div>
          <p>Tous les rendez-vous terminés ont été facturés.</p>
        </div>
        <div class="data-table" *ngIf="!loadingPending && pendingApts.length > 0">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Patient</th>
                <th>Médecin</th>
                <th>Type de consultation</th>
                <th style="text-align:right">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let apt of pendingApts">
                <td>{{ apt.startTime | date:'d MMM y, HH:mm':'':'fr' }}</td>
                <td>
                  <ng-container *ngIf="isObj(apt.patient)">
                    {{ $any(apt.patient).firstName }} {{ $any(apt.patient).lastName }}
                  </ng-container>
                </td>
                <td>
                  <ng-container *ngIf="isObj(apt.doctor)">
                    Dr. {{ $any(apt.doctor).firstName }} {{ $any(apt.doctor).lastName }}
                  </ng-container>
                </td>
                <td style="color:var(--text-muted);font-size:13px">{{ apt.reason || '—' }}</td>
                <td style="text-align:right">
                  <button mat-raised-button color="primary" (click)="facturer(apt)" style="font-size:12px;height:34px">
                    <mat-icon style="font-size:14px;margin-right:4px">receipt_long</mat-icon> Facturer
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </ng-container>

      <!-- En attente -->
      <ng-container *ngIf="tab === 'waiting'">
        <div *ngIf="loading" style="text-align:center;padding:48px;color:var(--text-muted)">Chargement…</div>
        <div *ngIf="!loading && waiting.length === 0" class="empty-state">
          <mat-icon>hourglass_empty</mat-icon>
          <div class="empty-title">Aucune facture en attente</div>
        </div>
        <div class="data-table" *ngIf="!loading && waiting.length > 0">
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Patient</th><th>Acte</th><th>Montant</th><th style="text-align:right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let inv of waiting">
                <td>{{ inv.issuedAt | date:'d MMM y':'':'fr' }}</td>
                <td>
                  <ng-container *ngIf="isObj(inv.patient)">{{ $any(inv.patient).firstName }} {{ $any(inv.patient).lastName }}</ng-container>
                </td>
                <td>{{ inv.nomenclature }}</td>
                <td style="font-weight:600">{{ inv.amount }} DH</td>
                <td style="text-align:right">
                  <button mat-icon-button (click)="download(inv)" title="PDF"><mat-icon>download</mat-icon></button>
                  <button mat-icon-button (click)="downloadFeuilleSoins(inv)" title="Feuille de soins"><mat-icon>medical_information</mat-icon></button>
                  <button mat-icon-button (click)="sendEmail(inv._id)" title="Email"><mat-icon>email</mat-icon></button>
                  <button mat-stroked-button color="primary" (click)="pay(inv._id)" style="font-size:12px;height:32px">
                    <mat-icon style="font-size:14px;width:14px;height:14px">paid</mat-icon> Payer
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </ng-container>

      <!-- En retard -->
      <ng-container *ngIf="tab === 'overdue'">
        <div *ngIf="loadingOverdue" style="text-align:center;padding:48px;color:var(--text-muted)">Chargement…</div>
        <div *ngIf="!loadingOverdue && overdue.length === 0" class="empty-state">
          <mat-icon>celebration</mat-icon>
          <div class="empty-title">Aucune facture en retard</div>
          <p>Tout est à jour !</p>
        </div>
        <div class="data-table" *ngIf="!loadingOverdue && overdue.length > 0">
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Patient</th><th>Acte</th><th>Montant</th><th style="text-align:right">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let inv of overdue">
                <td>{{ inv.issuedAt | date:'d MMM y':'':'fr' }}</td>
                <td>
                  <ng-container *ngIf="isObj(inv.patient)">{{ $any(inv.patient).firstName }} {{ $any(inv.patient).lastName }}</ng-container>
                </td>
                <td>{{ inv.nomenclature }}</td>
                <td style="font-weight:600">{{ inv.amount }} DH</td>
                <td style="text-align:right">
                  <button mat-raised-button color="primary" (click)="pay(inv._id)" style="font-size:12px;height:32px">
                    <mat-icon style="font-size:14px;width:14px;height:14px">paid</mat-icon> Marquer payé
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </ng-container>

      <!-- Complétées -->
      <ng-container *ngIf="tab === 'completed'">
        <div *ngIf="loading" style="text-align:center;padding:48px;color:var(--text-muted)">Chargement…</div>
        <div *ngIf="!loading && completed.length === 0" class="empty-state">
          <mat-icon>receipt_long</mat-icon>
          <div class="empty-title">Aucune facture payée</div>
        </div>
        <div class="data-table" *ngIf="!loading && completed.length > 0">
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Patient</th><th>Acte</th><th>Montant</th><th>Payée le</th><th style="text-align:right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let inv of completed">
                <td>{{ inv.issuedAt | date:'d MMM y':'':'fr' }}</td>
                <td>
                  <ng-container *ngIf="isObj(inv.patient)">{{ $any(inv.patient).firstName }} {{ $any(inv.patient).lastName }}</ng-container>
                </td>
                <td>{{ inv.nomenclature }}</td>
                <td style="font-weight:600">{{ inv.amount }} DH</td>
                <td style="color:var(--text-muted);font-size:13px">{{ inv.paidAt | date:'d MMM y':'':'fr' }}</td>
                <td style="text-align:right">
                  <button mat-icon-button (click)="download(inv)" title="PDF"><mat-icon>download</mat-icon></button>
                  <button mat-icon-button (click)="downloadFeuilleSoins(inv)" title="Feuille de soins"><mat-icon>medical_information</mat-icon></button>
                  <button mat-icon-button (click)="sendEmail(inv._id)" title="Email"><mat-icon>email</mat-icon></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </ng-container>
    </div>
  `
})
export class SecretaryInvoicesComponent implements OnInit {
  invoices: Invoice[] = [];
  overdue: Invoice[] = [];
  allTerminatedApts: Appointment[] = [];
  pendingApts: Appointment[] = [];
  loading = false;
  loadingOverdue = false;
  loadingPending = false;
  tab: 'pending' | 'waiting' | 'overdue' | 'completed' = 'pending';

  get waiting(): Invoice[]   { return this.invoices.filter(i => i.status === 'en attente' || i.status === 'impayé'); }
  get completed(): Invoice[] { return this.invoices.filter(i => i.status === 'payé'); }

  constructor(
    private invoiceSvc: InvoiceService,
    private apptSvc: AppointmentService,
    private dialog: MatDialog,
    private snack: MatSnackBar,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.loadAll();
    this.loadOverdue();
    this.loadPending();
  }

  private loadPending(): void {
    this.loadingPending = true;
    this.apptSvc.getAll().subscribe({
      next: res => {
        this.allTerminatedApts = (res.appointments || [])
          .filter((a: Appointment) => a.status === 'terminé' && a.patient && a.doctor);
        this.crossReference();
        this.loadingPending = false;
      },
      error: () => { this.loadingPending = false; }
    });
  }

  private crossReference(): void {
    const invoicedAptIds = new Set(
      this.invoices
        .map(i => typeof i.appointment === 'string' ? i.appointment : (i.appointment as any)?._id)
        .filter(Boolean)
    );
    this.pendingApts = this.allTerminatedApts.filter(a => !invoicedAptIds.has(a._id));
  }

  loadAll(): void {
    this.loading = true;
    this.invoiceSvc.getAll().subscribe({
      next: res => {
        this.invoices = res.invoices || [];
        this.crossReference();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  loadOverdue(): void {
    this.loadingOverdue = true;
    this.invoiceSvc.getOverdue().subscribe({
      next: res => { this.overdue = res.invoices || []; this.loadingOverdue = false; },
      error: () => { this.loadingOverdue = false; }
    });
  }

  facturer(apt: Appointment): void {
    const patientId = typeof apt.patient === 'object' ? (apt.patient as any)._id : apt.patient;
    const doctorId  = typeof apt.doctor  === 'object' ? (apt.doctor  as any)._id : apt.doctor;
    if (!patientId || !doctorId) return;

    const baseFee = typeof apt.doctor === 'object' ? Number((apt.doctor as any).baseFee) || 0 : 0;
    const fees    = typeof apt.doctor === 'object' ? ((apt.doctor as any).fees || []) : [];

    const ref = this.dialog.open(FacturerDialogComponent, {
      width: '500px',
      data: { appointment: apt, baseFee, fees }
    });

    ref.afterClosed().subscribe((result: FacturerDialogResult | undefined) => {
      if (!result) return;
      this.invoiceSvc.create({ appointmentId: apt._id, patientId, doctorId, nomenclature: result.nomenclature, amount: result.amount }).subscribe({
        next: () => {
          this.snack.open('Facture créée avec succès.', 'OK', { duration: 3000 });
          this.tab = 'waiting';
          this.loadAll();
          this.loadPending();
        },
        error: err => { this.snack.open(err.error?.message || 'Erreur lors de la création.', 'OK', { duration: 4000 }); }
      });
    });
  }

  download(inv: Invoice): void {
    this.invoiceSvc.downloadPdf(inv._id).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `Facture-${inv._id}.pdf`; a.click();
      URL.revokeObjectURL(url);
    });
  }

  downloadFeuilleSoins(inv: Invoice): void {
    this.invoiceSvc.downloadFeuilleSoins(inv._id).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `Feuille-soins-${inv._id}.pdf`; a.click();
      URL.revokeObjectURL(url);
    });
  }

  sendEmail(id: string): void { this.invoiceSvc.sendEmail(id).subscribe(); }

  pay(id: string): void {
    this.invoiceSvc.markPaid(id).subscribe({
      next: () => { this.loadAll(); this.loadOverdue(); }
    });
  }

  isObj(d: any): boolean { return d && typeof d === 'object'; }
}
