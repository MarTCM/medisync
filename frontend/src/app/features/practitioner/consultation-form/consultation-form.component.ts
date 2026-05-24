/**
 * Composant ConsultationFormComponent — dialogue de saisie d'une consultation (médecin).
 *
 * - Ouvert depuis le calendrier au clic sur un rendez-vous (MatDialog).
 * - Permet de rédiger le compte rendu et d'ajouter des prescriptions (médicament, posologie, durée).
 * - Soumission via RecordService.addConsultation ; bascule le RDV en statut 'terminé'.
 */
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
import { MatMenuModule } from '@angular/material/menu';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { RecordService } from '../../../core/services/record.service';
import { Appointment, MedicalRecord } from '../../../core/models';
import { environment } from '../../../../environments/environment';
import { MEDICATIONS, MedicationEntry } from '../../../core/data/medications';
import { CONSULTATION_TEMPLATES, getTemplateForSpecialty, listTemplates } from '../../../core/data/consultation-templates';

@Component({
  selector: 'app-consultation-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatChipsModule, MatIconModule, MatExpansionModule,
    MatMenuModule, MatAutocompleteModule],
  template: `
    <h2 mat-dialog-title>Consultation — {{ consultationName }}</h2>
    <mat-dialog-content style="min-width:560px; max-height:80vh">

      <!-- Third-party banner: show when appointment is for a dependent -->
      <div *ngIf="apt.dependentInfo" style="margin-bottom:16px;padding:14px 16px;background:#eff6ff;border:1.5px solid #3b82f6;border-radius:8px">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#2563eb;margin-bottom:10px;display:flex;align-items:center;gap:6px">
          <mat-icon style="font-size:16px;width:16px;height:16px">group</mat-icon>
          Consultation pour un tiers — compte titulaire : {{ patientName }}
        </div>
        <div style="display:grid;grid-template-columns:repeat(3, auto);gap:6px 20px;font-size:13.5px;margin-bottom:10px">
          <span><strong>Prénom :</strong> {{ apt.dependentInfo.firstName }}</span>
          <span><strong>Nom :</strong> {{ apt.dependentInfo.lastName }}</span>
          <span><strong>Relation :</strong> {{ apt.dependentInfo.relation }}</span>
          <span *ngIf="apt.dependentInfo.dateOfBirth">
            <strong>Âge :</strong> {{ dependentAge }} ans
            <span style="color:#6b7280;font-size:12px"> ({{ apt.dependentInfo.dateOfBirth | date:'dd/MM/yyyy' }})</span>
          </span>
        </div>
        <div *ngIf="apt.dependentInfo.allergies?.length" style="margin-bottom:6px">
          <strong style="font-size:13px">Allergies :</strong>
          <span *ngFor="let a of apt.dependentInfo.allergies"
            style="display:inline-block;margin:2px 4px;padding:1px 8px;background:#fee2e2;color:#b91c1c;border-radius:10px;font-size:12px;font-weight:600">
            {{ a }}
          </span>
        </div>
        <div *ngIf="apt.dependentInfo.notes" style="font-size:13px;color:#374151">
          <strong>Notes :</strong> {{ apt.dependentInfo.notes }}
        </div>
      </div>

      <!-- Patient medical context (account holder record) -->
      <mat-expansion-panel *ngIf="record" style="margin-bottom:16px">
        <mat-expansion-panel-header>
          <mat-panel-title style="font-weight:600">Dossier médical{{ apt.dependentInfo ? ' du titulaire du compte' : ' du patient' }}</mat-panel-title>
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
            <div style="color:#444; margin-top:4px; white-space:pre-wrap; word-break:break-word">
              <span style="font-weight:500">{{ record.consultations[record.consultations.length - 1].date | date:'d MMM y':'':'fr' }}</span>
              — {{ record.consultations[record.consultations.length - 1].report }}
            </div>
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
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span style="font-weight:600">Compte rendu médical</span>
          <button mat-stroked-button type="button" [matMenuTriggerFor]="tplMenu" style="font-size:12px;height:30px">
            <mat-icon style="font-size:16px;width:16px;height:16px">description</mat-icon>
            Modèle : {{ currentTemplateLabel }}
          </button>
          <mat-menu #tplMenu="matMenu">
            <button mat-menu-item *ngFor="let t of templates" (click)="applyTemplate(t.key)">
              {{ t.label }}
            </button>
          </mat-menu>
        </div>
        <mat-form-field style="width:100%; margin-bottom:12px">
          <mat-label>Observations, diagnostic, traitement…</mat-label>
          <textarea matInput formControlName="report" rows="8"></textarea>
        </mat-form-field>

        <div style="font-weight:600; margin-bottom:8px">Prescriptions</div>
        <div formArrayName="prescriptions">
          <div *ngFor="let p of prescriptions.controls; let i=index" [formGroupName]="i"
            style="display:flex; gap:8px; margin-bottom:8px; align-items:center">
            <mat-form-field style="flex:2">
              <mat-label>Médicament</mat-label>
              <input matInput formControlName="medication"
                [matAutocomplete]="medAuto"
                (input)="onMedInput(i, $any($event.target).value)">
              <mat-autocomplete #medAuto="matAutocomplete"
                (optionSelected)="onMedSelected(i, $event.option.value)">
                <mat-option *ngFor="let m of filteredMeds[i] || []" [value]="m.name">
                  <div style="display:flex;flex-direction:column;line-height:1.2">
                    <span style="font-weight:500">{{ m.name }}</span>
                    <span style="font-size:11px;color:#64748b">{{ m.commonDosage }}</span>
                  </div>
                </mat-option>
              </mat-autocomplete>
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
  templates = listTemplates();
  currentTemplateLabel = 'Médecine générale';
  filteredMeds: MedicationEntry[][] = [];

  get prescriptions(): FormArray { return this.form.get('prescriptions') as FormArray; }

  get patientName(): string {
    const p = this.apt.patient as any;
    return p?.firstName ? `${p.firstName} ${p.lastName}` : 'Patient';
  }

  get consultationName(): string {
    const dep = (this.apt as any).dependentInfo;
    if (dep) return `${dep.firstName} ${dep.lastName}`;
    return this.patientName;
  }

  get dependentAge(): number | null {
    const dob = (this.apt as any).dependentInfo?.dateOfBirth;
    if (!dob) return null;
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
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
    const doctor = this.apt.doctor as any;
    const specialty = doctor?.specialties?.[0];
    const tpl = getTemplateForSpecialty(specialty);
    this.currentTemplateLabel = tpl.label;
    this.form.patchValue({ report: tpl.body });

    if (this.patientId) {
      this.loadingRecord = true;
      this.recordSvc.getPatientRecord(this.patientId).subscribe({
        next: res => { this.record = res.record; this.loadingRecord = false; },
        error: () => { this.loadingRecord = false; }
      });
    }
  }

  applyTemplate(key: string): void {
    const tpl = CONSULTATION_TEMPLATES[key];
    if (!tpl) return;
    this.currentTemplateLabel = tpl.label;
    this.form.patchValue({ report: tpl.body });
  }

  openDoc(fileUrl: string): void {
    window.open(`${this.uploadsUrl}/${fileUrl}`, '_blank', 'noopener');
  }

  addRx(): void {
    this.prescriptions.push(this.fb.group({ medication: ['', Validators.required], dosage: [''], duration: [''] }));
    this.filteredMeds.push([]);
  }

  removeRx(i: number): void {
    this.prescriptions.removeAt(i);
    this.filteredMeds.splice(i, 1);
  }

  onMedInput(i: number, value: string): void {
    const q = (value || '').toLowerCase().trim();
    if (!q) { this.filteredMeds[i] = MEDICATIONS.slice(0, 8); return; }
    this.filteredMeds[i] = MEDICATIONS.filter(m => m.name.toLowerCase().includes(q)).slice(0, 12);
  }

  onMedSelected(i: number, name: string): void {
    const med = MEDICATIONS.find(m => m.name === name);
    if (med) {
      const group = this.prescriptions.at(i);
      if (group && !group.value.dosage) {
        group.patchValue({ dosage: med.commonDosage });
      }
    }
  }

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
