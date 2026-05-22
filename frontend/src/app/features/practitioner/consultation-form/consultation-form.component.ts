import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { RecordService } from '../../../core/services/record.service';
import { Appointment, MedicalRecord } from '../../../core/models';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-consultation-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatChipsModule, MatIconModule, MatExpansionModule],
  template: `
    <h2 mat-dialog-title>Consultation — {{ patientName }}</h2>
    <mat-dialog-content style="min-width:560px; max-height:80vh">

      <!-- Patient medical context -->
      <mat-expansion-panel *ngIf="record" style="margin-bottom:16px">
        <mat-expansion-panel-header>
          <mat-panel-title style="font-weight:600">Dossier médical du patient</mat-panel-title>
        </mat-expansion-panel-header>
        <div style="padding:4px 0 8px">
          <div style="margin-bottom:8px">
            <strong>Antécédents :</strong>
            <span *ngIf="!record.history?.length" style="color:#666; margin-left:6px">Aucun</span>
            <mat-chip-set *ngIf="record.history?.length" style="margin-top:4px">
              <mat-chip *ngFor="let h of record.history">{{ h }}</mat-chip>
            </mat-chip-set>
          </div>
          <div style="margin-bottom:8px">
            <strong>Allergies :</strong>
            <span *ngIf="!record.allergies?.length" style="color:#666; margin-left:6px">Aucune</span>
            <mat-chip-set *ngIf="record.allergies?.length" style="margin-top:4px">
              <mat-chip color="warn" *ngFor="let a of record.allergies">{{ a }}</mat-chip>
            </mat-chip-set>
          </div>
          <div *ngIf="record.consultations?.length">
            <strong>Dernière consultation :</strong>
            <span style="color:#444; margin-left:6px">
              {{ record.consultations[record.consultations.length - 1].date | date:'d MMM y':'':'fr' }}
              — {{ record.consultations[record.consultations.length - 1].report | slice:0:80 }}…
            </span>
          </div>
          <div *ngIf="record.attachments?.length" style="margin-top:10px">
            <strong>Documents du patient :</strong>
            <div *ngFor="let att of record.attachments"
                 style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;margin-top:6px">
              <span style="font-size:13px">
                <mat-icon style="font-size:15px;vertical-align:middle;margin-right:4px">description</mat-icon>
                {{ att.fileName }}
                <span style="color:#888;font-size:12px"> · {{ att.uploadedAt | date:'d MMM y':'':'fr' }}</span>
              </span>
              <button mat-stroked-button (click)="openDoc(att.fileUrl)">
                <mat-icon>open_in_new</mat-icon> Ouvrir
              </button>
            </div>
          </div>
        </div>
      </mat-expansion-panel>
      <div *ngIf="loadingRecord" style="font-size:13px;color:#666;margin-bottom:12px">Chargement du dossier…</div>

      <form [formGroup]="form">
        <mat-form-field style="width:100%; margin-bottom:12px">
          <mat-label>Compte rendu médical</mat-label>
          <textarea matInput formControlName="report" rows="5" placeholder="Observations, diagnostic, traitement recommandé…"></textarea>
        </mat-form-field>

        <div style="font-weight:600; margin-bottom:8px">Prescriptions</div>
        <div formArrayName="prescriptions">
          <div *ngFor="let p of prescriptions.controls; let i=index" [formGroupName]="i"
            style="display:flex; gap:8px; margin-bottom:8px; align-items:center">
            <mat-form-field style="flex:2">
              <mat-label>Médicament</mat-label>
              <input matInput formControlName="medication">
            </mat-form-field>
            <mat-form-field style="flex:2">
              <mat-label>Posologie</mat-label>
              <input matInput formControlName="dosage" placeholder="ex: 1 cp matin et soir">
            </mat-form-field>
            <mat-form-field style="flex:1">
              <mat-label>Durée</mat-label>
              <input matInput formControlName="duration" placeholder="ex: 7 jours">
            </mat-form-field>
            <button mat-icon-button color="warn" type="button" (click)="removeRx(i)">
              <mat-icon>close</mat-icon>
            </button>
          </div>
        </div>
        <button mat-stroked-button type="button" (click)="addRx()" style="margin-bottom:16px">
          <mat-icon>add</mat-icon> Ajouter un médicament
        </button>

        <!-- Document upload for doctor -->
        <div style="margin-bottom:8px">
          <div style="font-weight:600; margin-bottom:6px">Joindre un document médical (optionnel)</div>
          <label style="cursor:pointer; display:inline-flex; align-items:center; gap:6px; background:#f1f5f9; border:1px solid #e2e8f0; border-radius:6px; padding:8px 14px; font-size:13px">
            <mat-icon style="font-size:18px;color:#64748b">attach_file</mat-icon>
            {{ uploadedFile ? uploadedFile.name : 'Sélectionner un fichier (PDF, JPG, PNG, DICOM)' }}
            <input type="file" hidden (change)="onFileSelected($event)" accept=".pdf,.jpg,.jpeg,.png,.dcm">
          </label>
        </div>

        <div *ngIf="error" style="color:#c62828; margin-top:8px; font-size:13px">{{ error }}</div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Annuler</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="loading || form.invalid">
        {{ loading ? 'Enregistrement…' : 'Valider la consultation' }}
      </button>
    </mat-dialog-actions>
  `
})
export class ConsultationFormComponent implements OnInit {
  form: FormGroup;
  loading = false;
  loadingRecord = false;
  error = '';
  record: MedicalRecord | null = null;
  uploadedFile: File | null = null;
  uploadsUrl = environment.uploadsUrl;

  get prescriptions(): FormArray { return this.form.get('prescriptions') as FormArray; }

  get patientName(): string {
    const p = this.apt.patient as any;
    return p?.firstName ? `${p.firstName} ${p.lastName}` : 'Patient';
  }

  get patientId(): string {
    const p = this.apt.patient as any;
    return typeof p === 'string' ? p : p?._id;
  }

  constructor(
    private fb: FormBuilder,
    private recordSvc: RecordService,
    private dialogRef: MatDialogRef<ConsultationFormComponent>,
    @Inject(MAT_DIALOG_DATA) public apt: Appointment
  ) {
    this.form = this.fb.group({ report: ['', Validators.required], prescriptions: this.fb.array([]) });
  }

  ngOnInit(): void {
    if (this.patientId) {
      this.loadingRecord = true;
      this.recordSvc.getPatientRecord(this.patientId).subscribe({
        next: res => { this.record = res.record; this.loadingRecord = false; },
        error: () => { this.loadingRecord = false; }
      });
    }
  }

  openDoc(fileUrl: string): void {
    window.open(`${this.uploadsUrl}/${fileUrl}`, '_blank', 'noopener');
  }

  addRx(): void {
    this.prescriptions.push(this.fb.group({ medication: ['', Validators.required], dosage: [''], duration: [''] }));
  }

  removeRx(i: number): void { this.prescriptions.removeAt(i); }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.uploadedFile = file;
  }

  save(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';

    this.recordSvc.addConsultation({ patientId: this.patientId, appointmentId: this.apt._id, ...this.form.value }).subscribe({
      next: () => {
        if (this.uploadedFile) {
          this.recordSvc.uploadDocumentForPatient(this.patientId, this.uploadedFile).subscribe({
            next: () => { this.loading = false; this.dialogRef.close(true); },
            error: () => { this.loading = false; this.dialogRef.close(true); }
          });
        } else {
          this.loading = false;
          this.dialogRef.close(true);
        }
      },
      error: err => { this.loading = false; this.error = err.error?.message || 'Erreur.'; }
    });
  }
}
