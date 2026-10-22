import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { ShellComponent } from './shell/shell.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then((module) => module.LoginComponent),
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'today' },
      {
        path: 'today',
        loadComponent: () => import('./features/today/today.component').then((module) => module.TodayComponent),
      },
      {
        path: 'settings/profile',
        loadComponent: () =>
          import('./features/settings/profile.component').then((module) => module.ProfileComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'today' },
];
