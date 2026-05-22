import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="auth-layout">
      <div class="auth-brand">
        <div class="brand-inner">
          <div class="brand-logo"><mat-icon>local_hospital</mat-icon></div>
          <h1>Bienvenue sur MediSync</h1>
          <p class="brand-tagline">La plateforme tout-en-un pour gérer vos consultations, dossiers médicaux et facturation — en toute sécurité.</p>
          <div class="brand-features">
            <div class="feature-item"><mat-icon>event_available</mat-icon> Prise de rendez-vous en temps réel</div>
            <div class="feature-item"><mat-icon>folder_shared</mat-icon> Dossiers médicaux centralisés</div>
            <div class="feature-item"><mat-icon>verified_user</mat-icon> Authentification à deux facteurs</div>
            <div class="feature-item"><mat-icon>schedule</mat-icon> Accès 24h/24, 7j/7</div>
          </div>
        </div>
      </div>

      <div class="auth-form-panel">
        <div class="auth-card">
          <h2 class="auth-title">Connexion</h2>
          <p class="auth-subtitle">Accédez à votre espace MediSync</p>

          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <mat-form-field class="full-width" appearance="outline">
              <mat-label>Email ou N° Sécurité Sociale</mat-label>
              <mat-icon matPrefix style="margin-right:6px;color:var(--text-faint)">person</mat-icon>
              <input matInput formControlName="identifier" autocomplete="username">
            </mat-form-field>

            <mat-form-field class="full-width" appearance="outline">
              <mat-label>Mot de passe</mat-label>
              <mat-icon matPrefix style="margin-right:6px;color:var(--text-faint)">lock</mat-icon>
              <input matInput [type]="showPwd ? 'text' : 'password'" formControlName="password" autocomplete="current-password">
              <button mat-icon-button matSuffix type="button" (click)="showPwd = !showPwd">
                <mat-icon style="font-size:18px;color:var(--text-muted)">{{ showPwd ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>

            <div *ngIf="error" class="msg-error">
              <mat-icon>error_outline</mat-icon> {{ error }}
            </div>

            <button mat-raised-button color="primary" class="auth-submit" type="submit" [disabled]="loading">
              <mat-spinner *ngIf="loading" diameter="18" style="display:inline-block;margin-right:8px"></mat-spinner>
              {{ loading ? 'Connexion…' : 'Se connecter' }}
            </button>
          </form>

          <div class="auth-link">
            Pas encore de compte ? <a routerLink="/register">Créer un compte patient</a>
          </div>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  form: FormGroup;
  loading = false;
  error = '';
  showPwd = false;

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    this.form = this.fb.group({
      identifier: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    const { identifier, password } = this.form.value;

    this.auth.login(identifier, password).subscribe({
      next: res => {
        this.loading = false;
        if (res.requires2FA && res.tempToken) {
          this.router.navigate(['/2fa'], { state: { tempToken: res.tempToken } });
        } else {
          this.redirectByRole(res.account?.role);
        }
      },
      error: err => {
        this.loading = false;
        this.error = err.error?.message || 'Identifiants incorrects.';
      }
    });
  }

  private redirectByRole(role?: string): void {
    const map: Record<string, string> = {
      patient: '/patient', medecin: '/doctor',
      secretaire: '/secretary', administrateur: '/admin'
    };
    this.router.navigate([map[role ?? ''] ?? '/login']);
  }
}
