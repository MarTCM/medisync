/**
 * Composant AdminFacilityComponent — configuration de la clinique.
 *
 * - Édition du singleton Facility (nom, adresse, contact, horaires, spécialités).
 * - Gestion des salles d'examen : ajout (FacilityService.addRoom(roomName, equipment[])) et suppression.
 */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FacilityService } from '../../../core/services/facility.service';
import { Facility, Room } from '../../../core/models';

@Component({
  selector: 'app-admin-facility',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2>Établissement</h2>
          <div class="page-subtitle">Informations de la clinique et configuration des salles</div>
        </div>
      </div>

      <!-- Info card -->
      <div class="card" style="margin-bottom:20px">
        <div class="card-header">
          <h3>Informations générales</h3>
          <div class="card-subtitle">Coordonnées et horaires d'ouverture</div>
        </div>
        <form [formGroup]="infoForm" (ngSubmit)="saveInfo()" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(220px, 1fr));gap:12px">
          <mat-form-field appearance="outline" style="margin-bottom:-18px;grid-column:span 2">
            <mat-label>Nom de la clinique</mat-label>
            <mat-icon matPrefix style="color:var(--text-faint);margin-right:6px">apartment</mat-icon>
            <input matInput formControlName="name">
          </mat-form-field>
          <mat-form-field appearance="outline" style="margin-bottom:-18px;grid-column:span 2">
            <mat-label>Adresse</mat-label>
            <mat-icon matPrefix style="color:var(--text-faint);margin-right:6px">location_on</mat-icon>
            <input matInput formControlName="address">
          </mat-form-field>
          <mat-form-field appearance="outline" style="margin-bottom:-18px">
            <mat-label>Téléphone</mat-label>
            <mat-icon matPrefix style="color:var(--text-faint);margin-right:6px">phone</mat-icon>
            <input matInput formControlName="contactPhone">
          </mat-form-field>
          <mat-form-field appearance="outline" style="margin-bottom:-18px">
            <mat-label>Email contact</mat-label>
            <mat-icon matPrefix style="color:var(--text-faint);margin-right:6px">email</mat-icon>
            <input matInput formControlName="contactEmail" type="email">
          </mat-form-field>
          <mat-form-field appearance="outline" style="margin-bottom:-18px;grid-column:span 2">
            <mat-label>Horaires d'ouverture</mat-label>
            <mat-icon matPrefix style="color:var(--text-faint);margin-right:6px">schedule</mat-icon>
            <input matInput formControlName="openingHours" placeholder="Lun-Ven 9h-18h">
          </mat-form-field>
          <button mat-raised-button color="primary" type="submit"
            [disabled]="infoForm.invalid || saving"
            style="height:48px;grid-column:span 2;margin-top:8px">
            <mat-icon>save</mat-icon> {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
          </button>
        </form>
        <div *ngIf="saveOk" class="msg-success" style="margin-top:12px">
          <mat-icon>check_circle</mat-icon> Informations mises à jour.
        </div>
      </div>

      <!-- Rooms card -->
      <div class="card">
        <div class="card-header">
          <h3>Salles de consultation</h3>
          <div class="card-subtitle">Configurez les salles et leurs équipements partagés</div>
        </div>
        <form [formGroup]="roomForm" (ngSubmit)="addRoom()" style="display:flex; gap:12px; flex-wrap:wrap; align-items:flex-start; margin-bottom:18px">
          <mat-form-field appearance="outline" style="flex:1;min-width:180px;margin-bottom:-18px">
            <mat-label>Nom de la salle</mat-label>
            <mat-icon matPrefix style="color:var(--text-faint);margin-right:6px">meeting_room</mat-icon>
            <input matInput formControlName="roomName" placeholder="Salle 1, Bloc A…">
          </mat-form-field>
          <mat-form-field appearance="outline" style="flex:2;min-width:200px;margin-bottom:-18px">
            <mat-label>Équipement (séparés par virgule)</mat-label>
            <input matInput formControlName="equipment" placeholder="ECG, Échographe…">
          </mat-form-field>
          <button mat-raised-button color="primary" type="submit"
            [disabled]="roomForm.invalid"
            style="height:56px;padding:0 22px">
            <mat-icon>add</mat-icon> Ajouter
          </button>
        </form>

        <div *ngIf="rooms.length === 0" class="empty-state" style="padding:24px 0;border:none">
          <mat-icon>meeting_room</mat-icon>
          <div class="empty-title">Aucune salle configurée</div>
          <p>Ajoutez votre première salle de consultation</p>
        </div>

        <div *ngFor="let room of rooms" style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;margin-bottom:6px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:34px;height:34px;border-radius:8px;background:var(--primary-light);color:var(--primary-dark);display:flex;align-items:center;justify-content:center">
              <mat-icon style="font-size:18px;width:18px;height:18px">meeting_room</mat-icon>
            </div>
            <div>
              <strong style="font-size:14px">{{ room.roomName }}</strong>
              <div *ngIf="room.equipment?.length" style="font-size:12px;color:var(--text-muted);margin-top:2px">
                {{ room.equipment.join(', ') }}
              </div>
            </div>
          </div>
          <button mat-icon-button color="warn" (click)="removeRoom(room._id!)" title="Supprimer">
            <mat-icon>delete_outline</mat-icon>
          </button>
        </div>
      </div>
    </div>
  `
})
export class AdminFacilityComponent implements OnInit {
  infoForm: FormGroup;
  roomForm: FormGroup;
  rooms: Room[] = [];
  saving = false;
  saveOk = false;

  constructor(private fb: FormBuilder, private facilitySvc: FacilityService) {
    this.infoForm = this.fb.group({
      name: ['', Validators.required],
      address: [''],
      contactPhone: [''],
      contactEmail: ['', Validators.email],
      openingHours: ['']
    });
    this.roomForm = this.fb.group({
      roomName: ['', Validators.required],
      equipment: ['']
    });
  }

  ngOnInit(): void {
    this.facilitySvc.get().subscribe({
      next: res => {
        const f: Facility = res.facility;
        if (f) {
          this.infoForm.patchValue({
            name: f.name, address: f.address,
            contactPhone: f.contactPhone, contactEmail: f.contactEmail,
            openingHours: f.openingHours
          });
          this.rooms = f.rooms ?? [];
        }
      }
    });
  }

  saveInfo(): void {
    if (this.infoForm.invalid) return;
    this.saving = true;
    this.saveOk = false;
    this.facilitySvc.upsert(this.infoForm.value).subscribe({
      next: () => { this.saving = false; this.saveOk = true; },
      error: () => { this.saving = false; }
    });
  }

  addRoom(): void {
    if (this.roomForm.invalid) return;
    const { roomName, equipment } = this.roomForm.value;
    const eqArr: string[] = equipment ? equipment.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    this.facilitySvc.addRoom(roomName, eqArr).subscribe({
      next: (res: any) => { this.rooms = res.facility?.rooms ?? this.rooms; this.roomForm.reset(); }
    });
  }

  removeRoom(id: string): void {
    if (!confirm('Supprimer cette salle ?')) return;
    this.facilitySvc.removeRoom(id).subscribe({
      next: (res: any) => { this.rooms = res.facility?.rooms ?? this.rooms.filter(r => r._id !== id); }
    });
  }
}
