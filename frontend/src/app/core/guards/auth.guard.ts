import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenStorage } from '../utils/token-storage';
import { Account } from '../models';

export const authGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  if (!TokenStorage.get()) return router.createUrlTree(['/login']);

  // Patients with an incomplete profile (e.g. signed up via Google OAuth and
  // haven't filled their social security number yet) must complete it first.
  const user = TokenStorage.getUser<Account>();
  if (user?.role === 'patient' && user.profileCompleted === false) {
    if (route.routeConfig?.path !== 'complete-profile') {
      return router.createUrlTree(['/complete-profile']);
    }
  }

  return true;
};
