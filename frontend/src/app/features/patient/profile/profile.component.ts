import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { AuthService } from '../../../core/services/auth.service';
import { TokenStorage } from '../../../core/utils/token-storage';

@Component({
  selector: 'app-patient-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatSnackBarModule,
    MatDatepickerModule, MatNativeDateModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2>Mon profil</h2>
          <div class="page-subtitle">Vos informations personnelles</div>
        </div>
      </div>

      <div *ngIf="loading" style="text-align:center;padding:48px;color:var(--text-muted)">Chargement…</div>

      <form *ngIf="!loading" [formGroup]="form" (ngSubmit)="save()" class="card" style="padding:24px;max-width:640px">

        <!-- Read-only email -->
        <div *ngIf="email" style="margin-bottom:24px;padding:14px 16px;background:var(--surface-2);border-radius:var(--radius);border:1px solid var(--border);display:flex;align-items:center;gap:8px;font-size:14px;color:var(--text-secondary)">
          <mat-icon style="font-size:16px;width:16px;height:16px;color:var(--text-muted)">email</mat-icon>
          {{ email }}
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <mat-form-field appearance="outline">
            <mat-label>Prénom</mat-label>
            <input matInput formControlName="firstName">
            <mat-error *ngIf="form.get('firstName')?.hasError('required')">Obligatoire</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Nom</mat-label>
            <input matInput formControlName="lastName">
            <mat-error *ngIf="form.get('lastName')?.hasError('required')">Obligatoire</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" style="grid-column:1/-1">
            <mat-label>Date de naissance</mat-label>
            <mat-icon matPrefix style="margin-right:6px;color:var(--text-faint)">cake</mat-icon>
            <input matInput [matDatepicker]="dobPicker" formControlName="dateOfBirth" [max]="today" placeholder="JJ/MM/AAAA">
            <mat-datepicker-toggle matIconSuffix [for]="dobPicker"></mat-datepicker-toggle>
            <mat-datepicker #dobPicker startView="multi-year"></mat-datepicker>
          </mat-form-field>

          <mat-form-field appearance="outline" style="grid-column:1/-1">
            <mat-label>N° de sécurité sociale (CIN)</mat-label>
            <mat-icon matPrefix style="margin-right:6px;color:var(--text-faint)">badge</mat-icon>
            <input matInput formControlName="socialSecurityNumber" autocomplete="off">
            <mat-hint>Utilisable comme identifiant de connexion</mat-hint>
            <mat-error *ngIf="form.get('socialSecurityNumber')?.hasError('required')">Obligatoire</mat-error>
            <mat-error *ngIf="form.get('socialSecurityNumber')?.hasError('minlength')">6 caractères minimum</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline" style="grid-column:1/-1">
            <mat-label>Téléphone (optionnel)</mat-label>
            <mat-icon matPrefix style="margin-right:6px;color:var(--text-faint)">phone</mat-icon>
            <input matInput formControlName="phoneNumber" autocomplete="tel">
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
export class PatientProfileComponent implements OnInit {
  form: FormGroup;
  loading = true;
  saving = false;
  email = '';
  today = new Date();

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private snack: MatSnackBar
  ) {
    this.form = this.fb.group({
      firstName:            ['', Validators.required],
      lastName:             ['', Validators.required],
      dateOfBirth:          [''],
      socialSecurityNumber: ['', [Validators.required, Validators.minLength(6)]],
      phoneNumber:          ['']
    });
  }

  ngOnInit(): void {
    this.email = this.auth.currentUser?.email || '';
    this.load();
  }

  load(): void {
    this.loading = true;
    this.auth.getMe().subscribe({
      next: res => {
        const p = res?.profile;
        const user = this.auth.currentUser;
        if (p) {
          this.form.patchValue({
            firstName:            p.firstName   || '',
            lastName:             p.lastName    || '',
            dateOfBirth:          p.dateOfBirth ? new Date(p.dateOfBirth) : '',
            phoneNumber:          p.phoneNumber || '',
            socialSecurityNumber: user?.socialSecurityNumber || ''
          });
        }
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving = true;
    const value = { ...this.form.value };
    if (value.dateOfBirth) {
      value.dateOfBirth = new Date(value.dateOfBirth).toISOString();
    }
    this.auth.updatePatientProfile(value).subscribe({
      next: () => {
        this.saving = false;
        const user = this.auth.currentUser;
        if (user) {
          const updated = { ...user, socialSecurityNumber: this.form.value.socialSecurityNumber };
          TokenStorage.saveUser(updated);
        }
        this.snack.open('Profil mis à jour.', 'OK', { duration: 3000 });
      },
      error: err => {
        this.saving = false;
        this.snack.open(err.error?.message || 'Erreur lors de la mise à jour.', 'OK', { duration: 4000 });
      }
    });
  }
}
