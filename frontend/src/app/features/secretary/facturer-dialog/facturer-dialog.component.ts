import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Appointment } from '../../../core/models';

export interface FacturerDialogData {
  appointment: Appointment;
  baseFee: number;
}

export interface FacturerDialogResult {
  amount: number;
  nomenclature: string;
}

@Component({
  selector: 'app-facturer-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title style="display:flex;align-items:center;gap:8px;margin:0">
      <mat-icon style="color:var(--primary)">receipt_long</mat-icon>
      Facturer la consultation
    </h2>
    <mat-dialog-content>
      <div style="background:var(--surface-2, #f8fafc);border-radius:8px;padding:12px 14px;margin-bottom:16px;font-size:13.5px">
        <div><strong>Patient :</strong> {{ patientName }}</div>
        <div><strong>Médecin :</strong> {{ doctorName }}</div>
        <div><strong>Date :</strong> {{ data.appointment.startTime | date:'d MMM y, HH:mm':'':'fr' }}</div>
      </div>
      <form [formGroup]="form" style="display:flex;flex-direction:column;gap:8px">
        <mat-form-field appearance="outline">
          <mat-label>Acte (nomenclature)</mat-label>
          <input matInput formControlName="nomenclature">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Montant (DH)</mat-label>
          <input matInput type="number" formControlName="amount" min="0">
          <mat-hint>Tarif de base du médecin : {{ data.baseFee }} DH</mat-hint>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button (click)="cancel()">Annuler</button>
      <button mat-raised-button color="primary" [disabled]="form.invalid" (click)="confirm()">
        <mat-icon>check</mat-icon> Confirmer
      </button>
    </mat-dialog-actions>
  `
})
export class FacturerDialogComponent {
  form: FormGroup;
  patientName: string;
  doctorName: string;

  constructor(
    private fb: FormBuilder,
    private ref: MatDialogRef<FacturerDialogComponent, FacturerDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: FacturerDialogData
  ) {
    const apt = data.appointment;
    const p: any = apt.patient;
    const d: any = apt.doctor;
    this.patientName = typeof p === 'object' ? `${p.firstName} ${p.lastName}` : '—';
    this.doctorName  = typeof d === 'object' ? `Dr. ${d.firstName} ${d.lastName}` : '—';
    this.form = this.fb.group({
      nomenclature: [`Consultation — ${apt.reason || 'CS'}`, Validators.required],
      amount: [data.baseFee, [Validators.required, Validators.min(0)]]
    });
  }

  cancel(): void { this.ref.close(); }

  confirm(): void {
    if (this.form.invalid) return;
    this.ref.close({
      amount: Number(this.form.value.amount),
      nomenclature: this.form.value.nomenclature
    });
  }
}
