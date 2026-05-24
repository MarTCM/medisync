/**
 * Intercepteur HTTP de gestion globale des erreurs.
 *
 * - En cas de réponse 401 (token expiré ou invalide), purge la session locale et redirige vers /login.
 * - Relaie toutes les autres erreurs au composant appelant via throwError.
 * - Branché après authInterceptor dans app.config.ts.
 */
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { TokenStorage } from '../utils/token-storage';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  return next(req).pipe(
    catchError(err => {
      if (err.status === 401) {
        TokenStorage.remove();
        router.navigate(['/login']);
      }
      return throwError(() => err);
    })
  );
};
