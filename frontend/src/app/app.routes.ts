import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: '2fa',
    loadComponent: () => import('./features/auth/two-factor/two-factor.component').then(m => m.TwoFactorComponent)
  },

  // Patient portal
  {
    path: 'patient',
    canActivate: [authGuard],
    canMatch: [roleGuard],
    data: { roles: ['patient'] },
    loadComponent: () => import('./features/patient/patient-shell.component').then(m => m.PatientShellComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./features/patient/dashboard/dashboard.component').then(m => m.PatientDashboardComponent) },
      { path: 'search', loadComponent: () => import('./features/patient/search-doctors/search-doctors.component').then(m => m.SearchDoctorsComponent) },
      { path: 'book', loadComponent: () => import('./features/patient/book-appointment/book-appointment.component').then(m => m.BookAppointmentComponent) },
      { path: 'appointments', loadComponent: () => import('./features/patient/my-appointments/my-appointments.component').then(m => m.MyAppointmentsComponent) },
      { path: 'record', loadComponent: () => import('./features/patient/my-record/my-record.component').then(m => m.MyRecordComponent) },
      { path: 'invoices', loadComponent: () => import('./features/patient/my-invoices/my-invoices.component').then(m => m.MyInvoicesComponent) },
      { path: 'review', loadComponent: () => import('./features/patient/leave-review/leave-review.component').then(m => m.LeaveReviewComponent) }
    ]
  },

  // Doctor portal
  {
    path: 'doctor',
    canActivate: [authGuard],
    canMatch: [roleGuard],
    data: { roles: ['medecin'] },
    loadComponent: () => import('./features/practitioner/practitioner-shell.component').then(m => m.PractitionerShellComponent),
    children: [
      { path: '', redirectTo: 'calendar', pathMatch: 'full' },
      { path: 'calendar', loadComponent: () => import('./features/practitioner/calendar/calendar.component').then(m => m.DoctorCalendarComponent) },
      { path: 'leaves', loadComponent: () => import('./features/practitioner/leaves/leaves.component').then(m => m.LeavesComponent) }
    ]
  },

  // Secretary portal
  {
    path: 'secretary',
    canActivate: [authGuard],
    canMatch: [roleGuard],
    data: { roles: ['secretaire'] },
    loadComponent: () => import('./features/secretary/secretary-shell.component').then(m => m.SecretaryShellComponent),
    children: [
      { path: '', redirectTo: 'schedule', pathMatch: 'full' },
      { path: 'schedule', loadComponent: () => import('./features/secretary/schedule/schedule.component').then(m => m.SecretaryScheduleComponent) },
      { path: 'patients', loadComponent: () => import('./features/secretary/patients/patients.component').then(m => m.SecretaryPatientsComponent) },
      { path: 'invoices', loadComponent: () => import('./features/secretary/invoices/invoices.component').then(m => m.SecretaryInvoicesComponent) }
    ]
  },

  // Admin portal
  {
    path: 'admin',
    canActivate: [authGuard],
    canMatch: [roleGuard],
    data: { roles: ['administrateur'] },
    loadComponent: () => import('./features/admin/admin-shell.component').then(m => m.AdminShellComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./features/admin/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent) },
      { path: 'staff', loadComponent: () => import('./features/admin/staff/staff.component').then(m => m.AdminStaffComponent) },
      { path: 'facility', loadComponent: () => import('./features/admin/facility/facility.component').then(m => m.AdminFacilityComponent) },
      { path: 'analytics', loadComponent: () => import('./features/admin/analytics/analytics.component').then(m => m.AdminAnalyticsComponent) },
      { path: 'audit', loadComponent: () => import('./features/admin/audit-log/audit-log.component').then(m => m.AuditLogComponent) },
      { path: '2fa', loadComponent: () => import('./features/admin/two-factor-setup/two-factor-setup.component').then(m => m.TwoFactorSetupComponent) }
    ]
  },

  { path: '**', redirectTo: 'login' }
];
