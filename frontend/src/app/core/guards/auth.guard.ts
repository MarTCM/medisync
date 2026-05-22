import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenStorage } from '../utils/token-storage';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  if (TokenStorage.get()) return true;
  return router.createUrlTree(['/login']);
};
