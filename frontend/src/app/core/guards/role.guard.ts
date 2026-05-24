/**
 * Guard roleGuard — contrôle d'accès basé sur le rôle (RBAC côté frontend).
 *
 * - Lit la liste autorisée depuis route.data.roles (ex : ['patient'] sur /patient).
 * - Compare au rôle du compte connecté (AuthService.hasRole).
 * - Utilisé en canMatch pour empêcher le chargement même paresseux d'un portail interdit ;
 *   redirige vers /login en cas d'échec.
 */
import { inject } from '@angular/core';
import { CanMatchFn, Route, Router, UrlSegment } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanMatchFn = (route: Route, _segments: UrlSegment[]) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const allowedRoles: string[] = route.data?.['roles'] ?? [];
  if (auth.hasRole(...allowedRoles)) return true;
  return router.createUrlTree(['/login']);
};
