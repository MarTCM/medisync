/**
 * Composant BookForPatientDialogComponent — dialogue de prise de RDV au nom d'un patient (secrétaire).
 *
 * - Choix du médecin, de la date, du créneau et du motif.
 * - Délègue à AppointmentService.create avec patientId explicite (l'authController distingue ce cas).
 */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { AppointmentService } from '../../../core/services/appointment.service';
import { DoctorService } from '../../../core/services/doctor.service';
import { AdminService } from '../../../core/services/admin.service';
import { toLocalDateString } from '../../../core/utils/date';

@Component({
  selector: 'app-book-for-patient-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatDatepickerModule, MatNativeDateModule, MatCheckboxModule],
  template: `
    <h2 mat-dialog-title>
      Nouveau rendez-vous
      <span *ngIf="form.value.urgent" style="background:#fee2e2;color:#b91c1c;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;margin-left:8px;vertical-align:3px">
        URGENCE
      </span>
    </h2>
    <mat-dialog-content style="min-width:440px">
      <form [formGroup]="form">
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:10px 12px;margin-bottom:14px">
          <mat-checkbox formControlName="urgent" (change)="onUrgentToggle($event.checked)" color="warn">
            <strong>Rendez-vous urgent</strong> — insertion prioritaire
          </mat-checkbox>
          <div *ngIf="form.value.urgent" style="font-size:12px;color:#7f1d1d;margin-top:4px;margin-left:30px">
            Le créneau sera inséré aujourd'hui (15 min) même en cas de conflit.
          </div>
        </div>
        <mat-form-field style="width:100%; margin-bottom:8px">
          <mat-label>Patient</mat-label>
          <mat-select formControlName="patientId">
            <mat-option *ngFor="let p of patients" [value]="p._id">
              {{ p.firstName }} {{ p.lastName }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field style="width:100%; margin-bottom:8px">
          <mat-label>Médecin</mat-label>
          <mat-select formControlName="doctorId">
            <mat-option *ngFor="let d of doctors" [value]="d._id">Dr. {{ d.firstName }} {{ d.lastName }} — {{ d.specialties?.join(', ') }}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field style="width:100%; margin-bottom:8px">
          <mat-label>Date</mat-label>
          <input matInput [matDatepicker]="picker" formControlName="date" [min]="today">
          <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-datepicker #picker></mat-datepicker>
        </mat-form-field>

        <div style="display:flex; gap:8px; margin-bottom:8px">
          <mat-form-field style="flex:1">
            <mat-label>Heure (HH:mm)</mat-label>
            <input matInput formControlName="time" placeholder="09:00">
          </mat-form-field>
          <mat-form-field style="flex:1">
            <mat-label>Durée</mat-label>
            <mat-select formControlName="duration">
              <mat-option [value]="15">15 min</mat-option>
              <mat-option [value]="30">30 min</mat-option>
              <mat-option [value]="60">1 heure</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <mat-form-field style="width:100%">
          <mat-label>Motif</mat-label>
          <mat-select formControlName="reason">
            <mat-option value="consultation générale">Consultation générale</mat-option>
            <mat-option value="suivi">Suivi</mat-option>
            <mat-option value="urgence">Urgence</mat-option>
            <mat-option value="autre">Autre</mat-option>
          </mat-select>
        </mat-form-field>

        <div *ngIf="error" style="color:#c62828; margin-top:8px; font-size:13px">{{ error }}</div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Annuler</button>
      <button mat-raised-button color="primary" [disabled]="form.invalid || loading" (click)="save()">
        {{ loading ? 'Enregistrement…' : 'Créer le RDV' }}
      </button>
    </mat-dialog-actions>
  `
})
export class BookForPatientDialogComponent implements OnInit {
  form: FormGroup;
  patients: any[] = [];
  doctors: any[] = [];
  loading = false;
  error = '';
  today = new Date();

  constructor(
    private fb: FormBuilder,
    private apptSvc: AppointmentService,
    private doctorSvc: DoctorService,
    private adminSvc: AdminService,
    private dialogRef: MatDialogRef<BookForPatientDialogComponent>
  ) {
    this.form = this.fb.group({
      patientId: ['', Validators.required],
      doctorId:  ['', Validators.required],
      date:      [null, Validators.required],
      time:      ['', [Validators.required, Validators.pattern(/^\d{2}:\d{2}$/)]],
      duration:  [30, Validators.required],
      reason:    ['consultation générale', Validators.required],
      urgent:    [false]
    });
  }

  onUrgentToggle(checked: boolean): void {
    if (checked) {
      const now = new Date();
      const next = new Date(now.getTime() + 5 * 60_000);
      const hh = String(next.getHours()).padStart(2, '0');
      const mm = String(Math.ceil(next.getMinutes() / 5) * 5).padStart(2, '0');
      this.form.patchValue({
        reason: 'urgence',
        duration: 15,
        date: new Date(),
        time: `${hh}:${mm === '60' ? '00' : mm}`
      });
    }
  }

  ngOnInit(): void {
    this.adminSvc.listPatients().subscribe({
      next: res => { this.patients = res.patients; }
    });
    this.doctorSvc.search({}).subscribe({
      next: res => { this.doctors = res.doctors; }
    });
  }

  save(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    const { patientId, doctorId, date, time, duration, reason, urgent } = this.form.value;
    const dateStr = toLocalDateString(date as Date);
    this.apptSvc.create({ patientId, doctorId, date: dateStr, time, duration, reason, urgent } as any).subscribe({
      next: () => { this.loading = false; this.dialogRef.close(true); },
      error: err => { this.loading = false; this.error = err.error?.message || 'Erreur lors de la création.'; }
    });
  }
}
