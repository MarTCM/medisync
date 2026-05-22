import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule,
    MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  template: `
    <div class="auth-layout">
      <div class="auth-brand">
        <div class="brand-inner">
          <div class="brand-logo"><mat-icon>local_hospital</mat-icon></div>
          <h1>Rejoignez MediSync</h1>
          <p class="brand-tagline">Créez votre compte gratuit en moins d'une minute et accédez à des soins de qualité.</p>
          <div class="brand-features">
            <div class="feature-item"><mat-icon>bolt</mat-icon> Inscription rapide et gratuite</div>
            <div class="feature-item"><mat-icon>folder_shared</mat-icon> Dossier médical personnel</div>
            <div class="feature-item"><mat-icon>history</mat-icon> Historique des consultations</div>
            <div class="feature-item"><mat-icon>receipt_long</mat-icon> Factures en ligne</div>
          </div>
        </div>
      </div>

      <div class="auth-form-panel">
        <div class="auth-card">
          <h2 class="auth-title">Créer un compte</h2>
          <p class="auth-subtitle">Inscrivez-vous en tant que patient</p>

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
              <mat-label>Email</mat-label>
              <mat-icon matPrefix style="margin-right:6px;color:var(--text-faint)">email</mat-icon>
              <input matInput type="email" formControlName="email" autocomplete="email">
            </mat-form-field>

            <mat-form-field class="full-width" appearance="outline">
              <mat-label>Mot de passe</mat-label>
              <mat-icon matPrefix style="margin-right:6px;color:var(--text-faint)">lock</mat-icon>
              <input matInput [type]="showPwd ? 'text' : 'password'" formControlName="password" autocomplete="new-password">
              <button mat-icon-button matSuffix type="button" (click)="showPwd = !showPwd">
                <mat-icon style="font-size:18px;color:var(--text-muted)">{{ showPwd ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <mat-hint>8 car. min · 1 maj · 1 chiffre · 1 symbole</mat-hint>
            </mat-form-field>

            <div *ngIf="error" class="msg-error" style="margin-top:8px">
              <mat-icon>error_outline</mat-icon> {{ error }}
            </div>

            <button mat-raised-button color="primary" class="auth-submit" type="submit" [disabled]="loading">
              {{ loading ? 'Création…' : 'Créer mon compte' }}
            </button>
          </form>

          <div class="auth-link">
            Déjà un compte ? <a routerLink="/login">Se connecter</a>
          </div>
        </div>
      </div>
    </div>
  `
})
export class RegisterComponent {
  form: FormGroup;
  loading = false;
  error = '';
  showPwd = false;

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    this.form = this.fb.group({
      firstName: ['', Validators.required],
      lastName:  ['', Validators.required],
      email:     ['', [Validators.required, Validators.email]],
      password:  ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    this.auth.register({ ...this.form.value, role: 'patient' }).subscribe({
      next: () => { this.loading = false; this.router.navigate(['/patient']); },
      error: err => { this.loading = false; this.error = err.error?.details || err.error?.message || 'Erreur lors de la création du compte.'; }
    });
  }
}
