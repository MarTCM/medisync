import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-two-factor-setup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule],
  template: `
    <div class="page-container" style="max-width:560px">
      <div class="page-header">
        <div>
          <h2>Sécurité 2FA</h2>
          <div class="page-subtitle">Authentification à deux facteurs · Google Authenticator, Authy…</div>
        </div>
      </div>

      <!-- Initial -->
      <div class="card" *ngIf="!qrCode && !verifyOk">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
          <div style="width:48px;height:48px;border-radius:12px;background:var(--primary-light);color:var(--primary-dark);display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <mat-icon>shield</mat-icon>
          </div>
          <div>
            <h3 style="font-size:16px;font-weight:700;color:var(--text)">Activer la double authentification</h3>
            <p style="font-size:13.5px;color:var(--text-muted);margin-top:4px">
              Renforce la sécurité de votre compte administrateur.
            </p>
          </div>
        </div>

        <div class="msg-info" style="margin-bottom:20px">
          <mat-icon>info</mat-icon>
          Vous aurez besoin d'une application d'authentification (Google Authenticator, Authy, 1Password…).
        </div>

        <button mat-raised-button color="primary" (click)="setup()"
          [disabled]="setting" style="width:100%;height:46px">
          <mat-icon>qr_code_2</mat-icon>
          {{ setting ? 'Génération…' : 'Générer le QR code' }}
        </button>
        <div *ngIf="error" class="msg-error" style="margin-top:12px">
          <mat-icon>error_outline</mat-icon> {{ error }}
        </div>
      </div>

      <!-- QR + verify -->
      <div class="card" *ngIf="qrCode">
        <div class="card-header">
          <h3>Scannez le QR code</h3>
          <div class="card-subtitle">Étape 1/2 · Configurez votre application</div>
        </div>

        <div class="qr-frame">
          <img [src]="qrCode" alt="QR Code 2FA">
        </div>

        <p style="text-align:center;font-size:13.5px;color:var(--text-muted);margin-bottom:20px">
          Une fois scanné, entrez le code à 6 chiffres généré pour confirmer.
        </p>

        <form [formGroup]="verifyForm" (ngSubmit)="verify()">
          <mat-form-field appearance="outline" style="width:100%;margin-bottom:8px">
            <mat-label>Code TOTP (6 chiffres)</mat-label>
            <mat-icon matPrefix style="color:var(--text-faint);margin-right:6px">pin</mat-icon>
            <input matInput formControlName="token" maxlength="6"
              style="letter-spacing:6px;font-size:17px;font-weight:600;text-align:center">
          </mat-form-field>
          <div *ngIf="verifyError" class="msg-error">
            <mat-icon>error_outline</mat-icon> {{ verifyError }}
          </div>
          <button mat-raised-button color="primary" type="submit"
            [disabled]="verifyForm.invalid || verifying" style="width:100%;height:46px;margin-top:8px">
            {{ verifying ? 'Vérification…' : 'Confirmer l\\'activation' }}
          </button>
        </form>
      </div>

      <!-- Success + disable -->
      <div class="card" *ngIf="verifyOk">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
          <div style="width:48px;height:48px;border-radius:12px;background:#DCFCE7;color:#16A34A;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <mat-icon>verified</mat-icon>
          </div>
          <div>
            <h3 style="font-size:16px;font-weight:700;color:var(--text)">2FA activée</h3>
            <p style="font-size:13.5px;color:var(--text-muted);margin-top:4px">
              Vous serez invité à entrer un code à la prochaine connexion.
            </p>
          </div>
        </div>

        <div style="border-top:1px solid var(--border);padding-top:20px;margin-top:8px">
          <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:12px">Désactiver la 2FA</div>
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:14px">
            Cette action désactivera la double authentification. Entrez votre code actuel pour confirmer.
          </p>
          <form [formGroup]="disableForm" (ngSubmit)="disable()">
            <mat-form-field appearance="outline" style="width:100%;margin-bottom:8px">
              <mat-label>Code TOTP actuel</mat-label>
              <input matInput formControlName="token" maxlength="6">
            </mat-form-field>
            <div *ngIf="disableError" class="msg-error">
              <mat-icon>error_outline</mat-icon> {{ disableError }}
            </div>
            <button mat-stroked-button color="warn" type="submit"
              [disabled]="disableForm.invalid || disabling" style="width:100%">
              {{ disabling ? 'Désactivation…' : 'Désactiver la 2FA' }}
            </button>
          </form>
        </div>
      </div>
    </div>
  `
})
export class TwoFactorSetupComponent {
  qrCode: string | null = null;
  setting = false;
  error = '';
  verifyForm: FormGroup;
  verifying = false;
  verifyError = '';
  verifyOk = false;
  disableForm: FormGroup;
  disabling = false;
  disableError = '';

  constructor(private fb: FormBuilder, private authSvc: AuthService) {
    this.verifyForm = this.fb.group({ token: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]] });
    this.disableForm = this.fb.group({ token: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]] });
  }

  setup(): void {
    this.setting = true;
    this.error = '';
    this.authSvc.setup2FA().subscribe({
      next: res => { this.qrCode = res.qrCode; this.setting = false; },
      error: err => { this.setting = false; this.error = err.error?.message || 'Erreur.'; }
    });
  }

  verify(): void {
    if (this.verifyForm.invalid) return;
    this.verifying = true;
    this.verifyError = '';
    this.authSvc.confirmSetup2FA(this.verifyForm.value.token).subscribe({
      next: () => { this.verifying = false; this.verifyOk = true; this.qrCode = null; },
      error: err => {
        this.verifying = false;
        this.verifyError = err?.error?.message || 'Code invalide.';
      }
    });
  }

  disable(): void {
    if (this.disableForm.invalid) return;
    this.disabling = true;
    this.disableError = '';
    this.authSvc.disable2FA(this.disableForm.value.token).subscribe({
      next: () => { this.disabling = false; this.qrCode = null; this.verifyOk = false; this.disableForm.reset(); },
      error: err => { this.disabling = false; this.disableError = err.error?.message || 'Erreur.'; }
    });
  }
}
