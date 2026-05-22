import { Component, OnInit } from '@angular/core';
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
import { AppointmentService } from '../../../core/services/appointment.service';
import { AuthService } from '../../../core/services/auth.service';
import { DoctorProfile } from '../../../core/models';
import { toLocalDateString } from '../../../core/utils/date';

@Component({
  selector: 'app-book-appointment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatDatepickerModule, MatNativeDateModule,
    MatButtonModule, MatRadioModule, MatIconModule],
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

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 16px">
            <mat-form-field class="full-width">
              <mat-label>Date</mat-label>
              <input matInput [matDatepicker]="picker" formControlName="date" [min]="minDate">
              <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
              <mat-datepicker #picker></mat-datepicker>
            </mat-form-field>
            <mat-form-field class="full-width">
              <mat-label>Heure (HH:mm)</mat-label>
              <mat-icon matPrefix style="color:#94a3b8;margin-right:4px">schedule</mat-icon>
              <input matInput formControlName="time" placeholder="09:00">
            </mat-form-field>
          </div>

          <div style="margin-bottom:20px">
            <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px">Durée</div>
            <mat-radio-group formControlName="duration" style="display:flex;gap:20px">
              <mat-radio-button [value]="15">15 min</mat-radio-button>
              <mat-radio-button [value]="30">30 min</mat-radio-button>
              <mat-radio-button [value]="60">1 heure</mat-radio-button>
            </mat-radio-group>
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
            <button mat-raised-button color="primary" type="submit" [disabled]="loading || form.invalid" style="min-width:180px">
              {{ loading ? 'Réservation…' : 'Confirmer le rendez-vous' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class BookAppointmentComponent implements OnInit {
  form: FormGroup;
  doctor?: DoctorProfile;
  dependents: any[] = [];
  loading = false;
  error = '';
  success = '';
  minDate = new Date();

  constructor(
    private fb: FormBuilder,
    private apptSvc: AppointmentService,
    private authSvc: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      date:        ['', Validators.required],
      time:        ['', [Validators.required, Validators.pattern(/^\d{2}:\d{2}$/)]],
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
  }

  goBack(): void { this.router.navigate(['/patient/search']); }

  onSubmit(): void {
    if (this.form.invalid || !this.doctor) return;
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
