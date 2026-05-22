import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AppointmentService } from '../../../core/services/appointment.service';
import { InvoiceService } from '../../../core/services/invoice.service';
import { Appointment } from '../../../core/models';
import { BookForPatientDialogComponent } from '../book-for-patient-dialog/book-for-patient-dialog.component';
import { RescheduleDialogComponent } from '../reschedule-dialog/reschedule-dialog.component';
import { FacturerDialogComponent, FacturerDialogResult } from '../facturer-dialog/facturer-dialog.component';
import { toLocalDateString } from '../../../core/utils/date';

@Component({
  selector: 'app-secretary-schedule',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatDatepickerModule, MatNativeDateModule, MatDialogModule, MatIconModule, MatSnackBarModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h2>Planning de la clinique</h2>
        <div style="display:flex;gap:8px">
          <button mat-stroked-button (click)="load()" [disabled]="loading" title="Actualiser">
            <mat-icon>refresh</mat-icon> Actualiser
          </button>
          <button mat-raised-button color="primary" (click)="newAppt()">
            <mat-icon>add</mat-icon> Nouveau RDV
          </button>
        </div>
      </div>

      <!-- Date picker -->
      <div style="background:var(--surface);border-radius:var(--radius);border:1px solid var(--border);padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;gap:12px;box-shadow:var(--shadow-sm)">
        <mat-icon style="color:var(--primary)">calendar_today</mat-icon>
        <mat-form-field style="margin-bottom:-20px">
          <mat-label>Date</mat-label>
          <input matInput [matDatepicker]="picker" [value]="selectedDate" (dateChange)="onDate($event.value)">
          <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-datepicker #picker></mat-datepicker>
        </mat-form-field>
        <span style="font-size:13px;color:var(--text-muted);margin-left:8px">
          {{ apts.length }} rendez-vous
        </span>
      </div>

      <div *ngIf="loading" style="text-align:center;padding:48px;color:var(--text-muted)">Chargement…</div>

      <ng-container *ngIf="!loading">
        <div *ngIf="apts.length === 0" class="empty-state">
          <mat-icon>event_busy</mat-icon>
          <div class="empty-title">Aucun rendez-vous ce jour</div>
          <p>Créez un nouveau rendez-vous pour commencer</p>
        </div>

        <div class="apt-row" *ngFor="let apt of apts"
          [style.border-left]="'3px solid ' + statusColor(apt.status)">
          <div class="apt-time">
            {{ apt.startTime | date:'HH:mm' }}
            <span style="display:block;font-size:11px;color:var(--text-muted)">
              {{ apt.endTime | date:'HH:mm' }}
            </span>
          </div>
          <div class="apt-info">
            <div class="apt-name">
              <ng-container *ngIf="isObj(apt.patient)">
                {{ $any(apt.patient).firstName }} {{ $any(apt.patient).lastName }}
              </ng-container>
              <ng-container *ngIf="!isObj(apt.patient)">—</ng-container>
            </div>
            <div class="apt-meta">
              <ng-container *ngIf="isObj(apt.doctor)">
                Dr. {{ $any(apt.doctor).firstName }} {{ $any(apt.doctor).lastName }}
              </ng-container>
              <span *ngIf="apt.reason"> · {{ apt.reason }}</span>
            </div>
          </div>
          <div class="apt-actions">
            <span [class]="'status-badge ' + apt.status">{{ apt.status }}</span>
            <button mat-stroked-button color="primary"
              *ngIf="apt.status === 'en attente'"
              (click)="confirm(apt._id)"
              style="font-size:12px;height:32px">
              <mat-icon style="font-size:14px;margin-right:2px">check</mat-icon> Confirmer
            </button>
            <button mat-stroked-button color="warn"
              *ngIf="apt.status === 'confirmé'"
              (click)="noShow(apt._id)"
              style="font-size:12px;height:32px">
              No-show
            </button>
            <button mat-stroked-button
              *ngIf="apt.status === 'en attente' || apt.status === 'confirmé'"
              (click)="openReschedule(apt)"
              style="font-size:12px;height:32px">
              <mat-icon style="font-size:14px;margin-right:2px">swap_horiz</mat-icon> Déplacer
            </button>
            <button mat-stroked-button color="warn"
              *ngIf="apt.status === 'en attente' || apt.status === 'confirmé'"
              (click)="cancel(apt._id)"
              style="font-size:12px;height:32px">
              <mat-icon style="font-size:14px;margin-right:2px">cancel</mat-icon> Annuler
            </button>
            <button mat-stroked-button color="accent"
              *ngIf="apt.status === 'terminé' && !invoicedIds.has(apt._id)"
              (click)="facturer(apt)"
              [disabled]="facturingId === apt._id"
              style="font-size:12px;height:32px">
              <mat-icon style="font-size:14px;margin-right:2px">receipt_long</mat-icon>
              {{ facturingId === apt._id ? '…' : 'Facturer' }}
            </button>
            <span class="status-badge payé"
              *ngIf="apt.status === 'terminé' && invoicedIds.has(apt._id)"
              style="display:inline-flex;align-items:center;gap:4px">
              <mat-icon style="font-size:14px;width:14px;height:14px">check_circle</mat-icon>
              Facturé
            </span>
          </div>
        </div>
      </ng-container>
    </div>
  `
})
export class SecretaryScheduleComponent implements OnInit, OnDestroy {
  apts: Appointment[] = [];
  loading = false;
  selectedDate = new Date();
  facturingId: string | null = null;
  invoicedIds = new Set<string>();
  private pollHandle?: ReturnType<typeof setInterval>;

  constructor(
    private apptSvc: AppointmentService,
    private invoiceSvc: InvoiceService,
    private dialog: MatDialog,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadInvoiced();
    this.load();
    this.pollHandle = setInterval(() => this.load(true), 15_000);
  }

  loadInvoiced(): void {
    this.invoiceSvc.getAll().subscribe({
      next: res => {
        this.invoicedIds = new Set(
          (res.invoices || [])
            .map(i => typeof i.appointment === 'string' ? i.appointment : (i.appointment as any)?._id)
            .filter(Boolean) as string[]
        );
      }
    });
  }

  ngOnDestroy(): void { clearInterval(this.pollHandle); }

  onDate(d: Date | null): void { if (d) { this.selectedDate = d; this.load(); } }

  load(silent = false): void {
    if (!silent) this.loading = true;
    const dateStr = toLocalDateString(this.selectedDate);
    this.apptSvc.getAll(dateStr).subscribe({
      next: res => {
        this.apts = res.appointments.sort(
          (a: Appointment, b: Appointment) => a.startTime.localeCompare(b.startTime)
        );
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  confirm(id: string): void {
    this.apptSvc.confirm(id).subscribe({
      next: () => this.load(),
      error: () => this.load()
    });
  }

  noShow(id: string): void {
    this.apptSvc.markNoShow(id).subscribe({
      next: () => this.load(),
      error: () => this.load()
    });
  }

  cancel(id: string): void {
    if (!confirm('Annuler ce rendez-vous ?')) return;
    this.apptSvc.cancel(id).subscribe({
      next: () => this.load(),
      error: () => this.load()
    });
  }

  newAppt(): void {
    const ref = this.dialog.open(BookForPatientDialogComponent, { width: '520px' });
    ref.afterClosed().subscribe(saved => { if (saved) this.load(); });
  }

  openReschedule(apt: Appointment): void {
    const ref = this.dialog.open(RescheduleDialogComponent, { width: '420px', data: apt });
    ref.afterClosed().subscribe(saved => { if (saved) this.load(); });
  }

  facturer(apt: Appointment): void {
    const patientId = typeof apt.patient === 'object' ? (apt.patient as any)._id : apt.patient;
    const doctorId  = typeof apt.doctor  === 'object' ? (apt.doctor  as any)._id : apt.doctor;
    if (!patientId || !doctorId) {
      this.snack.open('Données du rendez-vous incomplètes.', 'OK', { duration: 3000 });
      return;
    }
    const baseFee = typeof apt.doctor === 'object' ? Number((apt.doctor as any).baseFee) || 0 : 0;
    const ref = this.dialog.open(FacturerDialogComponent, {
      width: '460px',
      data: { appointment: apt, baseFee }
    });
    ref.afterClosed().subscribe((result: FacturerDialogResult | undefined) => {
      if (!result) return;
      this.facturingId = apt._id;
      this.invoiceSvc.create({
        appointmentId: apt._id,
        patientId,
        doctorId,
        nomenclature: result.nomenclature,
        amount: result.amount
      }).subscribe({
        next: () => {
          this.facturingId = null;
          this.invoicedIds.add(apt._id);
          this.snack.open('Facture créée avec succès.', 'OK', { duration: 3000 });
        },
        error: err => {
          this.facturingId = null;
          const msg = err?.error?.message || 'Erreur lors de la création de la facture.';
          this.snack.open(msg, 'OK', { duration: 4000 });
        }
      });
    });
  }

  statusColor(s: string): string {
    const map: Record<string, string> = {
      confirmé: '#16a34a', 'en attente': '#d97706',
      annulé: '#dc2626', terminé: '#2563eb',
      indisponible: '#7c3aed', 'no-show': '#6b7280'
    };
    return map[s] ?? '#cbd5e1';
  }

  isObj(d: any): boolean { return d && typeof d === 'object'; }
}
