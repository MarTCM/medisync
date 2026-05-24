/**
 * Composant FacturerDialogComponent — dialogue de création de facture pour un RDV terminé.
 *
 * - Pré-remplit montant et nomenclature à partir de la grille d'honoraires du médecin.
 * - Délègue à InvoiceService.create ; reçoit appointment + médecin + patient via MAT_DIALOG_DATA.
 */
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Appointment, DoctorFee } from '../../../core/models';

export interface FacturerDialogData {
  appointment: Appointment;
  baseFee: number;
  fees: DoctorFee[];
}

export interface FacturerDialogResult {
  amount: number;
  nomenclature: string;
}

@Component({
  selector: 'app-facturer-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title style="display:flex;align-items:center;gap:8px;margin:0">
      <mat-icon style="color:var(--primary)">receipt_long</mat-icon>
      Facturer la consultation
    </h2>
    <mat-dialog-content>
      <div style="background:var(--surface-2,#f8fafc);border-radius:8px;padding:12px 14px;margin-bottom:16px;font-size:13.5px">
        <div><strong>Patient :</strong> {{ patientName }}</div>
        <div><strong>Médecin :</strong> {{ doctorName }}</div>
        <div><strong>Date :</strong> {{ data.appointment.startTime | date:'d MMM y, HH:mm':'':'fr' }}</div>
      </div>

      <form [formGroup]="form" style="display:flex;flex-direction:column;gap:8px">
        <!-- Act selector — always shown when fees exist, pre-selected from booking -->
        <mat-form-field *ngIf="data.fees?.length" appearance="outline">
          <mat-label>Acte</mat-label>
          <mat-select formControlName="act" (selectionChange)="onActSelect($event.value)">
            <mat-option value="">— Saisie manuelle —</mat-option>
            <mat-option *ngFor="let f of data.fees" [value]="feeKey(f)">
              <span style="font-weight:600;font-family:monospace">{{ f.code }}</span>
              &nbsp;—&nbsp;{{ f.label }}&nbsp;<span style="color:var(--primary);font-weight:600">({{ f.price }} DH)</span>
            </mat-option>
          </mat-select>
          <mat-hint *ngIf="bookedFromCatalog">Pré-rempli d'après la réservation du patient</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Libellé (nomenclature)</mat-label>
          <input matInput formControlName="nomenclature">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Montant (DH)</mat-label>
          <input matInput type="number" formControlName="amount" min="0">
          <mat-hint *ngIf="!data.fees?.length">Tarif de base du médecin : {{ data.baseFee }} DH</mat-hint>
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
  bookedFromCatalog = false;

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

    // Try to match the appointment reason against the fees catalog
    const matchedFee = (data.fees || []).find(f => this.feeKey(f) === apt.reason) ?? null;
    this.bookedFromCatalog = !!matchedFee;

    this.form = this.fb.group({
      act:         [matchedFee ? this.feeKey(matchedFee) : ''],
      nomenclature: [matchedFee ? this.feeKey(matchedFee) : `Consultation — ${apt.reason || 'CS'}`, Validators.required],
      amount:       [matchedFee ? matchedFee.price : data.baseFee, [Validators.required, Validators.min(0)]]
    });
  }

  feeKey(f: DoctorFee): string {
    return `${f.code} — ${f.label}`;
  }

  onActSelect(value: string): void {
    if (!value) return;
    const fee = (this.data.fees || []).find(f => this.feeKey(f) === value);
    if (fee) {
      this.form.patchValue({ nomenclature: this.feeKey(fee), amount: fee.price });
    }
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
