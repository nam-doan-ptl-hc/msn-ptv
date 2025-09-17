import {
  AfterViewInit,
  ChangeDetectorRef,
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
import { CommonModule, DatePipe } from '@angular/common';
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
  @Input() changeViewDetail!: (
    group_type: string,
    item: any,
    dateFrom: string,
    dateTo: string
  ) => void;
  @Input() chartDetail: any;
  @Input() group_type: any;
  @Input() breadcrumbs: any;
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private dashboardService = inject(DashboardService);
  private snackBar = inject(MatSnackBar);

  public Utils = Utils;
  constructor(private datePipe: DatePipe, private cdr: ChangeDetectorRef) {}
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
  groupType = 'days';
  displayedColumns: string[] = ['value', 'date', 'type'];
  labels: string[] = initCharts.monthNames;
  calcAverage(datas: { x: string; y: number | null; date: string }[]): number {
    if (!datas || datas.length === 0) return 0;

    const valid = datas.filter((d) => d.y !== null && d.y !== undefined);
    if (valid.length === 0) return 0;

    const sum = valid.reduce((acc, d) => acc + (d.y as number), 0);
    return Utils.roundDecimals(sum / valid.length, 1);
  }
  public getValueAvg(): string {
    if (Utils.inArray(this.chartDetail.sample_type, initCharts.minMaxCharts)) {
      const validData = this.chartDetail.dataCharts[0].data.flatMap(
        (d: any, idx: any) => {
          if (Array.isArray(d.y)) {
            return d.y.map((yy: any) => ({
              x: d.x,
              y: yy,
              date: d.date,
              idx,
            }));
          } else if (typeof d.y === 'number') {
            return [
              {
                x: d.x,
                y: d.y,
                date: d.date,
                idx,
              },
            ];
          }
          return []; // fallback nếu null/undefined
        }
      );
      const minY = Math.min(...validData.map((d: any) => d.y));
      const maxY = Math.max(...validData.map((d: any) => d.y));
      if (minY === maxY) return minY.toString();
      return `${minY}-${maxY}`;
    } else {
      return this.calcAverage(this.chartDetail.dataCharts[0].data).toString();
    }
  }
  public getNameBreadcrumb(item: any): string {
    let result = 'Custom View',
      nameColum1 = 'Daily',
      nameColum3 = 'View Entire Day';
    const value = item.params.group_type;
    if (value === 'months') {
      result = 'Yearly View';
      nameColum1 = 'Monthly';
      nameColum3 = 'View Entire Month';
      this.groupType = 'month';
    } else if (value === 'days' && item.textPickDate !== 'customDate') {
      if (item.textPickDate === 'thisWeek') {
        result = 'Weekly View';
      } else {
        result = 'Monthly View';
      }
      nameColum1 = 'Daily';
      nameColum3 = 'View Entire Daily';
      this.groupType = 'hour';
    } else if (value === 'hour') {
      result = 'Daily View';
      nameColum1 = '';
      nameColum3 = 'View Entire Hour';
      this.groupType = 'minutes';
    } else if (value === 'minutes') {
      result = 'Hour View';
      nameColum1 = '';
      nameColum3 = 'Source';
      this.groupType = 'seconds';
    }
    this.columnNames[0] =
      nameColum1 +
      ' ' +
      this.chartDetail.items[0].snapshot_value_type +
      ' ' +
      this.chartDetail.items[0].primary_unit;
    this.columnNames[2] = nameColum3;
    return result;
  }
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
  formatDate(date: Date): string {
    return this.datePipe.transform(date, 'MM/dd/yyyy') || '';
  }
  formatValueChart(value: any): number | any {
    if (typeof value === 'number' && !isNaN(value)) {
      return Utils.roundDecimals(value, 1);
    }
    return value;
  }
  getMonthRangeLocal(dateStr: string): { start: string; end: string } {
    const m = /^(\d{4})-(\d{1,2})/.exec(dateStr);
    if (!m) throw new Error('Invalid date string, expected YYYY-MM-DD');

    const year = Number(m[1]);
    const month = Number(m[2]); // 1..12

    const start = new Date(year, month - 1, 1); // local 00:00
    const end = new Date(year, month, 0); // local last day of month

    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;

    return { start: fmt(start), end: fmt(end) };
  }
  callChangeView(item: any) {
    console.log('this.group_type:', this.groupType);
    console.log('item:', item);
    let dateFrom: string = '';
    let dateTo: string = '';
    if (this.groupType === 'month') {
      const monthRange = this.getMonthRangeLocal(item.date);
      dateFrom = monthRange.start + ' 00:00:00';
      dateTo = monthRange.end + ' 23:59:59';
      this.groupType = 'days';
    } else if (this.groupType === 'days') {
      dateFrom = this.formatDate(item.date) + ' 00:00:00';
      dateTo = this.formatDate(item.date) + ' 23:59:59';
    } else if (this.groupType === 'hour') {
      dateFrom = this.formatDate(item.date) + ' 00:00:00';
      dateTo = this.formatDate(item.date) + ' 23:59:59';
    }
    if (this.changeViewDetail) {
      // Clone sâu chartDetail để tránh thay đổi tham chiếu
      const clonedDetail = JSON.parse(JSON.stringify(this.chartDetail));

      this.changeViewDetail(this.groupType, clonedDetail, dateFrom, dateTo);
    }
  }
  changeViewInBreadcrumb(item: any, index: number) {
    this.breadcrumbs = this.breadcrumbs.slice(0, index + 1);
    this.chartDetail = item;
    this.updateTableData();
  }
  ngAfterViewInit(): void {
    // Đảm bảo paginator được gán nếu dataSource thay đổi
    this.dataSource.paginator = this.paginator;
  }
}
