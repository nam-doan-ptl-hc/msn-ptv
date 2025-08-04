import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MatIconModule],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class App {
  constructor() {
    console.log('App constructor - isBrowser:', typeof window !== 'undefined');
  }
  protected readonly title = signal('msn-ptv');
}
