import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DoctorService } from '../../../core/services/doctor.service';
import { DoctorProfile } from '../../../core/models';

@Component({
  selector: 'app-search-doctors',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2>Trouver un médecin</h2>
          <div class="page-subtitle">Recherchez un praticien par spécialité, langue ou localisation</div>
        </div>
      </div>

      <!-- Search bar -->
      <div class="filter-bar">
        <form [formGroup]="form" (ngSubmit)="search()" style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-start">
          <mat-form-field appearance="outline" style="flex:1;min-width:170px;margin-bottom:-18px">
            <mat-label>Spécialité</mat-label>
            <mat-icon matPrefix style="color:var(--text-faint);margin-right:4px">medical_services</mat-icon>
            <input matInput formControlName="specialty" placeholder="ex: Cardiologie">
          </mat-form-field>
          <mat-form-field appearance="outline" style="flex:1;min-width:150px;margin-bottom:-18px">
            <mat-label>Ville</mat-label>
            <mat-icon matPrefix style="color:var(--text-faint);margin-right:4px">location_on</mat-icon>
            <input matInput formControlName="location" placeholder="ex: Casablanca">
          </mat-form-field>
          <mat-form-field appearance="outline" style="flex:1;min-width:140px;margin-bottom:-18px">
            <mat-label>Langue</mat-label>
            <mat-icon matPrefix style="color:var(--text-faint);margin-right:4px">translate</mat-icon>
            <input matInput formControlName="language" placeholder="ex: Français">
          </mat-form-field>
          <mat-form-field appearance="outline" style="flex:1;min-width:140px;margin-bottom:-18px">
            <mat-label>Nom du médecin</mat-label>
            <mat-icon matPrefix style="color:var(--text-faint);margin-right:4px">person</mat-icon>
            <input matInput formControlName="name">
          </mat-form-field>
          <button mat-raised-button color="primary" type="submit" style="height:56px;padding:0 24px;align-self:flex-start">
            <mat-icon>search</mat-icon> Rechercher
          </button>
        </form>
      </div>

      <!-- Loading -->
      <div *ngIf="loading" style="text-align:center;padding:48px;color:var(--text-muted)">
        <mat-icon style="font-size:36px;width:36px;height:36px;margin-bottom:8px;color:var(--text-faint)">search</mat-icon>
        <div>Recherche en cours…</div>
      </div>

      <!-- Empty -->
      <div *ngIf="!loading && doctors.length === 0 && searched" class="empty-state">
        <mat-icon>person_search</mat-icon>
        <div class="empty-title">Aucun médecin trouvé</div>
        <p>Essayez d'autres critères de recherche</p>
      </div>

      <!-- Results -->
      <div *ngIf="!loading && doctors.length > 0">
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:14px">
          {{ doctors.length }} médecin{{ doctors.length > 1 ? 's' : '' }} trouvé{{ doctors.length > 1 ? 's' : '' }}
        </div>
        <div class="doctor-grid">
          <div class="doctor-card" *ngFor="let doctor of doctors">
            <div class="doctor-header">
              <div class="doctor-avatar">{{ initials(doctor) }}</div>
              <div style="flex:1;min-width:0">
                <div class="doctor-name">Dr. {{ doctor.firstName }} {{ doctor.lastName }}</div>
                <div class="doctor-spec">{{ doctor.specialties?.join(' · ') }}</div>
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px">
              <div *ngIf="doctor.location" class="doctor-meta">
                <mat-icon>location_on</mat-icon> {{ doctor.location }}
              </div>
              <div *ngIf="doctor.languages?.length" class="doctor-meta">
                <mat-icon>translate</mat-icon> {{ doctor.languages?.join(', ') }}
              </div>
              <div class="doctor-meta">
                <mat-icon>verified</mat-icon> Secteur {{ doctor.sector || 1 }}
              </div>
            </div>
            <div class="doctor-foot">
              <span class="doctor-fee">{{ doctor.baseFee }} DH</span>
              <button mat-raised-button color="primary" (click)="book(doctor)" style="font-size:13px">
                <mat-icon style="font-size:16px;width:16px;height:16px">event_available</mat-icon>
                Prendre RDV
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SearchDoctorsComponent implements OnInit {
  form: FormGroup;
  doctors: DoctorProfile[] = [];
  loading = false;
  searched = false;

  constructor(private fb: FormBuilder, private doctorSvc: DoctorService, private router: Router) {
    this.form = this.fb.group({ specialty: [''], location: [''], language: [''], name: [''] });
  }

  ngOnInit(): void {
    this.search();
  }

  search(): void {
    this.loading = true;
    this.searched = true;
    const params = Object.fromEntries(Object.entries(this.form.value).filter(([, v]) => v));
    this.doctorSvc.search(params).subscribe({
      next: res => { this.doctors = res.doctors; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  book(doctor: DoctorProfile): void {
    this.router.navigate(['/patient/book'], { state: { doctor } });
  }

  initials(d: DoctorProfile): string {
    const f = d.firstName?.charAt(0) ?? '';
    const l = d.lastName?.charAt(0) ?? '';
    return (f + l).toUpperCase();
  }
}
