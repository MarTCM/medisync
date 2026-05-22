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
            <mat-label>Tarif de base (DH)</mat-label>
            <input matInput type="number" formControlName="baseFee" min="0">
          </mat-form-field>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px">
          <button mat-stroked-button type="button" (click)="load()" [disabled]="saving">Annuler</button>
          <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || saving">
            <mat-icon>save</mat-icon> {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
          </button>
        </div>
      </form>
    </div>
  `
})
export class DoctorProfileComponent implements OnInit {
  form: FormGroup;
  loading = true;
  saving = false;

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
        this.loading = false;
      },
      error: () => { this.loading = false; }
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
