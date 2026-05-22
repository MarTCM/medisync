import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DoctorService } from '../../../core/services/doctor.service';

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

@Component({
  selector: 'app-doctor-availability',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatButtonToggleModule, MatChipsModule, MatSnackBarModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2>Disponibilités</h2>
          <div class="page-subtitle">Heures de travail régulières et durée de consultation</div>
        </div>
      </div>

      <div *ngIf="loading" style="text-align:center;padding:48px;color:var(--text-muted)">Chargement…</div>

      <form *ngIf="!loading" [formGroup]="form" (ngSubmit)="save()" class="card" style="padding:24px;max-width:720px">
        <h3 style="margin:0 0 6px;font-size:16px">Jours travaillés</h3>
        <p style="color:var(--text-muted);font-size:13px;margin:0 0 14px">
          Cochez les jours où vous recevez en consultation.
        </p>
        <mat-chip-listbox multiple [value]="selectedDays" (change)="toggleDays($event.value)">
          <mat-chip-option *ngFor="let d of days" [value]="d" [selected]="selectedDays.includes(d)">
            {{ d }}
          </mat-chip-option>
        </mat-chip-listbox>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:24px">
          <mat-form-field appearance="outline">
            <mat-label>Heure de début</mat-label>
            <input matInput type="time" formControlName="startHour" required>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Heure de fin</mat-label>
            <input matInput type="time" formControlName="endHour" required>
          </mat-form-field>
        </div>

        <h3 style="margin:18px 0 8px;font-size:16px">Durée standard d'une consultation</h3>
        <mat-button-toggle-group formControlName="defaultConsultationDuration" style="height:42px">
          <mat-button-toggle [value]="15">15 min</mat-button-toggle>
          <mat-button-toggle [value]="30">30 min</mat-button-toggle>
          <mat-button-toggle [value]="60">60 min</mat-button-toggle>
        </mat-button-toggle-group>

        <div *ngIf="form.value.startHour && form.value.endHour && !isValidRange()"
          style="margin-top:12px;color:#c62828;font-size:13px">
          L'heure de fin doit être postérieure à l'heure de début.
        </div>

        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:24px">
          <button mat-stroked-button type="button" (click)="reset()" [disabled]="saving">Réinitialiser</button>
          <button mat-raised-button color="primary" type="submit"
            [disabled]="form.invalid || saving || selectedDays.length === 0 || !isValidRange()">
            <mat-icon>save</mat-icon> {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
          </button>
        </div>
      </form>

      <div *ngIf="!loading" class="card" style="padding:18px 22px;margin-top:18px;max-width:720px">
        <h3 style="margin:0 0 10px;font-size:14px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">
          Résumé actuel
        </h3>
        <div style="display:flex;flex-wrap:wrap;gap:18px;font-size:13.5px">
          <div><strong>Jours :</strong> {{ selectedDays.length ? selectedDays.join(', ') : '—' }}</div>
          <div><strong>Horaires :</strong> {{ form.value.startHour }} – {{ form.value.endHour }}</div>
          <div><strong>Durée :</strong> {{ form.value.defaultConsultationDuration }} min</div>
        </div>
      </div>
    </div>
  `
})
export class DoctorAvailabilityComponent implements OnInit {
  form: FormGroup;
  loading = true;
  saving = false;
  days = DAYS;
  selectedDays: string[] = [];

  constructor(
    private fb: FormBuilder,
    private doctorSvc: DoctorService,
    private snack: MatSnackBar
  ) {
    this.form = this.fb.group({
      startHour: ['09:00', Validators.required],
      endHour: ['18:00', Validators.required],
      defaultConsultationDuration: [30, Validators.required]
    });
  }

  ngOnInit(): void {
    this.doctorSvc.getMe().subscribe({
      next: res => {
        const s = res.doctor?.schedule;
        if (s) {
          this.selectedDays = s.workDays || [];
          this.form.patchValue({
            startHour: s.startHour || '09:00',
            endHour: s.endHour || '18:00',
            defaultConsultationDuration: s.defaultConsultationDuration || 30
          });
        }
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  toggleDays(values: string[]): void {
    this.selectedDays = values;
  }

  isValidRange(): boolean {
    const s = this.form.value.startHour;
    const e = this.form.value.endHour;
    return !!(s && e && s < e);
  }

  reset(): void {
    this.selectedDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
    this.form.patchValue({ startHour: '09:00', endHour: '18:00', defaultConsultationDuration: 30 });
  }

  save(): void {
    if (this.form.invalid || !this.isValidRange() || this.selectedDays.length === 0) return;
    this.saving = true;
    const payload = {
      schedule: {
        workDays: this.selectedDays,
        startHour: this.form.value.startHour,
        endHour: this.form.value.endHour,
        defaultConsultationDuration: this.form.value.defaultConsultationDuration
      }
    } as any;
    this.doctorSvc.updateMe(payload).subscribe({
      next: () => {
        this.saving = false;
        this.snack.open('Disponibilités enregistrées.', 'OK', { duration: 3000 });
      },
      error: err => {
        this.saving = false;
        this.snack.open(err.error?.message || 'Erreur lors de l\'enregistrement.', 'OK', { duration: 4000 });
      }
    });
  }
}
