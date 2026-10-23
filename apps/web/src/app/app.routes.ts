import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { ShellComponent } from './shell/shell.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component').then((module) => module.LoginComponent),
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'today' },
      {
        path: 'today',
        loadComponent: () =>
          import('./features/today/today.component').then((module) => module.TodayComponent),
      },
      {
        path: 'search',
        loadComponent: () => import('./features/search/search.component').then((module) => module.SearchComponent),
      },
      {
        path: 'inbox',
        loadComponent: () =>
          import('./features/inbox/inbox.component').then((module) => module.InboxComponent),
      },
      {
        path: 'entries/:id',
        loadComponent: () =>
          import('./features/entries/entry-detail.component').then(
            (module) => module.EntryDetailComponent,
          ),
      },
      {
        path: 'projects',
        loadComponent: () =>
          import('./features/projects/projects.component').then(
            (module) => module.ProjectsComponent,
          ),
      },
      {
        path: 'projects/:projectId/tasks',
        loadComponent: () =>
          import('./features/tasks/task-list.component').then((module) => module.TaskListComponent),
      },
      {
        path: 'projects/:projectId/overview',
        data: { mode: 'overview' },
        loadComponent: () => import('./features/projects/project-context.component').then((module) => module.ProjectContextComponent),
      },
      {
        path: 'projects/:projectId/history',
        data: { mode: 'history' },
        loadComponent: () =>
          import('./features/projects/project-context.component').then(
            (module) => module.ProjectContextComponent,
          ),
      },
      {
        path: 'projects/:projectId/decisions',
        data: { mode: 'decisions' },
        loadComponent: () =>
          import('./features/projects/project-context.component').then(
            (module) => module.ProjectContextComponent,
          ),
      },
      {
        path: 'projects/:projectId/evidence',
        data: { mode: 'evidence' },
        loadComponent: () =>
          import('./features/projects/project-context.component').then(
            (module) => module.ProjectContextComponent,
          ),
      },
      {
        path: 'projects/:projectId/people',
        data: { mode: 'people' },
        loadComponent: () =>
          import('./features/projects/project-context.component').then(
            (module) => module.ProjectContextComponent,
          ),
      },
      {
        path: 'tasks/:id',
        loadComponent: () =>
          import('./features/tasks/task-detail.component').then(
            (module) => module.TaskDetailComponent,
          ),
      },
      {
        path: 'people',
        loadComponent: () =>
          import('./features/people/people.component').then((module) => module.PeopleComponent),
      },
      {
        path: 'people/:id',
        loadComponent: () =>
          import('./features/people/people.component').then((module) => module.PeopleComponent),
      },
      {
        path: 'settings/profile',
        loadComponent: () =>
          import('./features/settings/profile.component').then((module) => module.ProfileComponent),
      },
      {
        path: 'settings/data',
        loadComponent: () => import('./features/settings/data-management.component').then((module) => module.DataManagementComponent),
      },
      {
        path: 'settings/processing',
        loadComponent: () => import('./features/settings/data-management.component').then((module) => module.DataManagementComponent),
      },
      {
        path: 'check-ins/:date',
        loadComponent: () =>
          import('./features/today/today.component').then((module) => module.TodayComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'today' },
];
