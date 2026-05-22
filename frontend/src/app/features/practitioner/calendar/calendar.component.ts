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
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AppointmentService } from '../../../core/services/appointment.service';
import { Appointment } from '../../../core/models';
import { ConsultationFormComponent } from '../consultation-form/consultation-form.component';
import { toLocalDateString } from '../../../core/utils/date';

type ViewMode = 'day' | 'week' | 'month';

interface DayCell {
  date: Date;
  iso: string;
  inMonth: boolean;
  isToday: boolean;
  appointments: Appointment[];
}

@Component({
  selector: 'app-doctor-calendar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatDatepickerModule, MatNativeDateModule, MatDialogModule,
    MatButtonToggleModule, MatTabsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2>Planning</h2>
          <div class="page-subtitle">{{ headerSubtitle() }}</div>
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <mat-button-toggle-group [value]="viewMode" (change)="setViewMode($event.value)" style="height:36px">
            <mat-button-toggle value="day">Jour</mat-button-toggle>
            <mat-button-toggle value="week">Semaine</mat-button-toggle>
            <mat-button-toggle value="month">Mois</mat-button-toggle>
          </mat-button-toggle-group>
          <button mat-stroked-button (click)="shift(-1)" title="Précédent">
            <mat-icon>chevron_left</mat-icon>
          </button>
          <mat-form-field appearance="outline" style="margin-bottom:-22px;width:170px">
            <input matInput [matDatepicker]="picker" [value]="selectedDate" (dateChange)="onDateChange($event.value)">
            <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
          </mat-form-field>
          <button mat-stroked-button (click)="shift(1)" title="Suivant">
            <mat-icon>chevron_right</mat-icon>
          </button>
          <button mat-stroked-button (click)="goToday()">Aujourd'hui</button>
        </div>
      </div>

      <!-- KPI strip -->
      <div class="stat-grid" style="margin-bottom:16px">
        <div class="stat-card" style="cursor:default">
          <div class="stat-icon cyan"><mat-icon>event</mat-icon></div>
          <div>
            <div class="stat-label">Total période</div>
            <div class="stat-value">{{ allAppointments.length }}</div>
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

      <!-- Motif legend -->
      <div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:16px;font-size:12px;color:var(--text-muted)">
        <span style="display:inline-flex;align-items:center;gap:6px">
          <span class="motif-dot" [style.background]="reasonColor('consultation générale')"></span> Consultation générale
        </span>
        <span style="display:inline-flex;align-items:center;gap:6px">
          <span class="motif-dot" [style.background]="reasonColor('suivi')"></span> Suivi
        </span>
        <span style="display:inline-flex;align-items:center;gap:6px">
          <span class="motif-dot" [style.background]="reasonColor('urgence')"></span> Urgence
        </span>
        <span style="display:inline-flex;align-items:center;gap:6px">
          <span class="motif-dot" [style.background]="reasonColor('autre')"></span> Autre
        </span>
        <span style="display:inline-flex;align-items:center;gap:6px">
          <span class="motif-dot" [style.background]="reasonColor('indisponibilité')"></span> Indisponibilité
        </span>
      </div>

      <div *ngIf="loading" style="text-align:center;padding:48px;color:var(--text-muted)">Chargement…</div>
      <div *ngIf="loadError" style="padding:12px 16px;background:#fee2e2;color:#b91c1c;border-radius:var(--radius);margin-bottom:12px;font-size:13.5px">
        <strong>Erreur :</strong> {{ loadError }}
      </div>

      <!-- DAY VIEW (with tabs: Planning / File d'attente) -->
      <ng-container *ngIf="!loading && viewMode === 'day'">
        <mat-tab-group dynamicHeight>
          <mat-tab label="Planning">
            <div *ngIf="schedule.length === 0" class="empty-state" style="margin-top:16px">
              <mat-icon>event_busy</mat-icon>
              <div class="empty-title">Aucun rendez-vous ce jour</div>
              <p>Votre planning est libre</p>
            </div>
            <div *ngFor="let apt of schedule" class="apt-row" style="margin-top:8px"
              [style.cursor]="apt.status === 'confirmé' ? 'pointer' : 'default'"
              [style.border-left]="'3px solid ' + statusColor(apt.status)"
              (click)="openConsultation(apt)">
              <span class="motif-dot" [style.background]="reasonColor(apt.reason)"
                [title]="apt.reason" style="margin-right:10px"></span>
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
                <span *ngIf="apt.reason === 'urgence'"
                  style="background:#fee2e2;color:#b91c1c;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600">
                  PRIORITÉ
                </span>
                <span [class]="'status-badge ' + apt.status">{{ apt.status }}</span>
                <span *ngIf="apt.status === 'confirmé'" style="color:var(--primary);font-weight:600;font-size:12.5px;display:flex;align-items:center;gap:4px">
                  Consulter <mat-icon style="font-size:16px;width:16px;height:16px">arrow_forward</mat-icon>
                </span>
              </div>
            </div>
          </mat-tab>
          <mat-tab [label]="'File d\\'attente (' + waitingList.length + ')'">
            <div *ngIf="waitingList.length === 0" class="empty-state" style="margin-top:16px">
              <mat-icon>hourglass_empty</mat-icon>
              <div class="empty-title">Aucun patient en attente</div>
              <p>Tous les rendez-vous du jour sont passés ou terminés</p>
            </div>
            <div *ngIf="nextAppt" style="margin-top:12px;padding:14px 16px;background:linear-gradient(90deg,var(--primary) 0%,var(--accent) 100%);color:#fff;border-radius:var(--radius);display:flex;align-items:center;gap:10px">
              <mat-icon>arrow_forward</mat-icon>
              <div>
                <div style="font-size:12px;opacity:0.85">Prochain rendez-vous</div>
                <div style="font-weight:600;font-size:15px">
                  {{ nextAppt.startTime | date:'HH:mm' }} —
                  <ng-container *ngIf="isObj(nextAppt.patient)">
                    {{ $any(nextAppt.patient).firstName }} {{ $any(nextAppt.patient).lastName }}
                  </ng-container>
                  <span style="opacity:0.85;font-weight:400"> · {{ nextAppt.reason }}</span>
                </div>
              </div>
            </div>
            <div *ngFor="let apt of waitingList" class="apt-row" style="margin-top:8px"
              [style.border-left]="'3px solid ' + statusColor(apt.status)">
              <span class="motif-dot" [style.background]="reasonColor(apt.reason)" style="margin-right:10px"></span>
              <div class="apt-time">{{ apt.startTime | date:'HH:mm' }}</div>
              <div class="apt-info">
                <div class="apt-name">
                  <ng-container *ngIf="isObj(apt.patient)">
                    {{ $any(apt.patient).firstName }} {{ $any(apt.patient).lastName }}
                  </ng-container>
                </div>
                <div class="apt-meta">{{ apt.reason }}</div>
              </div>
              <span [class]="'status-badge ' + apt.status">{{ apt.status }}</span>
            </div>
          </mat-tab>
        </mat-tab-group>
      </ng-container>

      <!-- WEEK VIEW -->
      <div *ngIf="!loading && viewMode === 'week'" class="week-grid">
        <div *ngFor="let day of weekCells" class="week-col"
          [class.today]="day.isToday">
          <div class="week-col-header">
            <div style="font-size:11px;text-transform:uppercase;color:var(--text-muted);letter-spacing:0.5px">
              {{ day.date | date:'EEE':'':'fr' }}
            </div>
            <div style="font-size:20px;font-weight:700;color:var(--text)">
              {{ day.date | date:'d' }}
            </div>
            <div style="font-size:11px;color:var(--text-muted)">
              {{ day.appointments.length }} RDV
            </div>
          </div>
          <div class="week-col-body">
            <div *ngFor="let apt of day.appointments" class="week-item"
              [style.cursor]="apt.status === 'confirmé' ? 'pointer' : 'default'"
              [style.border-left]="'3px solid ' + reasonColor(apt.reason)"
              (click)="openConsultation(apt)">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
                <strong style="font-size:12px">{{ apt.startTime | date:'HH:mm' }}</strong>
                <span [class]="'status-badge ' + apt.status" style="font-size:9px;padding:1px 5px">
                  {{ apt.status.substr(0,3) }}
                </span>
              </div>
              <div style="font-size:11.5px;color:var(--text);font-weight:500;line-height:1.2;margin-top:2px">
                <ng-container *ngIf="isObj(apt.patient)">
                  {{ $any(apt.patient).firstName }} {{ $any(apt.patient).lastName }}
                </ng-container>
                <ng-container *ngIf="!isObj(apt.patient)">—</ng-container>
              </div>
            </div>
            <div *ngIf="day.appointments.length === 0" style="text-align:center;color:var(--text-muted);font-size:11px;padding:12px 4px">
              Libre
            </div>
          </div>
        </div>
      </div>

      <!-- MONTH VIEW -->
      <div *ngIf="!loading && viewMode === 'month'" class="month-grid">
        <div class="month-day-name" *ngFor="let dn of dayNames">{{ dn }}</div>
        <div *ngFor="let day of monthCells" class="month-cell"
          [class.out]="!day.inMonth"
          [class.today]="day.isToday"
          (click)="goToDay(day.date)">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-weight:600;font-size:13px">{{ day.date | date:'d' }}</span>
            <span *ngIf="day.appointments.length"
              style="background:var(--primary);color:#fff;font-size:10.5px;padding:1px 7px;border-radius:10px;font-weight:600">
              {{ day.appointments.length }}
            </span>
          </div>
          <div *ngFor="let apt of day.appointments.slice(0,2)" style="font-size:10.5px;margin-top:3px;line-height:1.2;color:var(--text-muted)">
            <span class="motif-dot" [style.background]="reasonColor(apt.reason)"
              style="width:5px;height:5px;margin-right:3px;vertical-align:1px"></span>
            {{ apt.startTime | date:'HH:mm' }}
          </div>
          <div *ngIf="day.appointments.length > 2" style="font-size:10px;color:var(--primary);font-weight:600;margin-top:2px">
            +{{ day.appointments.length - 2 }}
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .motif-dot { display:inline-block; width:10px; height:10px; border-radius:50%; flex-shrink:0; }
    .week-grid { display:grid; grid-template-columns:repeat(7, 1fr); gap:10px; }
    .week-col { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); overflow:hidden; }
    .week-col.today { border-color:var(--primary); box-shadow:0 0 0 1px var(--primary); }
    .week-col-header { padding:10px 8px; text-align:center; border-bottom:1px solid var(--border); background:var(--surface-2); }
    .week-col-body { padding:6px; min-height:200px; max-height:480px; overflow-y:auto; display:flex; flex-direction:column; gap:5px; }
    .week-item { padding:5px 7px; background:var(--surface-2); border-radius:6px; transition:transform 0.1s ease; }
    .week-item:hover { transform:translateX(1px); }
    .month-grid { display:grid; grid-template-columns:repeat(7, 1fr); gap:6px; }
    .month-day-name { text-align:center; font-size:11.5px; font-weight:600; text-transform:uppercase; color:var(--text-muted); letter-spacing:0.5px; padding:6px 0; }
    .month-cell { background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:8px; min-height:84px; cursor:pointer; transition:transform 0.1s; }
    .month-cell:hover { transform:translateY(-1px); box-shadow:var(--shadow-sm); }
    .month-cell.out { opacity:0.4; background:var(--surface-2); }
    .month-cell.today { border-color:var(--primary); box-shadow:0 0 0 1px var(--primary); }
    ::ng-deep .mat-mdc-tab-body-content { overflow:visible !important; }
  `]
})
export class DoctorCalendarComponent implements OnInit, OnDestroy {
  viewMode: ViewMode = 'day';
  schedule: Appointment[] = [];
  allAppointments: Appointment[] = [];
  weekCells: DayCell[] = [];
  monthCells: DayCell[] = [];
  loading = false;
  loadError = '';
  selectedDate = new Date();
  dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  private pollHandle?: ReturnType<typeof setInterval>;

  constructor(private apptSvc: AppointmentService, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.load();
    this.pollHandle = setInterval(() => this.load(true), 15_000);
  }

  ngOnDestroy(): void { clearInterval(this.pollHandle); }

  setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
    this.load();
  }

  onDateChange(date: Date | null): void {
    if (date) { this.selectedDate = date; this.load(); }
  }

  shift(d: number): void {
    const next = new Date(this.selectedDate);
    if (this.viewMode === 'day') next.setDate(next.getDate() + d);
    else if (this.viewMode === 'week') next.setDate(next.getDate() + d * 7);
    else next.setMonth(next.getMonth() + d);
    this.selectedDate = next;
    this.load();
  }

  goToday(): void { this.selectedDate = new Date(); this.load(); }

  goToDay(d: Date): void {
    this.selectedDate = new Date(d);
    this.viewMode = 'day';
    this.load();
  }

  load(silent = false): void {
    if (!silent) { this.loading = true; this.loadError = ''; }
    if (this.viewMode === 'day') this.loadDay();
    else if (this.viewMode === 'week') this.loadRange(this.getWeekStart(), 7);
    else this.loadMonth();
  }

  private loadDay(): void {
    const dateStr = toLocalDateString(this.selectedDate);
    this.apptSvc.getDoctorDaily(dateStr).subscribe({
      next: apts => {
        this.loadError = '';
        this.schedule = (apts || []).sort((a, b) => a.startTime.localeCompare(b.startTime));
        this.allAppointments = this.schedule;
        this.loading = false;
      },
      error: (err) => {
        this.loadError = err?.error?.message || 'Impossible de charger le planning. Vérifiez votre session.';
        this.loading = false;
      }
    });
  }

  private loadRange(start: Date, days: number): void {
    const isos: string[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      isos.push(toLocalDateString(d));
    }
    forkJoin(isos.map(iso => this.apptSvc.getDoctorDaily(iso).pipe(catchError(() => of([] as Appointment[])))))
      .subscribe(results => {
        this.weekCells = isos.map((iso, idx) => {
          const d = new Date(`${iso}T00:00:00`);
          return {
            date: d,
            iso,
            inMonth: true,
            isToday: this.isSameDay(d, new Date()),
            appointments: (results[idx] || []).sort((a, b) => a.startTime.localeCompare(b.startTime))
          };
        });
        this.allAppointments = this.weekCells.flatMap(c => c.appointments);
        this.loading = false;
      });
  }

  private loadMonth(): void {
    const first = new Date(this.selectedDate.getFullYear(), this.selectedDate.getMonth(), 1);
    const last = new Date(this.selectedDate.getFullYear(), this.selectedDate.getMonth() + 1, 0);
    const gridStart = this.getWeekStart(first);
    const totalDays = 42;
    const isos: string[] = [];
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      isos.push(toLocalDateString(d));
    }
    forkJoin(isos.map(iso => this.apptSvc.getDoctorDaily(iso).pipe(catchError(() => of([] as Appointment[])))))
      .subscribe(results => {
        this.monthCells = isos.map((iso, idx) => {
          const d = new Date(`${iso}T00:00:00`);
          return {
            date: d,
            iso,
            inMonth: d.getMonth() === this.selectedDate.getMonth(),
            isToday: this.isSameDay(d, new Date()),
            appointments: (results[idx] || []).sort((a, b) => a.startTime.localeCompare(b.startTime))
          };
        });
        this.allAppointments = this.monthCells.filter(c => c.inMonth).flatMap(c => c.appointments);
        this.loading = false;
        const _ = last;
      });
  }

  private getWeekStart(d: Date = this.selectedDate): Date {
    const r = new Date(d);
    const day = r.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    r.setDate(r.getDate() + diff);
    r.setHours(0, 0, 0, 0);
    return r;
  }

  private isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  headerSubtitle(): string {
    if (this.viewMode === 'day') {
      return new Intl.DateTimeFormat('fr', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(this.selectedDate);
    }
    if (this.viewMode === 'week') {
      const start = this.getWeekStart();
      const end = new Date(start); end.setDate(start.getDate() + 6);
      return `Semaine du ${start.toLocaleDateString('fr-FR')} au ${end.toLocaleDateString('fr-FR')}`;
    }
    return new Intl.DateTimeFormat('fr', { month: 'long', year: 'numeric' }).format(this.selectedDate);
  }

  get waitingList(): Appointment[] {
    const now = new Date();
    return this.schedule
      .filter(a => (a.status === 'en attente' || a.status === 'confirmé') && new Date(a.startTime) >= now)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  get nextAppt(): Appointment | null {
    return this.waitingList[0] || null;
  }

  openConsultation(apt: Appointment): void {
    if (apt.status !== 'confirmé') return;
    const ref = this.dialog.open(ConsultationFormComponent, { width: '640px', data: apt });
    ref.afterClosed().subscribe(saved => { if (saved) this.load(); });
  }

  countBy(s: string): number {
    return this.allAppointments.filter(a => a.status === s).length;
  }

  statusColor(s: string): string {
    const map: Record<string, string> = {
      confirmé: '#16A34A', 'en attente': '#D97706',
      annulé: '#DC2626', terminé: '#2563EB',
      indisponible: '#7C3AED', 'no-show': '#6B7280'
    };
    return map[s] ?? '#CBD5E1';
  }

  reasonColor(r: string): string {
    const map: Record<string, string> = {
      'consultation générale': '#00838F',
      'suivi': '#2563EB',
      'urgence': '#DC2626',
      'autre': '#6B7280',
      'indisponibilité': '#7C3AED'
    };
    return map[r] ?? '#94A3B8';
  }

  isObj(d: any): boolean { return d && typeof d === 'object'; }
}
