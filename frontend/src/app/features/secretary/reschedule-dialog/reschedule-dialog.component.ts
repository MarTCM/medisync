/**
 * Composant RescheduleDialogComponent — dialogue de reprogrammation d'un RDV (secrétaire).
 *
 * - Sélection d'une nouvelle date/heure parmi les créneaux disponibles du médecin.
 * - Délègue à AppointmentService.reschedule ; déclenche l'envoi d'un email de notification au patient.
 */
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AppointmentService } from '../../../core/services/appointment.service';
import { Appointment } from '../../../core/models';
import { toLocalDateString } from '../../../core/utils/date';

@Component({
  selector: 'app-reschedule-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule, MatDatepickerModule, MatNativeDateModule, MatSnackBarModule],
  template: `
    <h2 mat-dialog-title>Déplacer le rendez-vous</h2>
    <mat-dialog-content style="min-width:380px">
      <div style="font-size:13px;color:var(--text-muted);margin-bottom:14px">
        Rendez-vous actuel :
        <strong style="color:var(--text)">
          {{ data.startTime | date:'EEEE d MMMM y, HH:mm':'':'fr' }}
        </strong>
      </div>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Nouvelle date</mat-label>
          <input matInput [matDatepicker]="picker" formControlName="date" required>
          <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-datepicker #picker></mat-datepicker>
        </mat-form-field>
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Nouvelle heure</mat-label>
          <input matInput type="time" formControlName="time" required>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close [disabled]="saving">Annuler</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="form.invalid || saving">
        <mat-icon>swap_horiz</mat-icon> {{ saving ? 'Déplacement…' : 'Déplacer' }}
      </button>
    </mat-dialog-actions>
  `
})
export class RescheduleDialogComponent {
  form: FormGroup;
  saving = false;

  constructor(
    private fb: FormBuilder,
    private apptSvc: AppointmentService,
    private snack: MatSnackBar,
    private dialogRef: MatDialogRef<RescheduleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Appointment
  ) {
    const current = new Date(data.startTime);
    this.form = this.fb.group({
      date: [current, Validators.required],
      time: [`${String(current.getHours()).padStart(2, '0')}:${String(current.getMinutes()).padStart(2, '0')}`, Validators.required]
    });
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving = true;
    const date = toLocalDateString(this.form.value.date);
    const time = this.form.value.time;
    this.apptSvc.reschedule(this.data._id, date, time).subscribe({
      next: () => {
        this.saving = false;
        this.snack.open('Rendez-vous déplacé.', 'OK', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: err => {
        this.saving = false;
        this.snack.open(err.error?.message || 'Erreur lors du déplacement.', 'OK', { duration: 4000 });
      }
    });
  }
}
