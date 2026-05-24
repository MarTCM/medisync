/**
 * Composant AuditLogComponent — consultation du journal d'audit (administrateur).
 *
 * - Liste paginée des actions sensibles (CONNEXION, ACCES_DOSSIER, etc.) via AdminService.listAudit(page, limit).
 * - Réponse à déballer : { logs, pagination: { total, ... } }.
 */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AdminService } from '../../../core/services/admin.service';

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2>Journal d'audit</h2>
          <div class="page-subtitle">Traçabilité de toutes les actions sensibles · RGPD</div>
        </div>
        <span class="tag tag-primary" style="height:fit-content;align-self:center">
          {{ total }} entrée{{ total > 1 ? 's' : '' }}
        </span>
      </div>

      <div *ngIf="loading" style="text-align:center;padding:48px;color:var(--text-muted)">Chargement…</div>

      <div *ngIf="!loading && logs.length === 0" class="empty-state">
        <mat-icon>fact_check</mat-icon>
        <div class="empty-title">Aucune entrée</div>
        <p>Le journal d'audit est vide pour le moment</p>
      </div>

      <div class="data-table" *ngIf="!loading && logs.length > 0">
        <table>
          <thead>
            <tr>
              <th>Date & heure</th>
              <th>Action</th>
              <th>Utilisateur</th>
              <th>IP</th>
              <th>Détails</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let l of logs">
              <td style="white-space:nowrap;color:var(--text-muted)">
                {{ l.createdAt | date:'d MMM y HH:mm:ss':'':'fr' }}
              </td>
              <td><span class="tag" [class]="actionClass(l.action)">{{ l.action }}</span></td>
              <td>
                <ng-container *ngIf="isObj(l.userAccount)">
                  <div style="font-weight:500">{{ l.userAccount.email }}</div>
                  <div style="font-size:11px;color:var(--text-muted);text-transform:capitalize">{{ l.userAccount.role }}</div>
                </ng-container>
              </td>
              <td style="font-family:monospace;font-size:12px;color:var(--text-muted)">{{ l.ipAddress }}</td>
              <td style="font-size:12.5px;color:var(--text-secondary);max-width:280px">{{ l.details }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="total > limit" style="display:flex;gap:12px;justify-content:center;align-items:center;margin-top:24px">
        <button mat-stroked-button [disabled]="page === 1" (click)="prev()">
          <mat-icon>chevron_left</mat-icon> Précédent
        </button>
        <span style="font-size:13px;color:var(--text-muted)">Page {{ page }} / {{ totalPages }}</span>
        <button mat-stroked-button [disabled]="page >= totalPages" (click)="next()">
          Suivant <mat-icon>chevron_right</mat-icon>
        </button>
      </div>
    </div>
  `
})
export class AuditLogComponent implements OnInit {
  logs: any[] = [];
  loading = false;
  page = 1;
  limit = 20;
  total = 0;

  get totalPages(): number { return Math.ceil(this.total / this.limit); }

  constructor(private adminSvc: AdminService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.adminSvc.listAudit(this.page, this.limit).subscribe({
      next: res => { this.logs = res.logs; this.total = res.pagination?.total ?? res.logs.length; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  prev(): void { if (this.page > 1) { this.page--; this.load(); } }
  next(): void { if (this.page < this.totalPages) { this.page++; this.load(); } }

  actionClass(action: string): string {
    if (action?.includes('CONNEXION')) return 'tag-primary';
    if (action?.includes('CREATION')) return 'tag-success';
    if (action?.includes('MODIFICATION') || action?.includes('MODIF')) return 'tag-warn';
    if (action?.includes('SUPPRESSION') || action?.includes('DELETE')) return 'tag-danger';
    return '';
  }

  isObj(d: any): boolean { return d && typeof d === 'object'; }
}
