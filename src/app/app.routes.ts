import { Routes } from '@angular/router';
import { LoginComponent } from './features/users/login/login.component';

export const routes: Routes = [
  {
    path: '',
    component: LoginComponent,
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboards/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent
      ),
  },
];
