/**
 * Intercepteur HTTP qui injecte le jeton JWT dans l'en-tête Authorization.
 *
 * - Lit le jeton via TokenStorage à chaque requête sortante.
 * - Ajoute "Authorization: Bearer <token>" si présent, n'altère pas les requêtes anonymes (login, register).
 * - Branché globalement dans app.config.ts via provideHttpClient(withInterceptors(...)).
 */
import { HttpInterceptorFn } from '@angular/common/http';
import { TokenStorage } from '../utils/token-storage';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = TokenStorage.get();
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
};
