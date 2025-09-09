import {
  AfterViewInit,
  Component,
  inject,
  Input,
  OnChanges,
  OnInit,
  PLATFORM_ID,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
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
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
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
export class HdsDetailComponent implements OnInit, AfterViewInit, OnChanges {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @Input() changeViewDetail!: (group_type: string, item: any) => void;
  @Input() chartDetail: any;
  @Input() group_type: any;
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private dashboardService = inject(DashboardService);
  private snackBar = inject(MatSnackBar);

  public Utils = Utils;

  isBrowser = false;
  isLoading = false;

  dataSource = new MatTableDataSource<any>([]);

  columnNames: string[] = [
    'Monthly Min - Max bpm',
    'Measurement Date',
    'View Entire Month',
  ];
  totalRecords = 0;
  pageSize = 10;

  displayedColumns: string[] = ['value', 'date', 'type'];
  labels: string[] = initCharts.monthNames;

  private mapMinMax(datas: any): any[] {
    if (!datas?.length) return [];
    return datas.map((d: any) => {
      const min = Math.min(...d.y);
      const max = Math.max(...d.y);
      return {
        value: `${min}-${max}`,
        date: d.date,
      };
    });
  }
  private mapDatas(datas: any): any[] {
    if (!datas?.length) return [];
    return datas.map((d: any) => {
      return {
        value: d.y,
        date: d.date,
      };
    });
  }
  private updateTableData() {
    if (!this.chartDetail) return;

    const mappedData = Utils.inArray(
      this.chartDetail.sample_type,
      initCharts.minMaxCharts
    )
      ? this.mapMinMax(this.chartDetail.dataCharts[0].dataOrigin)
      : this.mapDatas(this.chartDetail.dataCharts[0].dataOrigin);

    this.dataSource = new MatTableDataSource<any>(mappedData);
    this.totalRecords = mappedData.length;

    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
  }
  ngOnInit(): void {
    if (this.isBrowser && !this.auth.isLoggedIn()) {
      this.router.navigate(['/']);
    }
    this.updateTableData();
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['chartDetail'] && !changes['chartDetail'].firstChange) {
      this.updateTableData();
    }
  }
  callChangeView(item: any) {
    const group_type = 'days';
    console.log('this.group_type:', this.group_type);
    console.log('item:', item);
    if (this.changeViewDetail) {
      this.changeViewDetail(group_type, this.chartDetail);
    }
  }
  ngAfterViewInit(): void {
    // Đảm bảo paginator được gán nếu dataSource thay đổi
    this.dataSource.paginator = this.paginator;
  }
}
