/**
 * Composant LoginComponent — page de connexion.
 *
 * - Formulaire email/mot de passe + bouton Google Sign-In (GoogleAuthService).
 * - Appelle AuthService.login puis redirige vers le portail correspondant au rôle.
 * - Gère le flow 2FA : si la réponse contient un tempToken, redirige vers /2fa.
 */
import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';
import { GoogleAuthService } from '../../../core/services/google-auth.service';

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
              <mat-label>Email ou N° Sécurité Sociale (CIN)</mat-label>
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

          <div class="auth-divider"><span>ou</span></div>

          <div #googleBtn class="google-btn-container"></div>

          <div class="auth-link">
            Pas encore de compte ? <a routerLink="/register">Créer un compte patient</a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-divider {
      display: flex; align-items: center; gap: 12px;
      color: var(--text-faint); font-size: 12px; margin: 18px 0 12px;
    }
    .auth-divider::before, .auth-divider::after {
      content: ''; flex: 1; height: 1px; background: var(--border, #e2e8f0);
    }
    .google-btn-container {
      display: flex; justify-content: center; min-height: 44px; margin-bottom: 8px;
    }
  `]
})
export class LoginComponent implements AfterViewInit {
  @ViewChild('googleBtn') googleBtn?: ElementRef<HTMLDivElement>;

  form: FormGroup;
  loading = false;
  error = '';
  showPwd = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private googleAuth: GoogleAuthService
  ) {
    this.form = this.fb.group({
      identifier: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  ngAfterViewInit(): void {
    if (this.googleBtn) {
      this.googleAuth.renderButton(this.googleBtn.nativeElement, idToken => this.onGoogleCredential(idToken), 'signin_with');
    }
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
        } else if (res.account && res.account.profileCompleted === false) {
          this.router.navigate(['/complete-profile']);
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

  private onGoogleCredential(idToken: string): void {
    this.loading = true;
    this.error = '';
    this.auth.googleLogin(idToken).subscribe({
      next: res => {
        this.loading = false;
        if (res.account && res.account.profileCompleted === false) {
          this.router.navigate(['/complete-profile']);
        } else {
          this.redirectByRole(res.account?.role);
        }
      },
      error: err => {
        this.loading = false;
        this.error = err.error?.message || 'Échec de la connexion Google.';
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
