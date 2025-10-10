import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/MainLayoutComponent/main-layout.component';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/users/login/login.component').then(
        (m) => m.LoginComponent
      ),
    pathMatch: 'full',
  },
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboards/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
      },
      {
        path: 'dashboard-hds',
        loadComponent: () =>
          import('./features/dashboards/hds/hds.component').then(
            (m) => m.HdsComponent
          ),
      },
    ],
  },
];
