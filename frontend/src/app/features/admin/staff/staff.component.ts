import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AdminService } from '../../../core/services/admin.service';

@Component({
  selector: 'app-admin-staff',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2>Personnel</h2>
          <div class="page-subtitle">Gérez les comptes médecins, secrétaires et administrateurs</div>
        </div>
        <button mat-raised-button color="primary" (click)="showForm = !showForm">
          <mat-icon>{{ showForm ? 'close' : 'person_add' }}</mat-icon>
          {{ showForm ? 'Fermer' : 'Nouveau compte' }}
        </button>
      </div>

      <div *ngIf="showForm" class="card" style="margin-bottom:20px">
        <div class="card-header">
          <h3>Créer un compte du personnel</h3>
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
            <mat-label>Rôle</mat-label>
            <mat-select formControlName="role">
              <mat-option value="medecin">Médecin</mat-option>
              <mat-option value="secretaire">Secrétaire</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" style="margin-bottom:-18px;grid-column:span 2"
            *ngIf="form.get('role')?.value === 'medecin'">
            <mat-label>Spécialités (séparées par virgule)</mat-label>
            <input matInput formControlName="specialties" placeholder="Cardiologie, Médecine générale">
          </mat-form-field>
          <mat-form-field appearance="outline" style="margin-bottom:-18px"
            *ngIf="form.get('role')?.value === 'medecin'">
            <mat-label>Tarif (DH)</mat-label>
            <input matInput formControlName="baseFee" type="number">
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
        <div *ngIf="error" class="msg-error" style="margin-top:12px">
          <mat-icon>error_outline</mat-icon> {{ error }}
        </div>
        <div *ngIf="ok" class="msg-success" style="margin-top:12px">
          <mat-icon>check_circle</mat-icon> Compte créé avec succès.
        </div>
      </div>

      <div *ngIf="loading" style="text-align:center;padding:48px;color:var(--text-muted)">Chargement…</div>

      <div *ngIf="!loading && staff.length === 0" class="empty-state">
        <mat-icon>group</mat-icon>
        <div class="empty-title">Aucun personnel</div>
        <p>Créez le premier compte du personnel</p>
      </div>

      <div class="data-table" *ngIf="!loading && staff.length > 0">
        <table>
          <thead>
            <tr>
              <th>Membre</th>
              <th>Email</th>
              <th>Rôle</th>
              <th>Créé le</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let s of staff">
              <td>
                <div style="display:flex;align-items:center;gap:10px">
                  <div class="avatar-circle" style="width:32px;height:32px;font-size:12px">
                    {{ s.email?.charAt(0)?.toUpperCase() }}
                  </div>
                  <strong>{{ s.email?.split('@')[0] }}</strong>
                </div>
              </td>
              <td style="color:var(--text-muted)">{{ s.email }}</td>
              <td><span class="tag" [class.tag-primary]="s.role === 'administrateur'" [class.tag-success]="s.role === 'medecin'">{{ s.role }}</span></td>
              <td style="color:var(--text-muted)">{{ s.createdAt | date:'d MMM y':'':'fr' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class AdminStaffComponent implements OnInit {
  form: FormGroup;
  staff: any[] = [];
  loading = false;
  saving = false;
  showForm = false;
  error = '';
  ok = false;

  constructor(private fb: FormBuilder, private adminSvc: AdminService) {
    this.form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      role: ['medecin', Validators.required],
      specialties: [''],
      baseFee: [200],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.adminSvc.listStaff().subscribe({
      next: res => { this.staff = res.staff || []; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  create(): void {
    if (this.form.invalid) return;
    this.saving = true;
    this.error = '';
    this.ok = false;
    const v = this.form.value;
    const payload: any = {
      firstName: v.firstName, lastName: v.lastName, email: v.email,
      role: v.role, password: v.password
    };
    if (v.role === 'medecin') {
      payload.specialties = (v.specialties || '').split(',').map((s: string) => s.trim()).filter(Boolean);
      payload.baseFee = Number(v.baseFee) || 200;
    }
    this.adminSvc.createStaff(payload).subscribe({
      next: () => {
        this.saving = false;
        this.ok = true;
        this.form.reset({ role: 'medecin', baseFee: 200 });
        this.load();
      },
      error: err => { this.saving = false; this.error = err.error?.message || 'Erreur.'; }
    });
  }
}
