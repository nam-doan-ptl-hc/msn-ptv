import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './main.config';

bootstrapApplication(App, appConfig).catch((err) =>
  console.error('Lỗi bootstrap app:', err)
);
