/**
 * Composant TwoFactorComponent — saisie du code TOTP après connexion.
 *
 * - Affiché uniquement quand AuthService.login retourne un tempToken (2FA activée).
 * - Délègue à AuthService.verify2FA(tempToken, code) ; en succès, persiste la session définitive et redirige.
 */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-two-factor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  template: `
    <div class="auth-layout">
      <div class="auth-brand">
        <div class="brand-inner">
          <div class="brand-logo"><mat-icon>shield</mat-icon></div>
          <h1>Vérification sécurisée</h1>
          <p class="brand-tagline">Votre compte est protégé par l'authentification à deux facteurs. Entrez le code généré par votre application.</p>
          <div class="brand-features">
            <div class="feature-item"><mat-icon>verified_user</mat-icon> Sécurité renforcée pour l'administration</div>
            <div class="feature-item"><mat-icon>phonelink_lock</mat-icon> Codes temporaires à 6 chiffres</div>
            <div class="feature-item"><mat-icon>timer</mat-icon> Renouvelés toutes les 30 secondes</div>
          </div>
        </div>
      </div>

      <div class="auth-form-panel">
        <div class="auth-card">
          <h2 class="auth-title">Code de vérification</h2>
          <p class="auth-subtitle">Saisissez le code à 6 chiffres de Google Authenticator, Authy ou équivalent.</p>

          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <mat-form-field class="full-width" appearance="outline">
              <mat-label>Code TOTP</mat-label>
              <mat-icon matPrefix style="margin-right:6px;color:var(--text-faint)">pin</mat-icon>
              <input matInput formControlName="code" maxlength="6" autocomplete="one-time-code"
                style="letter-spacing:8px;font-size:18px;font-weight:600;text-align:center">
            </mat-form-field>

            <div *ngIf="error" class="msg-error">
              <mat-icon>error_outline</mat-icon> {{ error }}
            </div>

            <button mat-raised-button color="primary" class="auth-submit" type="submit" [disabled]="loading">
              {{ loading ? 'Vérification…' : 'Valider' }}
            </button>
          </form>

          <div class="auth-link" style="margin-top:24px">
            <a (click)="cancel()" style="cursor:pointer">← Retour à la connexion</a>
          </div>
        </div>
      </div>
    </div>
  `
})
export class TwoFactorComponent implements OnInit {
  form: FormGroup;
  loading = false;
  error = '';
  tempToken = '';

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    this.form = this.fb.group({ code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]] });
  }

  ngOnInit(): void {
    const nav = this.router.getCurrentNavigation();
    this.tempToken = (nav?.extras?.state as any)?.tempToken ?? history.state?.tempToken ?? '';
    if (!this.tempToken) this.router.navigate(['/login']);
  }

  cancel(): void { this.router.navigate(['/login']); }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    this.auth.verify2FA(this.tempToken, this.form.value.code).subscribe({
      next: () => { this.loading = false; this.router.navigate(['/admin']); },
      error: err => { this.loading = false; this.error = err.error?.message || 'Code invalide.'; }
    });
  }
}
