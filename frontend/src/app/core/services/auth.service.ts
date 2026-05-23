import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Account, AuthResponse } from '../models';
import { TokenStorage } from '../utils/token-storage';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = `${environment.apiUrl}/auth`;

  private _currentUser$ = new BehaviorSubject<Account | null>(
    TokenStorage.getUser<Account>()
  );
  readonly currentUser$ = this._currentUser$.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  get currentUser(): Account | null {
    return this._currentUser$.value;
  }

  hasRole(...roles: string[]): boolean {
    return !!this.currentUser && roles.includes(this.currentUser.role);
  }

  login(identifier: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.api}/login`, { identifier, password }).pipe(
      tap(res => {
        if (res.token && res.account) {
          this.storeSession(res.token, res.account);
        }
      })
    );
  }

  register(payload: {
    email?: string;
    socialSecurityNumber?: string;
    password: string;
    role: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
  }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.api}/register`, payload).pipe(
      tap(res => {
        if (res.token && res.account) {
          this.storeSession(res.token, res.account);
        }
      })
    );
  }

  googleLogin(idToken: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.api}/google`, { idToken }).pipe(
      tap(res => {
        if (res.token && res.account) {
          this.storeSession(res.token, res.account);
        }
      })
    );
  }

  verify2FA(tempToken: string, code: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.api}/2fa/verify`, { tempToken, code }).pipe(
      tap(res => {
        if (res.token && res.account) {
          this.storeSession(res.token, res.account);
        }
      })
    );
  }

  getMe(): Observable<{ profile: any }> {
    return this.http.get<{ profile: any }>(`${this.api}/me`);
  }

  updatePatientProfile(payload: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    phoneNumber?: string;
    socialSecurityNumber?: string;
  }): Observable<{ profile: any }> {
    return this.http.patch<{ profile: any }>(`${this.api}/me`, payload);
  }

  completeProfile(payload: {
    socialSecurityNumber: string;
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    phoneNumber?: string;
  }): Observable<{ account: Account; profile: any }> {
    return this.http.post<{ account: Account; profile: any }>(
      `${this.api}/complete-profile`,
      payload
    ).pipe(
      tap(res => {
        if (res.account) {
          TokenStorage.saveUser(res.account);
          this._currentUser$.next(res.account);
        }
      })
    );
  }

  setup2FA(): Observable<{ qrCode: string; otpauthUrl: string }> {
    return this.http.post<{ qrCode: string; otpauthUrl: string }>(`${this.api}/2fa/setup`, {});
  }

  confirmSetup2FA(code: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/2fa/confirm-setup`, { code });
  }

  disable2FA(code: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/2fa/disable`, { code });
  }

  logout(): void {
    TokenStorage.remove();
    this._currentUser$.next(null);
    this.router.navigate(['/login']);
  }

  private storeSession(token: string, account: Account): void {
    TokenStorage.save(token);
    TokenStorage.saveUser(account);
    this._currentUser$.next(account);
  }
}
