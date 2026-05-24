/**
 * Composant SecretaryScheduleComponent — planning global de la clinique (secrétaire).
 *
 * - Vue à onglets (jour / semaine) et regroupement des rendez-vous par médecin.
 * - Actions sur chaque RDV : confirmer, reprogrammer (RescheduleDialogComponent), marquer no-show.
 * - Données via AppointmentService.getAll(date) — déballer la réponse { appointments }.
 */
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AppointmentService } from '../../../core/services/appointment.service';
import { InvoiceService } from '../../../core/services/invoice.service';
import { AuthService } from '../../../core/services/auth.service';
import { Appointment } from '../../../core/models';
import { BookForPatientDialogComponent } from '../book-for-patient-dialog/book-for-patient-dialog.component';
import { RescheduleDialogComponent } from '../reschedule-dialog/reschedule-dialog.component';
import { FacturerDialogComponent, FacturerDialogResult } from '../facturer-dialog/facturer-dialog.component';
import { toLocalDateString } from '../../../core/utils/date';

@Component({
  selector: 'app-secretary-schedule',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatDialogModule, MatIconModule, MatSnackBarModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2>Bonjour{{ firstName ? ', ' + firstName : '' }} 👋</h2>
          <div class="page-subtitle">Planning de la clinique</div>
        </div>
        <div style="display:flex;gap:8px">
          <button mat-stroked-button (click)="load()" [disabled]="loading" title="Actualiser">
            <mat-icon>refresh</mat-icon> Actualiser
          </button>
          <button mat-raised-button color="primary" (click)="newAppt()">
            <mat-icon>add</mat-icon> Nouveau RDV
          </button>
        </div>
      </div>

      <!-- Tab bar -->
      <div class="tab-bar">
        <button class="tab" [class.active]="tab === 'en attente'" (click)="tab = 'en attente'">
          En attente
          <span *ngIf="countPending" style="margin-left:6px;background:var(--primary);color:#fff;border-radius:10px;padding:1px 7px;font-size:11px">
            {{ countPending }}
          </span>
        </button>
        <button class="tab" [class.active]="tab === 'confirmé'" (click)="tab = 'confirmé'">
          Confirmé
          <span *ngIf="countConfirmed" style="margin-left:6px;background:#16a34a;color:#fff;border-radius:10px;padding:1px 7px;font-size:11px">
            {{ countConfirmed }}
          </span>
        </button>
        <button class="tab" [class.active]="tab === 'terminé'" (click)="tab = 'terminé'">
          Terminé ({{ countCompleted }})
        </button>
        <button class="tab" [class.active]="tab === 'annulé'" (click)="tab = 'annulé'">
          Annulé ({{ countCancelled }})
        </button>
        <button class="tab" [class.active]="tab === 'no-show'" (click)="tab = 'no-show'">
          No-show ({{ countNoShow }})
        </button>
        <button class="tab" [class.active]="tab === 'indisponible'" (click)="tab = 'indisponible'">
          Indisponible ({{ countUnavailable }})
        </button>
      </div>

      <div *ngIf="loading" style="text-align:center;padding:48px;color:var(--text-muted)">Chargement…</div>

      <ng-container *ngIf="!loading">
        <!-- Empty states per tab -->
        <div *ngIf="tabApts.length === 0" class="empty-state">
          <mat-icon>{{ emptyIcon }}</mat-icon>
          <div class="empty-title">{{ emptyTitle }}</div>
          <p *ngIf="tab === 'en attente'">Créez un nouveau rendez-vous pour commencer</p>
        </div>

        <!-- Appointments grouped by date -->
        <ng-container *ngFor="let group of groupedApts">
          <div class="date-section-header">{{ group.label }}</div>

          <div class="apt-row" *ngFor="let apt of group.apts"
            [style.border-left]="'3px solid ' + statusColor(apt.status)">
            <div class="apt-time">
              {{ apt.startTime | date:'HH:mm' }}
              <span style="display:block;font-size:11px;color:var(--text-muted)">
                {{ apt.endTime | date:'HH:mm' }}
              </span>
            </div>
            <div class="apt-info">
              <div class="apt-name">
                <ng-container *ngIf="$any(apt).dependentInfo">
                  {{ $any(apt).dependentInfo.firstName }} {{ $any(apt).dependentInfo.lastName }}
                  <span style="font-weight:400;font-size:12px;color:var(--text-muted)"> ({{ $any(apt).dependentInfo.relation }}{{ $any(apt).dependentInfo.dateOfBirth ? ', ' + getAge($any(apt).dependentInfo.dateOfBirth) + ' ans' : '' }})</span>
                </ng-container>
                <ng-container *ngIf="!$any(apt).dependentInfo && isObj(apt.patient)">
                  {{ $any(apt.patient).firstName }} {{ $any(apt.patient).lastName }}
                </ng-container>
                <ng-container *ngIf="!$any(apt).dependentInfo && !isObj(apt.patient)">—</ng-container>
              </div>
              <div *ngIf="$any(apt).dependentInfo" style="font-size:11.5px;color:var(--text-muted);margin-top:1px">
                Titulaire : {{ $any(apt.patient).firstName }} {{ $any(apt.patient).lastName }}
              </div>
              <div *ngIf="$any(apt).dependentInfo?.allergies?.length" style="font-size:11.5px;color:#b91c1c;font-weight:500;margin-top:1px">
                <mat-icon style="font-size:12px;width:12px;height:12px;vertical-align:-1px">warning</mat-icon>
                Allergies : {{ $any(apt).dependentInfo.allergies.join(', ') }}
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
      </ng-container>
    </div>

    <style>
      .date-section-header {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-muted);
        text-transform: capitalize;
        padding: 12px 4px 6px;
        margin-top: 8px;
        border-bottom: 1px solid var(--border);
        margin-bottom: 8px;
      }
    </style>
  `
})
export class SecretaryScheduleComponent implements OnInit, OnDestroy {
  allApts: Appointment[] = [];
  loading = false;
  tab: 'en attente' | 'confirmé' | 'terminé' | 'annulé' | 'no-show' | 'indisponible' = 'en attente';
  facturingId: string | null = null;
  invoicedIds = new Set<string>();
  firstName = '';
  private pollHandle?: ReturnType<typeof setInterval>;

  get tabApts(): Appointment[] {
    return this.allApts.filter(a => a.status === this.tab);
  }

  get groupedApts(): { dateKey: string; label: string; apts: Appointment[] }[] {
    const groups = new Map<string, Appointment[]>();
    for (const a of this.tabApts) {
      const key = a.startTime.slice(0, 10);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(a);
    }
    const today    = toLocalDateString(new Date());
    const tomorrow = toLocalDateString(new Date(Date.now() + 86_400_000));
    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, apts]) => ({
        dateKey: key,
        label: key === today ? "Aujourd'hui" :
               key === tomorrow ? 'Demain' :
               new Date(key + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
        apts: apts.sort((a, b) => a.startTime.localeCompare(b.startTime))
      }));
  }

  get countPending():     number { return this.allApts.filter(a => a.status === 'en attente').length; }
  get countConfirmed():   number { return this.allApts.filter(a => a.status === 'confirmé').length; }
  get countCompleted():   number { return this.allApts.filter(a => a.status === 'terminé').length; }
  get countCancelled():   number { return this.allApts.filter(a => a.status === 'annulé').length; }
  get countNoShow():      number { return this.allApts.filter(a => a.status === 'no-show').length; }
  get countUnavailable(): number { return this.allApts.filter(a => a.status === 'indisponible').length; }

  get emptyIcon(): string {
    const icons: Record<string, string> = {
      'en attente': 'hourglass_empty', 'confirmé': 'event_available',
      'terminé': 'task_alt', 'annulé': 'event_busy',
      'no-show': 'person_off', 'indisponible': 'block'
    };
    return icons[this.tab] ?? 'event_busy';
  }

  get emptyTitle(): string {
    const titles: Record<string, string> = {
      'en attente': 'Aucun rendez-vous en attente', 'confirmé': 'Aucun rendez-vous confirmé',
      'terminé': 'Aucun rendez-vous terminé', 'annulé': 'Aucun rendez-vous annulé',
      'no-show': 'Aucun no-show enregistré', 'indisponible': 'Aucune indisponibilité'
    };
    return titles[this.tab] ?? 'Aucun rendez-vous';
  }

  constructor(
    private apptSvc: AppointmentService,
    private invoiceSvc: InvoiceService,
    private dialog: MatDialog,
    private snack: MatSnackBar,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.auth.getMe().subscribe({
      next: res => { this.firstName = res?.profile?.firstName || ''; },
      error: () => {}
    });
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

  load(silent = false): void {
    if (!silent) this.loading = true;
    this.apptSvc.getAll().subscribe({
      next: res => {
        this.allApts = res.appointments.sort(
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
    const fees = typeof apt.doctor === 'object' ? ((apt.doctor as any).fees || []) : [];
    const ref = this.dialog.open(FacturerDialogComponent, {
      width: '500px',
      data: { appointment: apt, baseFee, fees }
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

  getAge(dateOfBirth: string): number {
    const birth = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }
}
