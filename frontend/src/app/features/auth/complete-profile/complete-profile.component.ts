/**
 * Composant CompleteProfileComponent — complément d'inscription pour patients OAuth Google.
 *
 * - Vue forcée par authGuard quand profileCompleted=false (numéro de sécurité sociale manquant après Google Sign-In).
 * - Soumet le formulaire à AuthService.completeProfile puis redirige vers /patient/dashboard.
 */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-complete-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatProgressSpinnerModule,
    MatDatepickerModule, MatNativeDateModule],
  template: `
    <div class="auth-layout">
      <div class="auth-brand">
        <div class="brand-inner">
          <div class="brand-logo"><mat-icon>person_add</mat-icon></div>
          <h1>Complétez votre profil</h1>
          <p class="brand-tagline">Quelques informations supplémentaires sont nécessaires avant d'accéder à votre espace patient.</p>
          <div class="brand-features">
            <div class="feature-item"><mat-icon>badge</mat-icon> Votre N° de sécurité sociale (CIN)</div>
            <div class="feature-item"><mat-icon>person</mat-icon> Vos noms officiels</div>
            <div class="feature-item"><mat-icon>cake</mat-icon> Votre date de naissance</div>
            <div class="feature-item"><mat-icon>phone</mat-icon> Un numéro de téléphone (optionnel)</div>
            <div class="feature-item"><mat-icon>lock</mat-icon> Données chiffrées et confidentielles</div>
          </div>
        </div>
      </div>

      <div class="auth-form-panel">
        <div class="auth-card">
          <h2 class="auth-title">Informations complémentaires</h2>
          <p class="auth-subtitle">Veuillez compléter votre profil patient pour continuer</p>

          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 12px">
              <mat-form-field class="full-width" appearance="outline">
                <mat-label>Prénom</mat-label>
                <input matInput formControlName="firstName">
              </mat-form-field>
              <mat-form-field class="full-width" appearance="outline">
                <mat-label>Nom</mat-label>
                <input matInput formControlName="lastName">
              </mat-form-field>
            </div>

            <mat-form-field class="full-width" appearance="outline">
              <mat-label>Date de naissance</mat-label>
              <mat-icon matPrefix style="margin-right:6px;color:var(--text-faint)">cake</mat-icon>
              <input matInput [matDatepicker]="dobPicker" formControlName="dateOfBirth" [max]="today" placeholder="JJ/MM/AAAA">
              <mat-datepicker-toggle matIconSuffix [for]="dobPicker"></mat-datepicker-toggle>
              <mat-datepicker #dobPicker startView="multi-year"></mat-datepicker>
              <mat-error *ngIf="form.get('dateOfBirth')?.hasError('required')">Obligatoire</mat-error>
            </mat-form-field>

            <mat-form-field class="full-width" appearance="outline">
              <mat-label>N° de sécurité sociale (CIN)</mat-label>
              <mat-icon matPrefix style="margin-right:6px;color:var(--text-faint)">badge</mat-icon>
              <input matInput formControlName="socialSecurityNumber" autocomplete="off">
              <mat-hint>Obligatoire pour les patients</mat-hint>
            </mat-form-field>

            <mat-form-field class="full-width" appearance="outline">
              <mat-label>Téléphone (optionnel)</mat-label>
              <mat-icon matPrefix style="margin-right:6px;color:var(--text-faint)">phone</mat-icon>
              <input matInput formControlName="phoneNumber" autocomplete="tel">
            </mat-form-field>

            <div *ngIf="error" class="msg-error">
              <mat-icon>error_outline</mat-icon> {{ error }}
            </div>

            <button mat-raised-button color="primary" class="auth-submit" type="submit" [disabled]="loading || form.invalid">
              <mat-spinner *ngIf="loading" diameter="18" style="display:inline-block;margin-right:8px"></mat-spinner>
              {{ loading ? 'Enregistrement…' : 'Continuer' }}
            </button>
          </form>

          <div class="auth-link">
            <a (click)="onLogout()" style="cursor:pointer">Se déconnecter</a>
          </div>
        </div>
      </div>
    </div>
  `
})
export class CompleteProfileComponent implements OnInit {
  form: FormGroup;
  loading = false;
  error = '';
  today = new Date();

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      dateOfBirth: ['', Validators.required],
      socialSecurityNumber: ['', [Validators.required, Validators.minLength(6)]],
      phoneNumber: ['']
    });
  }

  ngOnInit(): void {
    this.auth.getMe().subscribe({
      next: res => {
        const p = res?.profile;
        if (p) {
          this.form.patchValue({
            firstName: p.firstName || '',
            lastName: p.lastName || '',
            dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth) : '',
            phoneNumber: p.phoneNumber || ''
          });
        }
      },
      error: () => {}
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    const value = { ...this.form.value };
    if (value.dateOfBirth) {
      value.dateOfBirth = new Date(value.dateOfBirth).toISOString();
    }
    this.auth.completeProfile(value).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/patient']);
      },
      error: err => {
        this.loading = false;
        this.error = err.error?.details || err.error?.message || 'Erreur lors de la complétion du profil.';
      }
    });
  }

  onLogout(): void {
    this.auth.logout();
  }
}
