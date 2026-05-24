/**
 * Configuration globale de l'application Angular (bootstrap providers).
 *
 * - Enregistre le router (lazy loading via app.routes), le client HTTP avec ses intercepteurs (auth + erreur)
 *   et le module d'animations Angular Material.
 * - Définit la locale française : registerLocaleData(localeFr) + LOCALE_ID 'fr'
 *   (indispensable pour DatePipe et l'affichage correct des dates dans toutes les vues).
 * - Enregistre globalement Chart.js (utilisé par le tableau de bord analytique de l'admin).
 */
import { ApplicationConfig, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { Chart, registerables } from 'chart.js';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';

Chart.register(...registerables);
registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    provideAnimations(),
    { provide: LOCALE_ID, useValue: 'fr' }
  ]
};
