import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';
import { AppointmentService } from '../../../core/services/appointment.service';
import { AuthService } from '../../../core/services/auth.service';
import { DoctorProfile } from '../../../core/models';
import { toLocalDateString } from '../../../core/utils/date';

interface TimeSlot { time: string; available: boolean; }

@Component({
  selector: 'app-book-appointment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatDatepickerModule, MatNativeDateModule,
    MatButtonModule, MatRadioModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="page-container" style="max-width:680px">
      <div class="page-header">
        <h2>Prendre un rendez-vous</h2>
      </div>

      <!-- Doctor info -->
      <div *ngIf="doctor" style="background:var(--primary-light);border-radius:var(--radius);border:1px solid #b2dfdb;padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;gap:14px">
        <div style="width:46px;height:46px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:700;flex-shrink:0">
          {{ doctor.firstName?.charAt(0) }}{{ doctor.lastName?.charAt(0) }}
        </div>
        <div>
          <div style="font-weight:700;font-size:15px;color:var(--text)">Dr. {{ doctor.firstName }} {{ doctor.lastName }}</div>
          <div style="font-size:13px;color:var(--text-muted);margin-top:2px">{{ doctor.specialties?.join(', ') }}</div>
        </div>
        <div style="margin-left:auto;text-align:right">
          <div style="font-size:16px;font-weight:700;color:var(--primary)">{{ doctor.baseFee }} DH</div>
          <div style="font-size:11px;color:var(--text-muted)">par consultation</div>
        </div>
      </div>

      <!-- Form -->
      <div style="background:var(--surface);border-radius:var(--radius);border:1px solid var(--border);padding:28px;box-shadow:var(--shadow-sm)">
        <form [formGroup]="form" (ngSubmit)="onSubmit()">

          <!-- Dependent selector (only if patient has dependents) -->
          <mat-form-field class="full-width" *ngIf="dependents.length">
            <mat-label>Pour qui est ce rendez-vous ?</mat-label>
            <mat-select formControlName="dependentId">
              <mat-option value="">Moi-même</mat-option>
              <mat-option *ngFor="let d of dependents" [value]="d._id">
                {{ d.firstName }} {{ d.lastName }} ({{ d.relation }})
              </mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Duration -->
          <div style="margin-bottom:20px">
            <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px">Durée</div>
            <mat-radio-group formControlName="duration" style="display:flex;gap:20px">
              <mat-radio-button [value]="15">15 min</mat-radio-button>
              <mat-radio-button [value]="30">30 min</mat-radio-button>
              <mat-radio-button [value]="60">1 heure</mat-radio-button>
            </mat-radio-group>
          </div>

          <!-- Date picker -->
          <mat-form-field class="full-width">
            <mat-label>Date</mat-label>
            <input matInput [matDatepicker]="picker" formControlName="date" [min]="minDate">
            <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
          </mat-form-field>

          <!-- Time slot grid -->
          <div style="margin-bottom:20px">
            <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;display:flex;align-items:center;gap:8px">
              Créneau horaire
              <mat-spinner *ngIf="loadingSlots" [diameter]="14"></mat-spinner>
            </div>

            <div *ngIf="!form.get('date')?.value" style="font-size:13px;color:var(--text-muted);padding:14px;background:#f8fafc;border-radius:8px;border:1px dashed var(--border);text-align:center">
              Sélectionnez une date pour afficher les créneaux disponibles.
            </div>

            <div *ngIf="form.get('date')?.value && !loadingSlots && slots.length === 0" style="font-size:13px;color:#92400e;padding:14px;background:#fef9c3;border-radius:8px;border:1px solid #fde047;text-align:center">
              Aucun créneau disponible pour ce jour.
            </div>

            <div *ngIf="slots.length > 0" style="display:flex;flex-wrap:wrap;gap:8px">
              <button *ngFor="let slot of slots"
                type="button"
                [disabled]="!slot.available"
                (click)="selectSlot(slot.time)"
                [ngClass]="{
                  'slot-selected': selectedTime === slot.time,
                  'slot-taken': !slot.available
                }"
                class="slot-btn">
                {{ slot.time }}
              </button>
            </div>

            <div *ngIf="selectedTime" style="margin-top:10px;font-size:13px;color:var(--primary);font-weight:600;display:flex;align-items:center;gap:4px">
              <mat-icon style="font-size:16px;height:16px;width:16px;line-height:16px">check_circle</mat-icon>
              Créneau sélectionné : {{ selectedTime }}
            </div>
          </div>

          <mat-form-field class="full-width">
            <mat-label>Motif de la consultation</mat-label>
            <mat-select formControlName="reason">
              <mat-option value="consultation générale">Consultation générale</mat-option>
              <mat-option value="suivi">Suivi</mat-option>
              <mat-option value="urgence">Urgence</mat-option>
              <mat-option value="autre">Autre</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field class="full-width">
            <mat-label>Notes pour le médecin (optionnel)</mat-label>
            <textarea matInput formControlName="notes" rows="3" placeholder="Décrivez brièvement votre situation…"></textarea>
          </mat-form-field>

          <div *ngIf="error" style="background:#fee2e2;color:#dc2626;border-radius:6px;padding:10px 14px;font-size:13px;margin-bottom:14px;display:flex;align-items:center;gap:6px">
            <mat-icon style="font-size:16px">error</mat-icon> {{ error }}
          </div>
          <div *ngIf="success" style="background:#dcfce7;color:#15803d;border-radius:6px;padding:10px 14px;font-size:13px;margin-bottom:14px;display:flex;align-items:center;gap:6px">
            <mat-icon style="font-size:16px">check_circle</mat-icon> {{ success }}
          </div>

          <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:8px">
            <button mat-stroked-button type="button" (click)="goBack()">Retour</button>
            <button mat-raised-button color="primary" type="submit"
              [disabled]="loading || form.invalid || !selectedTime"
              style="min-width:180px">
              {{ loading ? 'Réservation…' : 'Confirmer le rendez-vous' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .slot-btn {
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s, color 0.15s;
      min-width: 72px;
      text-align: center;
      background: var(--surface);
      color: var(--text);
      border: 1.5px solid var(--border);
    }
    .slot-btn:hover:not(:disabled):not(.slot-selected) {
      border-color: var(--primary);
      color: var(--primary);
    }
    .slot-btn.slot-selected {
      background: var(--primary);
      color: #fff;
      border-color: var(--primary);
    }
    .slot-btn.slot-taken {
      background: #f1f5f9;
      color: #94a3b8;
      border-color: #e2e8f0;
      cursor: not-allowed;
      text-decoration: line-through;
    }
  `]
})
export class BookAppointmentComponent implements OnInit, OnDestroy {
  form: FormGroup;
  doctor?: DoctorProfile;
  dependents: any[] = [];
  loading = false;
  error = '';
  success = '';
  minDate = new Date();

  slots: TimeSlot[] = [];
  loadingSlots = false;
  selectedTime = '';

  private subs: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private apptSvc: AppointmentService,
    private authSvc: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      date:        ['', Validators.required],
      time:        ['', Validators.required],
      duration:    [30, Validators.required],
      reason:      ['consultation générale', Validators.required],
      notes:       [''],
      dependentId: ['']
    });
  }

  ngOnInit(): void {
    this.doctor = history.state?.doctor;
    if (!this.doctor) { this.router.navigate(['/patient/search']); return; }

    this.authSvc.getMe().subscribe({
      next: res => { this.dependents = res.profile?.dependents ?? []; }
    });

    this.subs.push(
      this.form.get('date')!.valueChanges.subscribe(() => {
        this.clearSlotSelection();
        this.fetchSlots();
      }),
      this.form.get('duration')!.valueChanges.subscribe(() => {
        this.clearSlotSelection();
        this.fetchSlots();
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private clearSlotSelection(): void {
    this.selectedTime = '';
    this.form.patchValue({ time: '' }, { emitEvent: false });
    this.slots = [];
  }

  private fetchSlots(): void {
    const dateVal = this.form.get('date')!.value;
    if (!dateVal || !this.doctor) return;

    const dateStr = toLocalDateString(new Date(dateVal));
    const duration: number = this.form.get('duration')!.value;

    this.loadingSlots = true;
    this.apptSvc.getAvailableSlots(this.doctor._id, dateStr, duration).subscribe({
      next: res => {
        this.slots = res.slots;
        this.loadingSlots = false;
      },
      error: () => {
        this.slots = [];
        this.loadingSlots = false;
      }
    });
  }

  selectSlot(time: string): void {
    this.selectedTime = time;
    this.form.patchValue({ time }, { emitEvent: false });
  }

  goBack(): void { this.router.navigate(['/patient/search']); }

  onSubmit(): void {
    if (this.form.invalid || !this.doctor || !this.selectedTime) return;
    this.loading = true;
    this.error = '';
    const { date, time, duration, reason, notes, dependentId } = this.form.value;
    const dateStr = toLocalDateString(new Date(date));
    const payload: any = { doctorId: this.doctor._id, date: dateStr, time, duration, reason, notes };
    if (dependentId) payload.dependentId = dependentId;
    this.apptSvc.create(payload).subscribe({
      next: () => {
        this.loading = false;
        this.success = 'Rendez-vous créé avec succès !';
        setTimeout(() => this.router.navigate(['/patient/appointments']), 1400);
      },
      error: err => {
        this.loading = false;
        this.error = err.error?.message || 'Erreur lors de la réservation.';
      }
    });
  }
}
