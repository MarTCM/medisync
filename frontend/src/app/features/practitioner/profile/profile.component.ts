import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DoctorService } from '../../../core/services/doctor.service';
import { DoctorFee } from '../../../core/models';

@Component({
  selector: 'app-doctor-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule, MatSnackBarModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2>Mon profil</h2>
          <div class="page-subtitle">Informations affichées dans la recherche des patients</div>
        </div>
      </div>

      <div *ngIf="loading" style="text-align:center;padding:48px;color:var(--text-muted)">Chargement…</div>

      <!-- Main profile form -->
      <form *ngIf="!loading" [formGroup]="form" (ngSubmit)="save()" class="card" style="padding:24px;max-width:780px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <mat-form-field appearance="outline">
            <mat-label>Prénom</mat-label>
            <input matInput formControlName="firstName">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Nom</mat-label>
            <input matInput formControlName="lastName">
          </mat-form-field>
          <mat-form-field appearance="outline" style="grid-column:1/-1">
            <mat-label>Spécialités (séparées par virgule)</mat-label>
            <input matInput formControlName="specialties" placeholder="Cardiologie, Médecine générale">
          </mat-form-field>
          <mat-form-field appearance="outline" style="grid-column:1/-1">
            <mat-label>Langues (séparées par virgule)</mat-label>
            <input matInput formControlName="languages" placeholder="Français, Arabe, Anglais">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Localisation</mat-label>
            <input matInput formControlName="location" placeholder="ex: Casablanca">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Secteur</mat-label>
            <mat-select formControlName="sector">
              <mat-option [value]="1">Secteur 1</mat-option>
              <mat-option [value]="2">Secteur 2</mat-option>
              <mat-option [value]="3">Secteur 3</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Tarif de base consultation (DH)</mat-label>
            <input matInput type="number" formControlName="baseFee" min="0">
            <mat-hint>Affiché aux patients lors de la prise de RDV</mat-hint>
          </mat-form-field>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:28px">
          <button mat-stroked-button type="button" (click)="load()" [disabled]="saving">Annuler</button>
          <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || saving">
            <mat-icon>save</mat-icon> {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
          </button>
        </div>
      </form>

      <!-- Fees catalog -->
      <div *ngIf="!loading" class="card" style="padding:24px;max-width:780px;margin-top:20px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <mat-icon style="color:var(--primary)">price_change</mat-icon>
          <h3 style="margin:0;font-size:15px;font-weight:600">Tarifs par acte</h3>
        </div>
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:16px">
          Ces tarifs seront proposés lors de la facturation pour pré-remplir le montant automatiquement.
        </div>

        <!-- Existing fees -->
        <div *ngIf="fees.length === 0" style="font-size:13px;color:var(--text-muted);padding:12px 0;border-top:1px solid var(--border);border-bottom:1px solid var(--border);margin-bottom:16px">
          Aucun tarif défini. Ajoutez des actes ci-dessous.
        </div>
        <div *ngIf="fees.length > 0" style="margin-bottom:16px;border-top:1px solid var(--border)">
          <div *ngFor="let fee of fees; let i = index"
            style="display:grid;grid-template-columns:90px 1fr 100px 40px;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
            <span style="font-size:13px;font-weight:700;color:var(--primary);font-family:monospace">{{ fee.code }}</span>
            <span style="font-size:13px;color:var(--text)">{{ fee.label }}</span>
            <span style="font-size:13px;font-weight:600;text-align:right">{{ fee.price }} DH</span>
            <button mat-icon-button type="button" (click)="removeFee(i)"
              style="color:var(--error,#dc2626);width:32px;height:32px;line-height:32px">
              <mat-icon style="font-size:18px;width:18px;height:18px">delete</mat-icon>
            </button>
          </div>
        </div>

        <!-- Add new fee form -->
        <div style="background:var(--surface-2,#f8fafc);border-radius:8px;padding:16px">
          <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">
            Ajouter un acte
          </div>
          <form [formGroup]="newFeeForm" (ngSubmit)="addFee()"
            style="display:grid;grid-template-columns:90px 1fr 110px auto;gap:10px;align-items:flex-start">
            <mat-form-field appearance="outline">
              <mat-label>Code</mat-label>
              <input matInput formControlName="code" placeholder="CS">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Libellé</mat-label>
              <input matInput formControlName="label" placeholder="Consultation générale">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Prix (DH)</mat-label>
              <input matInput type="number" formControlName="price" min="0">
            </mat-form-field>
            <button mat-stroked-button color="primary" type="submit"
              [disabled]="newFeeForm.invalid" style="height:56px;margin-top:0">
              <mat-icon>add</mat-icon>
            </button>
          </form>
        </div>

        <div style="display:flex;justify-content:flex-end;margin-top:16px">
          <button mat-raised-button color="primary" (click)="saveFees()" [disabled]="savingFees">
            <mat-icon>save</mat-icon> {{ savingFees ? 'Enregistrement…' : 'Enregistrer les tarifs' }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class DoctorProfileComponent implements OnInit {
  form: FormGroup;
  newFeeForm: FormGroup;
  loading = true;
  saving = false;
  savingFees = false;
  fees: DoctorFee[] = [];

  constructor(
    private fb: FormBuilder,
    private doctorSvc: DoctorService,
    private snack: MatSnackBar
  ) {
    this.form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      specialties: [''],
      languages: [''],
      location: [''],
      sector: [1],
      baseFee: [0, [Validators.required, Validators.min(0)]]
    });
    this.newFeeForm = this.fb.group({
      code:  ['', Validators.required],
      label: ['', Validators.required],
      price: [null, [Validators.required, Validators.min(0)]]
    });
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.doctorSvc.getMe().subscribe({
      next: res => {
        const d: any = res.doctor;
        this.form.patchValue({
          firstName: d.firstName || '',
          lastName: d.lastName || '',
          specialties: (d.specialties || []).join(', '),
          languages: (d.languages || []).join(', '),
          location: d.location || '',
          sector: d.sector || 1,
          baseFee: d.baseFee || 0
        });
        this.fees = (d.fees || []).map((f: any) => ({ _id: f._id, code: f.code, label: f.label, price: f.price }));
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  addFee(): void {
    if (this.newFeeForm.invalid) return;
    const { code, label, price } = this.newFeeForm.value;
    this.fees = [...this.fees, { code: code.trim().toUpperCase(), label: label.trim(), price: Number(price) }];
    this.newFeeForm.reset();
  }

  removeFee(i: number): void {
    this.fees = this.fees.filter((_, idx) => idx !== i);
  }

  saveFees(): void {
    this.savingFees = true;
    this.doctorSvc.updateMe({ fees: this.fees } as any).subscribe({
      next: res => {
        this.savingFees = false;
        this.fees = (res.doctor.fees || []) as DoctorFee[];
        this.snack.open('Tarifs mis à jour.', 'OK', { duration: 3000 });
      },
      error: err => {
        this.savingFees = false;
        this.snack.open(err.error?.message || 'Erreur lors de la mise à jour.', 'OK', { duration: 4000 });
      }
    });
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving = true;
    const v = this.form.value;
    const payload: any = {
      firstName: v.firstName,
      lastName: v.lastName,
      specialties: String(v.specialties || '').split(',').map((s: string) => s.trim()).filter(Boolean),
      languages: String(v.languages || '').split(',').map((s: string) => s.trim()).filter(Boolean),
      location: v.location || '',
      sector: Number(v.sector) || 1,
      baseFee: Number(v.baseFee) || 0
    };
    this.doctorSvc.updateMe(payload).subscribe({
      next: () => {
        this.saving = false;
        this.snack.open('Profil mis à jour.', 'OK', { duration: 3000 });
      },
      error: err => {
        this.saving = false;
        this.snack.open(err.error?.message || 'Erreur lors de la mise à jour.', 'OK', { duration: 4000 });
      }
    });
  }
}
