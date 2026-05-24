/**
 * Composant MyRecordComponent — dossier médical du patient.
 *
 * - Affiche antécédents, allergies, historique des consultations et documents joints.
 * - Permet au patient de mettre à jour ses antécédents/allergies (RecordService.updateMyRecord).
 * - Téléchargement des ordonnances en PDF via RecordService.
 * - Téléversement de documents (PDF/JPG/PNG/DICOM, 20 Mo max) via uploadDocument.
 */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule, MatChipInputEvent } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { RecordService } from '../../../core/services/record.service';
import { MedicalRecord, DoctorProfile, Consultation } from '../../../core/models';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-my-record',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatExpansionModule,
    MatChipsModule, MatFormFieldModule, MatInputModule, MatSnackBarModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2>Mon dossier médical</h2>
          <div class="page-subtitle">Antécédents, consultations, ordonnances et documents</div>
        </div>
        <label mat-raised-button color="primary" style="cursor:pointer">
          <mat-icon>upload_file</mat-icon> Téléverser un document
          <input type="file" hidden (change)="uploadFile($event)" accept=".pdf,.jpg,.jpeg,.png,.dcm">
        </label>
      </div>

      <div *ngIf="loading" style="text-align:center;padding:48px;color:var(--text-muted)">Chargement…</div>
      <div *ngIf="error" class="msg-error"><mat-icon>error_outline</mat-icon> {{ error }}</div>

      <!-- Tabs -->
      <div *ngIf="record || !loading" class="tab-bar">
        <button class="tab" [class.active]="tab === 'general'" (click)="tab = 'general'">
          Antécédents
        </button>
        <button class="tab" [class.active]="tab === 'consultations'" (click)="tab = 'consultations'">
          Consultations ({{ record?.consultations?.length || 0 }})
        </button>
        <button class="tab" [class.active]="tab === 'documents'" (click)="tab = 'documents'">
          Documents ({{ record?.attachments?.length || 0 }})
        </button>
      </div>

      <!-- General (antécédents + allergies) -->
      <div class="card" *ngIf="!loading" [hidden]="tab !== 'general'" style="padding:24px">

        <!-- Header row -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <h3 style="margin:0">Informations médicales générales</h3>
          <div style="display:flex;gap:8px">
            <button *ngIf="!editMode" mat-stroked-button (click)="enterEdit()">
              <mat-icon>edit</mat-icon> Modifier
            </button>
            <button *ngIf="editMode" mat-raised-button color="primary" (click)="saveRecord()" [disabled]="saving">
              <mat-icon>save</mat-icon> {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
            </button>
            <button *ngIf="editMode" mat-stroked-button (click)="cancelEdit()">Annuler</button>
          </div>
        </div>

        <!-- Antécédents — READ MODE -->
        <div *ngIf="!editMode" style="margin-bottom:20px">
          <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:8px">Antécédents médicaux</div>
          <span *ngIf="!record?.history?.length" style="color:var(--text-muted);font-size:13.5px">Aucun antécédent enregistré.</span>
          <mat-chip-set *ngIf="record?.history?.length">
            <mat-chip *ngFor="let h of record!.history">{{ h }}</mat-chip>
          </mat-chip-set>
        </div>

        <!-- Antécédents — EDIT MODE -->
        <div *ngIf="editMode" style="margin-bottom:20px">
          <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:8px">Antécédents médicaux</div>
          <mat-form-field style="width:100%" appearance="outline">
            <mat-label>Antécédents (Entrée ou virgule pour ajouter)</mat-label>
            <mat-chip-grid #historyGrid>
              <mat-chip-row *ngFor="let h of editHistory" (removed)="removeHistory(h)">
                {{ h }}
                <button matChipRemove><mat-icon>cancel</mat-icon></button>
              </mat-chip-row>
            </mat-chip-grid>
            <input [matChipInputFor]="historyGrid"
              [matChipInputSeparatorKeyCodes]="separatorKeys"
              (matChipInputTokenEnd)="addHistory($event)"
              placeholder="ex: Diabète type 2…">
          </mat-form-field>
        </div>

        <!-- Allergies — READ MODE -->
        <div *ngIf="!editMode">
          <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:8px">Allergies</div>
          <span *ngIf="!record?.allergies?.length" style="color:var(--text-muted);font-size:13.5px">Aucune allergie enregistrée.</span>
          <mat-chip-set *ngIf="record?.allergies?.length">
            <mat-chip color="warn" highlighted *ngFor="let a of record!.allergies">{{ a }}</mat-chip>
          </mat-chip-set>
        </div>

        <!-- Allergies — EDIT MODE -->
        <div *ngIf="editMode">
          <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:8px">Allergies</div>
          <mat-form-field style="width:100%" appearance="outline">
            <mat-label>Allergies (Entrée ou virgule pour ajouter)</mat-label>
            <mat-chip-grid #allergyGrid>
              <mat-chip-row *ngFor="let a of editAllergies" (removed)="removeAllergy(a)" color="warn" highlighted>
                {{ a }}
                <button matChipRemove><mat-icon>cancel</mat-icon></button>
              </mat-chip-row>
            </mat-chip-grid>
            <input [matChipInputFor]="allergyGrid"
              [matChipInputSeparatorKeyCodes]="separatorKeys"
              (matChipInputTokenEnd)="addAllergy($event)"
              placeholder="ex: Pénicilline, Arachides…">
          </mat-form-field>
        </div>

        <!-- Empty state when no record and not editing -->
        <div *ngIf="!record && !editMode" style="margin-top:16px;padding:16px;background:var(--surface-2);border-radius:var(--radius);border:1px dashed var(--border);font-size:13.5px;color:var(--text-muted);text-align:center">
          Aucun dossier médical. Ajoutez vos antécédents et allergies pour les partager avec vos médecins.
        </div>
      </div>

      <!-- Consultations -->
      <div class="card" *ngIf="record" [hidden]="tab !== 'consultations'">
        <div class="card-header"><h3>Historique des consultations</h3></div>
        <div *ngIf="!record.consultations?.length" class="empty-state" style="padding:32px 0;border:none">
          <mat-icon>history</mat-icon>
          <div class="empty-title">Aucune consultation</div>
          <p>Vos comptes rendus apparaîtront ici après vos rendez-vous</p>
        </div>
        <mat-accordion *ngIf="record.consultations?.length">
          <mat-expansion-panel *ngFor="let c of record.consultations" style="margin-bottom:8px">
            <mat-expansion-panel-header>
              <mat-panel-title style="font-weight:600">
                {{ c.date | date:'d MMMM y':'':'fr' }}
              </mat-panel-title>
              <mat-panel-description>
                <ng-container *ngIf="isDoctor(c.doctorId)">
                  Dr. {{ c.doctorId.firstName }} {{ c.doctorId.lastName }}
                </ng-container>
              </mat-panel-description>
            </mat-expansion-panel-header>
            <div style="padding:8px 0">
              <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:6px">Compte rendu</div>
              <p style="font-size:14px;color:var(--text);margin-bottom:16px">{{ c.report }}</p>

              <ng-container *ngIf="c.prescriptions?.length">
                <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:8px">Prescriptions</div>
                <div *ngFor="let p of c.prescriptions"
                  style="background:var(--surface-2);border:1px solid var(--border);border-radius:8px;padding:10px 14px;margin-bottom:6px;font-size:13.5px">
                  <strong>{{ p.medication }}</strong> — {{ p.dosage }} — {{ p.duration }}
                </div>
                <button mat-stroked-button color="primary" (click)="downloadPrescription(c)" style="margin-top:10px">
                  <mat-icon>download</mat-icon> Télécharger l'ordonnance (PDF)
                </button>
              </ng-container>
            </div>
          </mat-expansion-panel>
        </mat-accordion>
      </div>

      <!-- Documents -->
      <div class="card" *ngIf="record" [hidden]="tab !== 'documents'">
        <div class="card-header">
          <h3>Documents médicaux</h3>
          <div class="card-subtitle">Formats acceptés : PDF, JPG, PNG, DICOM (20 Mo max)</div>
        </div>
        <div *ngIf="!record.attachments?.length" class="empty-state" style="padding:32px 0;border:none">
          <mat-icon>folder_open</mat-icon>
          <div class="empty-title">Aucun document</div>
          <p>Téléversez vos analyses, radios ou autres documents médicaux</p>
        </div>
        <div *ngFor="let att of record.attachments"
          style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px;background:var(--surface)">
          <div style="display:flex;align-items:center;gap:14px;min-width:0">
            <div style="width:36px;height:36px;border-radius:8px;background:var(--primary-light);color:var(--primary-dark);display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <mat-icon style="font-size:20px;width:20px;height:20px">description</mat-icon>
            </div>
            <div style="min-width:0">
              <div style="font-weight:600;font-size:14px;color:var(--text);word-break:break-all">{{ att.fileName }}</div>
              <div style="font-size:12px;color:var(--text-muted)">
                {{ att.fileType }} · {{ att.uploadedAt | date:'d MMM y':'':'fr' }}
              </div>
            </div>
          </div>
          <button mat-stroked-button (click)="openDoc(att.fileUrl)">
            <mat-icon>open_in_new</mat-icon> Ouvrir
          </button>
        </div>
      </div>

      <!-- No record and not on general tab -->
      <div *ngIf="!loading && !record && tab !== 'general' && !error" class="empty-state">
        <mat-icon>folder_open</mat-icon>
        <div class="empty-title">Aucun dossier médical</div>
        <p>Votre dossier sera créé après votre première consultation ou lorsque vous ajouterez vos informations médicales.</p>
      </div>
    </div>
  `
})
export class MyRecordComponent implements OnInit {
  record: MedicalRecord | null = null;
  loading = true;
  saving = false;
  error = '';
  tab: 'general' | 'consultations' | 'documents' = 'general';
  uploadsUrl = environment.uploadsUrl;

  editMode = false;
  editHistory: string[] = [];
  editAllergies: string[] = [];
  readonly separatorKeys = [ENTER, COMMA] as const;

  constructor(private recordSvc: RecordService, private snack: MatSnackBar) {}

  ngOnInit(): void {
    this.loadRecord();
  }

  private loadRecord(): void {
    this.loading = true;
    this.recordSvc.getMyRecord().subscribe({
      next: res => { this.record = res.record; this.loading = false; },
      error: err => {
        this.loading = false;
        if (err.status !== 404) {
          this.error = err.error?.message || 'Erreur de chargement.';
        }
      }
    });
  }

  enterEdit(): void {
    this.editHistory = [...(this.record?.history || [])];
    this.editAllergies = [...(this.record?.allergies || [])];
    this.editMode = true;
  }

  cancelEdit(): void {
    this.editMode = false;
  }

  addHistory(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value) this.editHistory.push(value);
    event.chipInput!.clear();
  }

  removeHistory(item: string): void {
    this.editHistory = this.editHistory.filter(h => h !== item);
  }

  addAllergy(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value) this.editAllergies.push(value);
    event.chipInput!.clear();
  }

  removeAllergy(item: string): void {
    this.editAllergies = this.editAllergies.filter(a => a !== item);
  }

  saveRecord(): void {
    this.saving = true;
    this.recordSvc.updateMyRecord({ history: this.editHistory, allergies: this.editAllergies }).subscribe({
      next: res => {
        this.record = res.record;
        this.saving = false;
        this.editMode = false;
        this.snack.open('Dossier mis à jour.', 'OK', { duration: 3000 });
      },
      error: err => {
        this.saving = false;
        this.snack.open(err.error?.message || 'Erreur lors de la mise à jour.', 'OK', { duration: 4000 });
      }
    });
  }

  downloadPrescription(c: Consultation): void {
    this.recordSvc.downloadPrescription(c._id).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Ordonnance-${c._id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  openDoc(fileUrl: string): void {
    window.open(`${this.uploadsUrl}/${fileUrl}`, '_blank', 'noopener');
  }

  uploadFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.recordSvc.uploadDocument(file).subscribe({
      next: () => {
        this.recordSvc.getMyRecord().subscribe(res => {
          this.record = res.record;
          this.tab = 'documents';
        });
      },
      error: err => alert(err.error?.message || 'Erreur lors du téléversement')
    });
  }

  isDoctor(d: any): d is DoctorProfile { return d && typeof d === 'object'; }
}
