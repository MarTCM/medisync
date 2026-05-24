/**
 * Composant AdminStaffComponent — CRUD du personnel (médecins et secrétaires).
 *
 * - Création de compte avec profil professionnel (spécialités, tarifs, secteur, planning par défaut).
 * - Liste, édition et suppression — AdminService.createStaff / listStaff / updateStaff / deleteAccount.
 */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminService } from '../../../core/services/admin.service';

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

@Component({
  selector: 'app-admin-staff',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule, MatButtonToggleModule, MatChipsModule,
    MatSnackBarModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2>Personnel</h2>
          <div class="page-subtitle">Gérez les comptes médecins, secrétaires et administrateurs</div>
        </div>
        <button mat-raised-button color="primary" (click)="toggleCreate()">
          <mat-icon>{{ showForm && !editingId ? 'close' : 'person_add' }}</mat-icon>
          {{ showForm && !editingId ? 'Fermer' : 'Nouveau compte' }}
        </button>
      </div>

      <div *ngIf="showForm" class="card" style="margin-bottom:20px">
        <div class="card-header">
          <h3>{{ editingId ? 'Modifier le compte' : 'Créer un compte du personnel' }}</h3>
        </div>
        <form [formGroup]="form" (ngSubmit)="submit()" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:12px">
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
            <mat-select formControlName="role" [disabled]="!!editingId">
              <mat-option value="medecin">Médecin</mat-option>
              <mat-option value="secretaire">Secrétaire</mat-option>
            </mat-select>
          </mat-form-field>

          <ng-container *ngIf="form.get('role')?.value === 'medecin'">
            <mat-form-field appearance="outline" style="margin-bottom:-18px;grid-column:span 2">
              <mat-label>Spécialités (séparées par virgule)</mat-label>
              <input matInput formControlName="specialties" placeholder="Cardiologie, Médecine générale">
            </mat-form-field>
            <mat-form-field appearance="outline" style="margin-bottom:-18px;grid-column:span 2">
              <mat-label>Langues (séparées par virgule)</mat-label>
              <input matInput formControlName="languages" placeholder="Français, Arabe, Anglais">
            </mat-form-field>
            <mat-form-field appearance="outline" style="margin-bottom:-18px">
              <mat-label>Localisation</mat-label>
              <input matInput formControlName="location" placeholder="ex: Casablanca">
            </mat-form-field>
            <mat-form-field appearance="outline" style="margin-bottom:-18px">
              <mat-label>Secteur</mat-label>
              <mat-select formControlName="sector">
                <mat-option [value]="1">Secteur 1</mat-option>
                <mat-option [value]="2">Secteur 2</mat-option>
                <mat-option [value]="3">Secteur 3</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" style="margin-bottom:-18px">
              <mat-label>Tarif (DH)</mat-label>
              <input matInput formControlName="baseFee" type="number">
            </mat-form-field>

            <div style="grid-column:1/-1;margin-top:4px">
              <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px">Jours travaillés</div>
              <mat-chip-listbox multiple [value]="selectedDays" (change)="toggleDays($event.value)">
                <mat-chip-option *ngFor="let d of days" [value]="d" [selected]="selectedDays.includes(d)">
                  {{ d }}
                </mat-chip-option>
              </mat-chip-listbox>
            </div>
            <mat-form-field appearance="outline" style="margin-bottom:-18px">
              <mat-label>Début</mat-label>
              <input matInput type="time" formControlName="startHour">
            </mat-form-field>
            <mat-form-field appearance="outline" style="margin-bottom:-18px">
              <mat-label>Fin</mat-label>
              <input matInput type="time" formControlName="endHour">
            </mat-form-field>
            <mat-form-field appearance="outline" style="margin-bottom:-18px">
              <mat-label>Durée consultation</mat-label>
              <mat-select formControlName="defaultConsultationDuration">
                <mat-option [value]="15">15 min</mat-option>
                <mat-option [value]="30">30 min</mat-option>
                <mat-option [value]="60">60 min</mat-option>
              </mat-select>
            </mat-form-field>
          </ng-container>

          <mat-form-field *ngIf="!editingId" appearance="outline" style="margin-bottom:-18px;grid-column:span 2">
            <mat-label>Mot de passe temporaire</mat-label>
            <mat-icon matPrefix style="color:var(--text-faint);margin-right:6px">lock</mat-icon>
            <input matInput formControlName="password" type="text" placeholder="8 car · 1 maj · 1 chiffre · 1 symbole">
          </mat-form-field>

          <div style="grid-column:1/-1;display:flex;gap:10px;justify-content:flex-end;margin-top:8px">
            <button mat-stroked-button type="button" (click)="cancelEdit()" [disabled]="saving">Annuler</button>
            <button mat-raised-button color="primary" type="submit"
              [disabled]="form.invalid || saving"
              style="height:44px">
              <mat-icon>{{ editingId ? 'save' : 'add' }}</mat-icon>
              {{ saving ? 'Enregistrement…' : (editingId ? 'Enregistrer' : 'Créer le compte') }}
            </button>
          </div>
        </form>
        <div *ngIf="error" class="msg-error" style="margin-top:12px">
          <mat-icon>error_outline</mat-icon> {{ error }}
        </div>
        <div *ngIf="ok" class="msg-success" style="margin-top:12px">
          <mat-icon>check_circle</mat-icon> {{ editingId ? 'Compte mis à jour.' : 'Compte créé avec succès.' }}
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
              <th>Détails</th>
              <th>Créé le</th>
              <th style="text-align:right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let s of staff">
              <td>
                <div style="display:flex;align-items:center;gap:10px">
                  <div class="avatar-circle" style="width:32px;height:32px;font-size:12px">
                    {{ initials(s) }}
                  </div>
                  <strong>{{ s.profile?.firstName }} {{ s.profile?.lastName }}</strong>
                </div>
              </td>
              <td style="color:var(--text-muted)">{{ s.email }}</td>
              <td><span class="tag" [class.tag-primary]="s.role === 'administrateur'" [class.tag-success]="s.role === 'medecin'">{{ s.role }}</span></td>
              <td style="color:var(--text-muted);font-size:12.5px">
                <ng-container *ngIf="s.role === 'medecin' && s.profile">
                  <div>{{ s.profile.specialties?.join(' · ') || '—' }}</div>
                  <div style="font-size:11.5px">
                    {{ s.profile.location || '—' }} · Secteur {{ s.profile.sector || 1 }} · {{ s.profile.baseFee || 0 }} DH
                  </div>
                </ng-container>
                <ng-container *ngIf="s.role !== 'medecin'">—</ng-container>
              </td>
              <td style="color:var(--text-muted)">{{ s.createdAt | date:'d MMM y':'':'fr' }}</td>
              <td style="text-align:right;white-space:nowrap">
                <button mat-icon-button color="primary" (click)="startEdit(s)" title="Modifier">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="remove(s)" title="Supprimer">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
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
  editingId: string | null = null;
  error = '';
  ok = false;
  days = DAYS;
  selectedDays: string[] = [];

  constructor(private fb: FormBuilder, private adminSvc: AdminService, private snack: MatSnackBar) {
    this.form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      role: ['medecin', Validators.required],
      specialties: [''],
      languages: [''],
      location: [''],
      sector: [1],
      baseFee: [200],
      startHour: ['09:00'],
      endHour: ['18:00'],
      defaultConsultationDuration: [30],
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

  initials(s: any): string {
    const f = s.profile?.firstName?.charAt(0) ?? '';
    const l = s.profile?.lastName?.charAt(0) ?? '';
    return ((f + l) || s.email?.charAt(0) || '?').toUpperCase();
  }

  toggleDays(values: string[]): void { this.selectedDays = values; }

  toggleCreate(): void {
    if (this.showForm && !this.editingId) {
      this.cancelEdit();
    } else {
      this.editingId = null;
      this.showForm = true;
      this.resetForm();
      this.form.get('password')?.setValidators([Validators.required, Validators.minLength(8)]);
      this.form.get('password')?.updateValueAndValidity();
    }
  }

  resetForm(): void {
    this.form.reset({
      role: 'medecin',
      sector: 1,
      baseFee: 200,
      startHour: '09:00',
      endHour: '18:00',
      defaultConsultationDuration: 30
    });
    this.selectedDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
    this.error = '';
    this.ok = false;
  }

  startEdit(s: any): void {
    this.editingId = s._id;
    this.showForm = true;
    this.error = '';
    this.ok = false;
    this.form.get('password')?.clearValidators();
    this.form.get('password')?.updateValueAndValidity();
    const p = s.profile || {};
    this.form.patchValue({
      firstName: p.firstName || '',
      lastName: p.lastName || '',
      email: s.email || '',
      role: s.role,
      specialties: (p.specialties || []).join(', '),
      languages: (p.languages || []).join(', '),
      location: p.location || '',
      sector: p.sector || 1,
      baseFee: p.baseFee || 0,
      startHour: p.schedule?.startHour || '09:00',
      endHour: p.schedule?.endHour || '18:00',
      defaultConsultationDuration: p.schedule?.defaultConsultationDuration || 30,
      password: ''
    });
    this.selectedDays = p.schedule?.workDays || [];
  }

  cancelEdit(): void {
    this.editingId = null;
    this.showForm = false;
    this.resetForm();
  }

  buildPayload(): any {
    const v = this.form.value;
    const payload: any = {
      firstName: v.firstName,
      lastName: v.lastName,
      email: v.email,
      role: v.role
    };
    if (v.role === 'medecin') {
      payload.specialties = String(v.specialties || '').split(',').map((s: string) => s.trim()).filter(Boolean);
      payload.languages = String(v.languages || '').split(',').map((s: string) => s.trim()).filter(Boolean);
      payload.location = v.location || '';
      payload.sector = Number(v.sector) || 1;
      payload.baseFee = Number(v.baseFee) || 0;
      payload.schedule = {
        workDays: this.selectedDays,
        startHour: v.startHour,
        endHour: v.endHour,
        defaultConsultationDuration: Number(v.defaultConsultationDuration) || 30
      };
    }
    return payload;
  }

  submit(): void {
    if (this.form.invalid) return;
    this.saving = true;
    this.error = '';
    this.ok = false;
    const payload = this.buildPayload();

    if (this.editingId) {
      this.adminSvc.updateStaff(this.editingId, payload).subscribe({
        next: () => {
          this.saving = false;
          this.ok = true;
          this.editingId = null;
          this.showForm = false;
          this.snack.open('Compte mis à jour.', 'OK', { duration: 3000 });
          this.load();
        },
        error: err => { this.saving = false; this.error = err.error?.message || 'Erreur.'; }
      });
    } else {
      payload.password = this.form.value.password;
      this.adminSvc.createStaff(payload).subscribe({
        next: () => {
          this.saving = false;
          this.ok = true;
          this.resetForm();
          this.snack.open('Compte créé.', 'OK', { duration: 3000 });
          this.load();
        },
        error: err => { this.saving = false; this.error = err.error?.message || 'Erreur.'; }
      });
    }
  }

  remove(s: any): void {
    const name = s.profile ? `${s.profile.firstName} ${s.profile.lastName}` : s.email;
    if (!confirm(`Supprimer définitivement le compte de ${name} ? Cette action est irréversible.`)) return;
    this.adminSvc.deleteAccount(s._id).subscribe({
      next: () => {
        this.snack.open('Compte supprimé.', 'OK', { duration: 3000 });
        this.load();
      },
      error: err => {
        this.snack.open(err.error?.message || 'Erreur lors de la suppression.', 'OK', { duration: 4000 });
      }
    });
  }
}
