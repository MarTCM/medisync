import { HttpInterceptorFn } from '@angular/common/http';
import { TokenStorage } from '../utils/token-storage';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = TokenStorage.get();
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
};
