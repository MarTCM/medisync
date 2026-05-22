import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';
import { AdminService } from '../../../core/services/admin.service';

@Component({
  selector: 'app-secretary-patients',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2>Patients</h2>
          <div class="page-subtitle">Gérez les comptes patients de la clinique</div>
        </div>
        <button mat-raised-button color="primary" (click)="showForm = !showForm">
          <mat-icon>{{ showForm ? 'close' : 'person_add' }}</mat-icon>
          {{ showForm ? 'Fermer' : 'Nouveau patient' }}
        </button>
      </div>

      <div *ngIf="showForm" class="card" style="margin-bottom:20px">
        <div class="card-header">
          <h3>Créer un compte patient</h3>
          <div class="card-subtitle">Le patient pourra se connecter avec son mot de passe temporaire</div>
        </div>
        <form [formGroup]="form" (ngSubmit)="create()" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:12px">
          <mat-form-field appearance="outline" style="margin-bottom:-18px">
            <mat-label>Prénom</mat-label>
            <input matInput formControlName="firstName">
          </mat-form-field>
          <mat-form-field appearance="outline" style="margin-bottom:-18px">
            <mat-label>Nom</mat-label>
            <input matInput formControlName="lastName">
          </mat-form-field>
          <mat-form-field appearance="outline" style="margin-bottom:-18px">
            <mat-label>Email</mat-label>
            <input matInput formControlName="email" type="email">
          </mat-form-field>
          <mat-form-field appearance="outline" style="margin-bottom:-18px">
            <mat-label>N° Sécurité Sociale</mat-label>
            <input matInput formControlName="socialSecurityNumber">
          </mat-form-field>
          <mat-form-field appearance="outline" style="margin-bottom:-18px;grid-column:span 2">
            <mat-label>Mot de passe temporaire</mat-label>
            <mat-icon matPrefix style="color:var(--text-faint);margin-right:6px">lock</mat-icon>
            <input matInput formControlName="password" type="text" placeholder="8 car · 1 maj · 1 chiffre · 1 symbole">
          </mat-form-field>
          <button mat-raised-button color="primary" type="submit"
            [disabled]="form.invalid || saving"
            style="height:48px;grid-column:span 2;margin-top:8px">
            <mat-icon>add</mat-icon> {{ saving ? 'Création…' : 'Créer le compte' }}
          </button>
        </form>
        <div *ngIf="createError" class="msg-error" style="margin-top:12px">
          <mat-icon>error_outline</mat-icon> {{ createError }}
        </div>
        <div *ngIf="createSuccess" class="msg-success" style="margin-top:12px">
          <mat-icon>check_circle</mat-icon> {{ createSuccess }}
        </div>
      </div>

      <!-- Search -->
      <div class="filter-bar">
        <mat-form-field appearance="outline" style="width:100%;margin-bottom:-18px">
          <mat-label>Rechercher un patient</mat-label>
          <mat-icon matPrefix style="color:var(--text-faint);margin-right:6px">search</mat-icon>
          <input matInput [(ngModel)]="search" (input)="onSearch()" placeholder="Nom, prénom, email…">
        </mat-form-field>
      </div>

      <div *ngIf="loading" style="text-align:center;padding:48px;color:var(--text-muted)">Chargement…</div>

      <div *ngIf="!loading && filtered.length === 0" class="empty-state">
        <mat-icon>people_outline</mat-icon>
        <div class="empty-title">Aucun patient trouvé</div>
        <p *ngIf="search">Modifiez votre recherche</p>
        <p *ngIf="!search">Créez le premier compte patient</p>
      </div>

      <div class="data-table" *ngIf="!loading && filtered.length > 0">
        <table>
          <thead>
            <tr>
              <th>Patient</th>
              <th>Email</th>
              <th>Téléphone</th>
              <th>Dépendants</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let p of filtered">
              <td>
                <div style="display:flex;align-items:center;gap:10px">
                  <div class="avatar-circle" style="width:32px;height:32px;font-size:12px">
                    {{ initials(p) }}
                  </div>
                  <strong>{{ p.firstName }} {{ p.lastName }}</strong>
                </div>
              </td>
              <td style="color:var(--text-muted)">{{ p.account?.email || '—' }}</td>
              <td style="color:var(--text-muted)">{{ p.phoneNumber || '—' }}</td>
              <td>
                <span class="tag" *ngIf="p.dependents?.length">{{ p.dependents.length }} dépendant{{ p.dependents.length > 1 ? 's' : '' }}</span>
                <span *ngIf="!p.dependents?.length" style="color:var(--text-muted)">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class SecretaryPatientsComponent implements OnInit {
  form: FormGroup;
  patients: any[] = [];
  filtered: any[] = [];
  loading = false;
  saving = false;
  showForm = false;
  search = '';
  createError = '';
  createSuccess = '';

  constructor(private fb: FormBuilder, private authSvc: AuthService, private adminSvc: AdminService) {
    this.form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      socialSecurityNumber: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  ngOnInit(): void { this.loadPatients(); }

  loadPatients(): void {
    this.loading = true;
    this.adminSvc.listPatients().subscribe({
      next: res => {
        this.patients = res.patients || [];
        this.filtered = [...this.patients];
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  onSearch(): void {
    const q = this.search.toLowerCase().trim();
    if (!q) { this.filtered = [...this.patients]; return; }
    this.filtered = this.patients.filter(p =>
      `${p.firstName} ${p.lastName} ${p.account?.email || ''}`.toLowerCase().includes(q)
    );
  }

  initials(p: any): string {
    return ((p.firstName?.charAt(0) || '') + (p.lastName?.charAt(0) || '')).toUpperCase();
  }

  create(): void {
    if (this.form.invalid) return;
    this.saving = true;
    this.createError = '';
    this.createSuccess = '';
    const { firstName, lastName, email, socialSecurityNumber, password } = this.form.value;
    this.authSvc.register({ firstName, lastName, email, socialSecurityNumber, password, role: 'patient' }).subscribe({
      next: () => {
        this.saving = false;
        this.createSuccess = `Compte créé pour ${firstName} ${lastName}.`;
        this.form.reset();
        this.loadPatients();
      },
      error: err => { this.saving = false; this.createError = err.error?.details || err.error?.message || 'Erreur.'; }
    });
  }
}
