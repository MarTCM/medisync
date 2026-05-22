import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { AppointmentService } from '../../../core/services/appointment.service';
import { Appointment } from '../../../core/models';
import { ConsultationFormComponent } from '../consultation-form/consultation-form.component';
import { toLocalDateString } from '../../../core/utils/date';

@Component({
  selector: 'app-doctor-calendar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatDatepickerModule, MatNativeDateModule, MatDialogModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2>Planning du jour</h2>
          <div class="page-subtitle">{{ selectedDate | date:'EEEE d MMMM y':'':'fr' }}</div>
        </div>
        <div style="display:flex;gap:10px;align-items:center">
          <button mat-stroked-button (click)="shiftDay(-1)">
            <mat-icon>chevron_left</mat-icon>
          </button>
          <mat-form-field appearance="outline" style="margin-bottom:-22px;width:170px">
            <input matInput [matDatepicker]="picker" [value]="selectedDate" (dateChange)="onDateChange($event.value)">
            <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
          </mat-form-field>
          <button mat-stroked-button (click)="shiftDay(1)">
            <mat-icon>chevron_right</mat-icon>
          </button>
        </div>
      </div>

      <!-- KPI strip -->
      <div class="stat-grid" style="margin-bottom:24px">
        <div class="stat-card" style="cursor:default">
          <div class="stat-icon cyan"><mat-icon>event</mat-icon></div>
          <div>
            <div class="stat-label">Total du jour</div>
            <div class="stat-value">{{ schedule.length }}</div>
          </div>
        </div>
        <div class="stat-card" style="cursor:default">
          <div class="stat-icon green"><mat-icon>check_circle</mat-icon></div>
          <div>
            <div class="stat-label">Confirmés</div>
            <div class="stat-value">{{ countBy('confirmé') }}</div>
          </div>
        </div>
        <div class="stat-card" style="cursor:default">
          <div class="stat-icon amber"><mat-icon>schedule</mat-icon></div>
          <div>
            <div class="stat-label">En attente</div>
            <div class="stat-value">{{ countBy('en attente') }}</div>
          </div>
        </div>
        <div class="stat-card" style="cursor:default">
          <div class="stat-icon blue"><mat-icon>task_alt</mat-icon></div>
          <div>
            <div class="stat-label">Terminés</div>
            <div class="stat-value">{{ countBy('terminé') }}</div>
          </div>
        </div>
      </div>

      <div *ngIf="loading" style="text-align:center;padding:48px;color:var(--text-muted)">Chargement…</div>

      <div *ngIf="!loading && schedule.length === 0" class="empty-state">
        <mat-icon>event_busy</mat-icon>
        <div class="empty-title">Aucun rendez-vous ce jour</div>
        <p>Votre planning est libre</p>
      </div>

      <div *ngFor="let apt of schedule" class="apt-row"
        [style.cursor]="apt.status === 'confirmé' ? 'pointer' : 'default'"
        [style.border-left]="'3px solid ' + statusColor(apt.status)"
        (click)="openConsultation(apt)">
        <div class="apt-time">
          {{ apt.startTime | date:'HH:mm' }}
          <span style="display:block;font-size:11px;font-weight:500;color:var(--text-muted)">
            → {{ apt.endTime | date:'HH:mm' }}
          </span>
        </div>
        <div class="apt-info">
          <div class="apt-name">
            <ng-container *ngIf="isObj(apt.patient)">
              {{ $any(apt.patient).firstName }} {{ $any(apt.patient).lastName }}
            </ng-container>
            <ng-container *ngIf="!isObj(apt.patient)">Créneau bloqué</ng-container>
          </div>
          <div class="apt-meta">
            <mat-icon style="font-size:13px;width:13px;height:13px;vertical-align:-2px">medical_services</mat-icon>
            {{ apt.reason }}
          </div>
        </div>
        <div class="apt-actions">
          <span [class]="'status-badge ' + apt.status">{{ apt.status }}</span>
          <span *ngIf="apt.status === 'confirmé'" style="color:var(--primary);font-weight:600;font-size:12.5px;display:flex;align-items:center;gap:4px">
            Consulter <mat-icon style="font-size:16px;width:16px;height:16px">arrow_forward</mat-icon>
          </span>
        </div>
      </div>
    </div>
  `
})
export class DoctorCalendarComponent implements OnInit, OnDestroy {
  schedule: Appointment[] = [];
  loading = false;
  selectedDate = new Date();
  private pollHandle?: ReturnType<typeof setInterval>;

  constructor(private apptSvc: AppointmentService, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.load();
    this.pollHandle = setInterval(() => this.load(true), 15_000);
  }

  ngOnDestroy(): void { clearInterval(this.pollHandle); }

  onDateChange(date: Date | null): void {
    if (date) { this.selectedDate = date; this.load(); }
  }

  shiftDay(d: number): void {
    const next = new Date(this.selectedDate);
    next.setDate(next.getDate() + d);
    this.selectedDate = next;
    this.load();
  }

  load(silent = false): void {
    if (!silent) this.loading = true;
    const dateStr = toLocalDateString(this.selectedDate);
    this.apptSvc.getDoctorDaily(dateStr).subscribe({
      next: apts => {
        this.schedule = (apts || []).sort((a, b) => a.startTime.localeCompare(b.startTime));
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  openConsultation(apt: Appointment): void {
    if (apt.status !== 'confirmé') return;
    const ref = this.dialog.open(ConsultationFormComponent, { width: '640px', data: apt });
    ref.afterClosed().subscribe(saved => { if (saved) this.load(); });
  }

  countBy(s: string): number {
    return this.schedule.filter(a => a.status === s).length;
  }

  statusColor(s: string): string {
    const map: Record<string, string> = {
      confirmé: '#16A34A', 'en attente': '#D97706',
      annulé: '#DC2626', terminé: '#2563EB',
      indisponible: '#7C3AED', 'no-show': '#6B7280'
    };
    return map[s] ?? '#CBD5E1';
  }

  isObj(d: any): boolean { return d && typeof d === 'object'; }
}
