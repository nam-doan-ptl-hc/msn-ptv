import { Component } from '@angular/core';
import {HeaderComponent} from '../../../layout/header/header.component';

@Component({
  selector: 'dashboard',
  standalone: true,
  imports: [HeaderComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})

export class DashboardComponent {

}
