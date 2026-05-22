import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { ReviewService } from '../../../core/services/review.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { Appointment } from '../../../core/models';

@Component({
  selector: 'app-leave-review',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatCheckboxModule, MatIconModule],
  template: `
    <div class="page-container" style="max-width:680px">
      <div class="page-header">
        <div>
          <h2>Laisser un avis</h2>
          <div class="page-subtitle">Évaluez votre consultation et aidez d'autres patients</div>
        </div>
      </div>

      <div class="card">
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <mat-form-field class="full-width" appearance="outline">
            <mat-label>Rendez-vous concerné</mat-label>
            <mat-icon matPrefix style="margin-right:6px;color:var(--text-faint)">event</mat-icon>
            <mat-select formControlName="appointmentId">
              <mat-option *ngFor="let apt of terminated" [value]="apt._id">
                {{ apt.startTime | date:'d MMM y \\'à\\' HH:mm':'':'fr' }}
                <span *ngIf="isObj(apt.doctor)"> — Dr. {{ $any(apt.doctor).firstName }} {{ $any(apt.doctor).lastName }}</span>
              </mat-option>
            </mat-select>
          </mat-form-field>

          <div style="margin:8px 0 22px">
            <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:10px">Votre note</div>
            <div style="display:flex;gap:10px">
              <button type="button" *ngFor="let n of [1,2,3,4,5]"
                (click)="setRating(n)"
                style="background:none;border:none;cursor:pointer;padding:0">
                <mat-icon style="font-size:32px;width:32px;height:32px"
                  [style.color]="n <= form.value.rating ? '#F59E0B' : '#CBD5E1'">
                  star
                </mat-icon>
              </button>
              <span style="font-size:14px;color:var(--text-muted);align-self:center;margin-left:12px">
                {{ ratingLabel() }}
              </span>
            </div>
          </div>

          <mat-form-field class="full-width" appearance="outline">
            <mat-label>Commentaire (optionnel)</mat-label>
            <textarea matInput formControlName="comment" rows="4" maxlength="500"
              placeholder="Partagez votre expérience avec ce médecin…"></textarea>
            <mat-hint align="end">{{ form.value.comment?.length || 0 }}/500</mat-hint>
          </mat-form-field>

          <div style="margin:16px 0 20px">
            <mat-checkbox formControlName="isIssueReport">
              Signaler un problème avec cette consultation
            </mat-checkbox>
            <div style="font-size:12px;color:var(--text-muted);margin-left:30px;margin-top:2px">
              Votre avis sera transmis à l'administration pour traitement.
            </div>
          </div>

          <div *ngIf="success" class="msg-success">
            <mat-icon>check_circle</mat-icon> {{ success }}
          </div>
          <div *ngIf="error" class="msg-error">
            <mat-icon>error_outline</mat-icon> {{ error }}
          </div>

          <button mat-raised-button color="primary" type="submit"
            [disabled]="form.invalid || loading"
            style="height:44px;padding:0 28px">
            <mat-icon>send</mat-icon> {{ loading ? 'Envoi…' : 'Envoyer mon avis' }}
          </button>
        </form>
      </div>

      <div *ngIf="!terminated.length && !loading" class="empty-state" style="margin-top:20px">
        <mat-icon>rate_review</mat-icon>
        <div class="empty-title">Aucune consultation à évaluer</div>
        <p>Vous pourrez laisser un avis après votre prochaine consultation terminée</p>
      </div>
    </div>
  `
})
export class LeaveReviewComponent implements OnInit {
  form: FormGroup;
  terminated: Appointment[] = [];
  loading = false;
  error = '';
  success = '';

  constructor(private fb: FormBuilder, private reviewSvc: ReviewService, private apptSvc: AppointmentService) {
    this.form = this.fb.group({
      appointmentId: ['', Validators.required],
      rating: [5, Validators.required],
      comment: [''],
      isIssueReport: [false]
    });
  }

  ngOnInit(): void {
    this.apptSvc.getMine().subscribe({
      next: apts => { this.terminated = (apts || []).filter(a => a.status === 'terminé'); }
    });
  }

  setRating(n: number): void { this.form.patchValue({ rating: n }); }

  ratingLabel(): string {
    const labels: Record<number, string> = { 1: 'Très insatisfait', 2: 'Insatisfait', 3: 'Correct', 4: 'Satisfait', 5: 'Excellent' };
    return labels[this.form.value.rating] || '';
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    this.success = '';
    this.reviewSvc.create(this.form.value).subscribe({
      next: () => { this.loading = false; this.success = 'Avis envoyé, merci !'; },
      error: err => { this.loading = false; this.error = err.error?.message || 'Erreur.'; }
    });
  }

  isObj(d: any): boolean { return d && typeof d === 'object'; }
}
