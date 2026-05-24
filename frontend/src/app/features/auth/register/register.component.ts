/**
 * Composant RegisterComponent — inscription d'un nouveau patient.
 *
 * - Formulaire de création de compte (email, mot de passe fort, numéro de sécurité sociale, état civil).
 * - Bouton Google Sign-Up alternatif (les patients OAuth devront compléter leur profil après).
 * - Délègue à AuthService.register puis redirige vers /patient/dashboard en cas de succès.
 */
import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';
import { GoogleAuthService } from '../../../core/services/google-auth.service';

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
              <mat-label>N° de sécurité sociale (CIN)</mat-label>
              <mat-icon matPrefix style="margin-right:6px;color:var(--text-faint)">badge</mat-icon>
              <input matInput formControlName="socialSecurityNumber" autocomplete="off">
              <mat-hint>Utilisable comme identifiant de connexion</mat-hint>
            </mat-form-field>

            <mat-form-field class="full-width" appearance="outline">
              <mat-label>Téléphone (optionnel)</mat-label>
              <mat-icon matPrefix style="margin-right:6px;color:var(--text-faint)">phone</mat-icon>
              <input matInput formControlName="phoneNumber" autocomplete="tel">
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

          <div class="auth-divider"><span>ou inscrivez-vous avec</span></div>

          <div #googleBtn class="google-btn-container"></div>

          <div class="auth-link">
            Déjà un compte ? <a routerLink="/login">Se connecter</a>
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
export class RegisterComponent implements AfterViewInit {
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
      firstName: ['', Validators.required],
      lastName:  ['', Validators.required],
      email:     ['', [Validators.required, Validators.email]],
      socialSecurityNumber: ['', [Validators.required, Validators.minLength(6)]],
      phoneNumber: [''],
      password:  ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  ngAfterViewInit(): void {
    if (this.googleBtn) {
      this.googleAuth.renderButton(this.googleBtn.nativeElement, idToken => this.onGoogleCredential(idToken), 'signup_with');
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    this.auth.register({ ...this.form.value, role: 'patient' }).subscribe({
      next: res => {
        this.loading = false;
        if (res.account && res.account.profileCompleted === false) {
          this.router.navigate(['/complete-profile']);
        } else {
          this.router.navigate(['/patient']);
        }
      },
      error: err => { this.loading = false; this.error = err.error?.details || err.error?.message || 'Erreur lors de la création du compte.'; }
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
          this.router.navigate(['/patient']);
        }
      },
      error: err => {
        this.loading = false;
        this.error = err.error?.message || 'Échec de la connexion Google.';
      }
    });
  }
}
