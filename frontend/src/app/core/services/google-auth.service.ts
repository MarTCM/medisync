import { Injectable, NgZone } from '@angular/core';
import { environment } from '../../../environments/environment';

declare const google: any;

export interface GoogleCredentialResponse {
  credential: string;
}

@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  private initialized = false;

  constructor(private ngZone: NgZone) {}

  renderButton(
    container: HTMLElement,
    onCredential: (idToken: string) => void,
    text: 'signin_with' | 'signup_with' = 'signin_with'
  ): void {
    this.waitForGoogle()
      .then(() => {
        const callback = (res: GoogleCredentialResponse) =>
          this.ngZone.run(() => onCredential(res.credential));

        google.accounts.id.initialize({
          client_id: environment.googleClientId,
          callback
        });
        this.initialized = true;
        google.accounts.id.renderButton(container, {
          theme: 'outline',
          size: 'large',
          text,
          shape: 'rectangular',
          logo_alignment: 'center',
          width: container.clientWidth || 320
        });
      })
      .catch(() => {});
  }

  private waitForGoogle(maxWaitMs = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const tick = () => {
        if (typeof google !== 'undefined' && google?.accounts?.id) return resolve();
        if (Date.now() - start > maxWaitMs) return reject(new Error('Google Identity Services failed to load'));
        setTimeout(tick, 100);
      };
      tick();
    });
  }
}
