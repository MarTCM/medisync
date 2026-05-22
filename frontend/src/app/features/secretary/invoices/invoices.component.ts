import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { InvoiceService } from '../../../core/services/invoice.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { Appointment, Invoice } from '../../../core/models';

@Component({
  selector: 'app-secretary-invoices',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2>Facturation</h2>
          <div class="page-subtitle">Gérez les factures de la clinique</div>
        </div>
        <button mat-raised-button color="primary" (click)="showForm = !showForm">
          <mat-icon>{{ showForm ? 'close' : 'add' }}</mat-icon>
          {{ showForm ? 'Fermer' : 'Nouvelle facture' }}
        </button>
      </div>

      <div *ngIf="showForm" class="card" style="margin-bottom:20px">
        <div class="card-header">
          <h3>Créer une facture</h3>
        </div>
        <form [formGroup]="createForm" (ngSubmit)="create()" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(260px, 1fr));gap:12px">
          <mat-form-field appearance="outline" style="margin-bottom:-18px;grid-column:1/-1">
            <mat-label>Rendez-vous terminé</mat-label>
            <mat-select formControlName="appointmentId" (selectionChange)="onAptSelected($event.value)">
              <mat-option *ngIf="billingApts.length === 0" disabled>Aucun rendez-vous terminé sans facture</mat-option>
              <mat-option *ngFor="let a of billingApts" [value]="a._id">
                {{ aptLabel(a) }}
              </mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" style="margin-bottom:-18px">
            <mat-label>Acte (nomenclature)</mat-label>
            <input matInput formControlName="nomenclature" placeholder="CS, AGN, etc.">
          </mat-form-field>
          <mat-form-field appearance="outline" style="margin-bottom:-18px">
            <mat-label>Montant (DH)</mat-label>
            <input matInput formControlName="amount" type="number" min="0">
          </mat-form-field>
          <button mat-raised-button color="primary" type="submit"
            [disabled]="createForm.invalid || creating"
            style="height:48px;margin-top:8px">
            <mat-icon>add</mat-icon> {{ creating ? 'Création…' : 'Créer la facture' }}
          </button>
        </form>
        <div *ngIf="createError" class="msg-error" style="margin-top:12px">
          <mat-icon>error_outline</mat-icon> {{ createError }}
        </div>
        <div *ngIf="createOk" class="msg-success" style="margin-top:12px">
          <mat-icon>check_circle</mat-icon> Facture créée avec succès.
        </div>
      </div>

      <!-- Tabs -->
      <div class="tab-bar">
        <button class="tab" [class.active]="tab === 'all'" (click)="tab = 'all'">
          Toutes ({{ invoices.length }})
        </button>
        <button class="tab" [class.active]="tab === 'overdue'" (click)="tab = 'overdue'">
          En retard ({{ overdue.length }})
        </button>
      </div>

      <!-- All -->
      <ng-container *ngIf="tab === 'all'">
        <div *ngIf="loading" style="text-align:center;padding:48px;color:var(--text-muted)">Chargement…</div>
        <div *ngIf="!loading && invoices.length === 0" class="empty-state">
          <mat-icon>receipt_long</mat-icon>
          <div class="empty-title">Aucune facture</div>
        </div>
        <div class="data-table" *ngIf="!loading && invoices.length > 0">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Patient</th>
                <th>Acte</th>
                <th>Montant</th>
                <th>Statut</th>
                <th style="text-align:right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let inv of invoices">
                <td>{{ inv.issuedAt | date:'d MMM y':'':'fr' }}</td>
                <td>
                  <ng-container *ngIf="isObj(inv.patient)">
                    {{ $any(inv.patient).firstName }} {{ $any(inv.patient).lastName }}
                  </ng-container>
                </td>
                <td>{{ inv.nomenclature }}</td>
                <td style="font-weight:600">{{ inv.amount }} DH</td>
                <td><span [class]="'status-badge ' + inv.status">{{ inv.status }}</span></td>
                <td style="text-align:right">
                  <button mat-icon-button (click)="download(inv)" title="Télécharger PDF">
                    <mat-icon>download</mat-icon>
                  </button>
                  <button mat-icon-button (click)="sendEmail(inv._id)" title="Envoyer par email">
                    <mat-icon>email</mat-icon>
                  </button>
                  <button mat-stroked-button color="primary" *ngIf="inv.status !== 'payé'"
                    (click)="pay(inv._id)" style="font-size:12px;height:32px;line-height:30px">
                    <mat-icon style="font-size:14px;width:14px;height:14px">paid</mat-icon> Payer
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </ng-container>

      <!-- Overdue -->
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
                <th>Date</th>
                <th>Patient</th>
                <th>Acte</th>
                <th>Montant</th>
                <th>Statut</th>
                <th style="text-align:right">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let inv of overdue">
                <td>{{ inv.issuedAt | date:'d MMM y':'':'fr' }}</td>
                <td>
                  <ng-container *ngIf="isObj(inv.patient)">
                    {{ $any(inv.patient).firstName }} {{ $any(inv.patient).lastName }}
                  </ng-container>
                </td>
                <td>{{ inv.nomenclature }}</td>
                <td style="font-weight:600">{{ inv.amount }} DH</td>
                <td><span class="status-badge en\ retard">en retard</span></td>
                <td style="text-align:right">
                  <button mat-raised-button color="primary" (click)="pay(inv._id)"
                    style="font-size:12px;height:32px;line-height:30px">
                    <mat-icon style="font-size:14px;width:14px;height:14px">paid</mat-icon> Marquer payé
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
export class SecretaryInvoicesComponent implements OnInit {
  createForm: FormGroup;
  invoices: Invoice[] = [];
  overdue: Invoice[] = [];
  billingApts: Appointment[] = [];
  loading = false;
  loadingOverdue = false;
  creating = false;
  createError = '';
  createOk = false;
  showForm = false;
  tab: 'all' | 'overdue' = 'all';

  constructor(
    private fb: FormBuilder,
    private invoiceSvc: InvoiceService,
    private apptSvc: AppointmentService
  ) {
    this.createForm = this.fb.group({
      patientId: ['', Validators.required],
      doctorId: ['', Validators.required],
      appointmentId: ['', Validators.required],
      nomenclature: ['', Validators.required],
      amount: [null, [Validators.required, Validators.min(0)]]
    });
  }

  ngOnInit(): void {
    this.loadAll();
    this.loadOverdue();
    this.apptSvc.getAll().subscribe({
      next: res => {
        this.billingApts = (res.appointments || [])
          .filter(a => a.status === 'terminé' && a.patient && a.doctor);
      }
    });
  }

  aptLabel(a: Appointment): string {
    const patient = typeof a.patient === 'object' ? `${(a.patient as any).firstName} ${(a.patient as any).lastName}` : 'Patient';
    const doctor  = typeof a.doctor  === 'object' ? `Dr. ${(a.doctor  as any).firstName} ${(a.doctor  as any).lastName}` : 'Médecin';
    const d = new Date(a.startTime);
    const date = `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
    return `${patient} — ${doctor} — ${date}`;
  }

  onAptSelected(aptId: string): void {
    const apt = this.billingApts.find(a => a._id === aptId);
    if (!apt) return;
    const patientId = typeof apt.patient === 'object' ? (apt.patient as any)._id : apt.patient;
    const doctorId  = typeof apt.doctor  === 'object' ? (apt.doctor  as any)._id : apt.doctor;
    this.createForm.patchValue({
      patientId,
      doctorId,
      nomenclature: this.createForm.value.nomenclature || `Consultation — ${apt.reason || 'CS'}`
    });
  }

  loadAll(): void {
    this.loading = true;
    this.invoiceSvc.getAll().subscribe({
      next: res => { this.invoices = res.invoices || []; this.loading = false; },
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

  create(): void {
    if (this.createForm.invalid) return;
    this.creating = true;
    this.createError = '';
    this.createOk = false;
    this.invoiceSvc.create(this.createForm.value).subscribe({
      next: () => {
        this.creating = false;
        this.createOk = true;
        this.createForm.reset();
        this.loadAll();
      },
      error: err => { this.creating = false; this.createError = err.error?.message || 'Erreur.'; }
    });
  }

  download(inv: Invoice): void {
    this.invoiceSvc.downloadPdf(inv._id).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `Facture-${inv._id}.pdf`; a.click();
      URL.revokeObjectURL(url);
    });
  }

  sendEmail(id: string): void {
    this.invoiceSvc.sendEmail(id).subscribe();
  }

  pay(id: string): void {
    this.invoiceSvc.markPaid(id).subscribe({ next: () => { this.loadAll(); this.loadOverdue(); } });
  }

  isObj(d: any): boolean { return d && typeof d === 'object'; }
}
