import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { DoctorService } from '../../../core/services/doctor.service';
import { Leave } from '../../../core/models';

@Component({
  selector: 'app-leaves',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatDatepickerModule, MatNativeDateModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2>Congés & Absences</h2>
          <div class="page-subtitle">Gérez vos périodes d'indisponibilité</div>
        </div>
      </div>

      <div class="card" style="margin-bottom:20px">
        <div class="card-header">
          <h3>Ajouter une période d'absence</h3>
        </div>
        <form [formGroup]="form" (ngSubmit)="add()" style="display:flex; gap:12px; flex-wrap:wrap; align-items:flex-start">
          <mat-form-field appearance="outline" style="margin-bottom:-18px">
            <mat-label>Début</mat-label>
            <input matInput [matDatepicker]="p1" formControlName="start">
            <mat-datepicker-toggle matIconSuffix [for]="p1"></mat-datepicker-toggle>
            <mat-datepicker #p1></mat-datepicker>
          </mat-form-field>
          <mat-form-field appearance="outline" style="margin-bottom:-18px">
            <mat-label>Fin</mat-label>
            <input matInput [matDatepicker]="p2" formControlName="end">
            <mat-datepicker-toggle matIconSuffix [for]="p2"></mat-datepicker-toggle>
            <mat-datepicker #p2></mat-datepicker>
          </mat-form-field>
          <mat-form-field appearance="outline" style="flex:1; min-width:220px; margin-bottom:-18px">
            <mat-label>Motif (optionnel)</mat-label>
            <input matInput formControlName="reason" placeholder="Congé, formation…">
          </mat-form-field>
          <button mat-raised-button color="primary" type="submit"
            [disabled]="form.invalid || saving" style="height:56px;padding:0 22px">
            <mat-icon>add</mat-icon> {{ saving ? 'Ajout…' : 'Ajouter' }}
          </button>
        </form>
        <div *ngIf="error" class="msg-error" style="margin-top:12px">
          <mat-icon>error_outline</mat-icon> {{ error }}
        </div>
      </div>

      <div *ngIf="loading" style="text-align:center;padding:48px;color:var(--text-muted)">Chargement…</div>

      <div *ngIf="!loading && leaves.length === 0" class="empty-state">
        <mat-icon>beach_access</mat-icon>
        <div class="empty-title">Aucun congé enregistré</div>
        <p>Vos absences à venir apparaîtront ici</p>
      </div>

      <div *ngFor="let l of leaves" class="apt-row" style="margin-bottom:8px">
        <div style="width:42px;height:42px;border-radius:10px;background:#F3E8FF;color:#7C3AED;display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <mat-icon>event_busy</mat-icon>
        </div>
        <div class="apt-info">
          <div class="apt-name">
            {{ l.startDate | date:'d MMM y':'':'fr' }}
            <mat-icon style="font-size:16px;width:16px;height:16px;vertical-align:middle;color:var(--text-muted)">arrow_forward</mat-icon>
            {{ l.endDate | date:'d MMM y':'':'fr' }}
          </div>
          <div class="apt-meta" *ngIf="l.reason">{{ l.reason }}</div>
        </div>
        <button mat-icon-button color="warn" (click)="remove(l._id!)" title="Supprimer">
          <mat-icon>delete_outline</mat-icon>
        </button>
      </div>
    </div>
  `
})
export class LeavesComponent implements OnInit {
  form: FormGroup;
  leaves: Leave[] = [];
  loading = false;
  saving = false;
  error = '';

  constructor(private fb: FormBuilder, private doctorSvc: DoctorService) {
    this.form = this.fb.group({
      start: [null, Validators.required],
      end: [null, Validators.required],
      reason: ['']
    });
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.doctorSvc.listLeaves().subscribe({
      next: res => { this.leaves = res.leaves; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  add(): void {
    if (this.form.invalid) return;
    this.saving = true;
    this.error = '';
    const { start, end, reason } = this.form.value;
    this.doctorSvc.addLeave({
      startDate: (start as Date).toISOString().split('T')[0],
      endDate: (end as Date).toISOString().split('T')[0],
      reason
    }).subscribe({
      next: () => { this.saving = false; this.form.reset(); this.load(); },
      error: err => { this.saving = false; this.error = err.error?.message || 'Erreur.'; }
    });
  }

  remove(id: string): void {
    if (!confirm('Supprimer ce congé ?')) return;
    this.doctorSvc.removeLeave(id).subscribe({ next: () => this.load() });
  }
}
