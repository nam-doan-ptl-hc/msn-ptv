import { Component, inject, Input, OnInit, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../../services/AuthService';
import { DashboardService } from '../../../../../services/dashboar.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { initCharts } from '../../../../shared/constants';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { Utils } from '../../../../utils/utils';

@Component({
  selector: 'hds-detail',
  standalone: true,
  imports: [
    CommonModule,
    BaseChartDirective,
    MatDatepickerModule,
    MatNativeDateModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
  ],
  templateUrl: './hds-detail.component.html',
  styleUrls: ['./hds-detail.component.scss'],
})
export class HdsDetailComponent implements OnInit {
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private dashboardService = inject(DashboardService);
  private snackBar = inject(MatSnackBar);
  public Utils = Utils;
  @Input() chartDetail: any;
  isBrowser = false;
  isLoading = false;
  dataSource = [
    {
      value: '90-90',
      date: '2025-09-03',
      type: true,
    },
    {
      value: '46-123',
      date: '2025-08-10',
      type: true,
    },
  ];
  displayedColumns: string[] = ['value', 'date', 'type'];
  labels: string[] = initCharts.monthNames;
  ngOnInit(): void {
    if (this.isBrowser && !this.auth.isLoggedIn()) {
      this.router.navigate(['/']);
    }
    console.log('detailData in ngOnInit:', this.chartDetail);
  }
}
