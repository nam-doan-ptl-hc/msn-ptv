import {
  Component,
  OnInit,
  inject,
  PLATFORM_ID,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../services/AuthService';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, registerables } from 'chart.js';
import { DashboardService } from '../../../../services/dashboar.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Utils } from '../../../utils/utils';
import { initCharts } from '../../../shared/constants';
import 'chartjs-adapter-date-fns';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { DatePipe } from '@angular/common';
import {
  catchError,
  combineLatest,
  firstValueFrom,
  forkJoin,
  map,
  Observable,
  of,
  tap,
} from 'rxjs';
import {
  minMaxLabelPlugin,
  crosshairLine,
} from '../../../../plugins/chart-plugins';
import { HdsDetailComponent } from './hds-detail/hds-detail.component';
import { HdsDataViewComponent } from './hds-data-view/hds-data-view.component';
import { UserService } from '../../../../services/user.service';

Chart.register(...registerables, minMaxLabelPlugin, crosshairLine);
type DataPoint = {
  x: string | number;
  y?: number | null;
  value?: number[]; // nếu API trả mảng
  date?: any;
};

type NormalizedPoint = {
  x: string | number; // dùng index để ChartJS vẽ đúng
  xLabel?: string; // hiển thị tooltip hoặc nhãn
  y: number | null;
  date?: any;
};
@Component({
  selector: 'hds',
  standalone: true,
  imports: [
    CommonModule,
    BaseChartDirective,
    MatDatepickerModule,
    MatNativeDateModule,
    ReactiveFormsModule,
    HdsDetailComponent,
    HdsDataViewComponent,
  ],
  templateUrl: './hds.component.html',
  providers: [DatePipe],
  styleUrls: ['./hds.component.scss'],
})
export class HdsComponent implements OnInit {
  private userService = inject(UserService);
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private dashboardService = inject(DashboardService);
  private snackBar = inject(MatSnackBar);
  constructor(private datePipe: DatePipe, private cdr: ChangeDetectorRef) {}
  id1!: string;
  id2!: string;
  id3!: string;
  user: any = {};
  isBrowser = false;
  isChangeViewDetail = false;
  isViewChart = true;
  labels: string[] = initCharts.monthNames;

  dataSnapshots: any[] = [];
  breadcrumbs: any[] = [];
  chartDetail: any = null;
  sampleTypes: any[] = [];
  charts: any[] = [];
  range = new FormGroup({
    start: new FormControl<Date | null>(null),
    end: new FormControl<Date | null>(null),
  });
  textBtn: string = '';
  textPickDate = 'today';
  params = {
    dateFrom: '',
    dateTo: '',
    group_type: 'hour',
  };

  showHeightInch = Utils.convertUnit.showHeightInch;
  getNameAccount() {
    return (
      (!Utils.isEmpty(this.user.first_name) ? this.user.first_name + ' ' : '') +
      (!Utils.isEmpty(this.user.last_name) ? this.user.last_name : '')
    );
  }
  formatDate(date: Date): string {
    return this.datePipe.transform(date, 'MM/dd/yyyy') || '';
  }
  refresh(): void {
    if (this.params.dateFrom && this.params.dateTo) {
      const textPickDate = this.textPickDate;
      if (textPickDate === 'customDate') {
        this.loadData(6, {
          dateFrom: this.params.dateFrom,
          dateTo: this.params.dateTo,
        });
      } else if (textPickDate === 'today') this.pickDate(1);
      else if (textPickDate === 'thisWeek') this.pickDate(2);
      else if (textPickDate === 'thisMonth') this.pickDate(3);
      else if (textPickDate === 'last30days') this.pickDate(4);
      else if (textPickDate === 'thisYear') this.pickDate(5);
    } else {
      this.loadData();
    }
  }
  ngOnInit(): void {
    if (this.isBrowser && !this.auth.isLoggedIn()) {
      this.router.navigate(['/']);
      return;
    }

    combineLatest([this.userService.userInfo$, this.route.paramMap]).subscribe(
      ([user, params]) => {
        this.user = user || {};
        this.id1 = params.get('id1') || '';
        this.id2 = params.get('id2') || '';
        this.id3 = params.get('id3') || '';
        console.log({ id1: this.id1, id2: this.id2, id3: this.id3 });
        this.refresh();
      }
    );
    // Khởi tạo dữ liệu mặc định (chỉ chạy khi browser)
    if (this.isBrowser) {
      const today = new Date();
      this.params.dateFrom = this.formatDate(today) + ' 00:00:00';
      this.params.dateTo = this.formatDate(today) + ' 23:59:59';
      this.textBtn = Utils.getDateString(today, 'M d, yyyy');
    }

    // Lắng nghe thay đổi range date
    this.range.valueChanges.subscribe((value) => {
      if (value.start && value.end) {
        this.params.dateFrom = this.formatDate(value.start) + ' 00:00:00';
        this.params.dateTo = this.formatDate(value.end) + ' 23:59:59';
        this.textBtn =
          Utils.getDateString(this.params.dateFrom, 'M d, yyyy') +
          ' - ' +
          Utils.getDateString(this.params.dateTo, 'M d, yyyy');
        this.params.group_type = 'days';
        this.textPickDate = 'customDate';
        this.pickDate(0);
      }
    });
  }
  public closeDetail(): void {
    this.chartDetail = null;
    const textPickDate = this.breadcrumbs[0].textPickDate;
    this.breadcrumbs = [];
    if (textPickDate === 'customDate') {
      this.loadData(6, {
        dateFrom: this.params.dateFrom,
        dateTo: this.params.dateTo,
      });
    } else if (textPickDate === 'today') this.pickDate(1);
    else if (textPickDate === 'thisWeek') this.pickDate(2);
    else if (textPickDate === 'thisMonth') this.pickDate(3);
    else if (textPickDate === 'last30days') this.pickDate(4);
    else if (textPickDate === 'thisYear') this.pickDate(5);
  }

  public changeView = (): void => {
    if (this.isViewChart && !Utils.isEmpty(this.chartDetail)) {
      this.closeDetail();
    }
    this.isViewChart = !this.isViewChart;
  };

  public fncDetailChart = async (
    item: any,
    isSnapShot: boolean = false
  ): Promise<void> => {
    let clonedItem = JSON.parse(JSON.stringify(item));
    if (isSnapShot) {
      this.breadcrumbs = [];
      if (!Utils.isEmpty(this.chartDetail)) {
        this.chartDetail.params.group_type = this.params.group_type;
        this.isChangeViewDetail = false;
        this.isViewChart = true;
        this.chartDetail.sample_type = item;
        this.chartDetail.params.sample_type_id = item;
        const found = this.sampleTypes.find(
          (c) => c._id.sample_type_group_id === item
        );
        if (found) {
          this.chartDetail.items = found.items;
        }
        const dataTypes = Utils.getBodyTypeTopType(item);
        this.chartDetail.params.body_type = dataTypes.body_type;
        this.chartDetail.params.top_type = dataTypes.top_type;
        await this.loadChartDetail().toPromise();
        return;
      } else {
        const found = this.charts.find((c) => c.sample_type === item);
        clonedItem = JSON.parse(JSON.stringify(found));
      }
    }
    this.chartDetail = clonedItem;
    this.breadcrumbs.push(JSON.parse(JSON.stringify(clonedItem)));
    this.isViewChart = true;
  };
  private loadChartDetail(
    dateFrom?: string,
    dateTo?: string,
    group_type: string = ''
  ): Observable<void> {
    this.chartDetail.params.from = dateFrom ?? this.params.dateFrom;
    this.chartDetail.params.to = dateTo ?? this.params.dateTo;
    if (!Utils.isEmpty(group_type)) {
      this.chartDetail.params.group_type = group_type;
    }
    const apiCalls = this.getDataItemForChart(
      this.chartDetail.params,
      this.chartDetail.sample_type,
      this.chartDetail.items,
      this.chartDetail.sort_order,
      group_type
    );
    return forkJoin(apiCalls).pipe(
      tap(() => {
        this.cdr.detectChanges();
      }),
      map(() => void 0)
    );
  }
  private updateXScaleFromParams() {
    const gt = this.params.group_type;
    if (!this.xScale) this.xScale = {};

    this.xScale.type = 'linear';
    this.xScale.offset = true;
    this.xScale.bounds = 'ticks';

    if (gt === 'hour') {
      this.xScale.min = 0;
      this.xScale.max = 23;
    } else if (gt === 'days') {
      if (this.textPickDate === 'thisWeek') {
        // THIS WEEK → SUN-SAT
        this.xScale.type = 'category';
        this.xScale.labels = this.labels;
        this.xScale.min = 0;
        this.xScale.max = 6;
      } else {
        // Tháng hoặc 30 ngày
        const startDate = new Date(this.params.dateFrom);
        const endDate = new Date(this.params.dateTo);
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        this.xScale.min = 1;
        this.xScale.max = diffDays;
      }
    } else if (gt === 'months') {
      this.xScale.min = 1;
      this.xScale.max = 12;
    }

    if (!this.xScale.ticks) this.xScale.ticks = {};
    this.xScale.ticks.stepSize = 1;
  }

  private generateCurrentWeekLabels(): string[] {
    const labels: string[] = [];

    const today = new Date();
    const firstDayOfWeek = new Date(today);
    firstDayOfWeek.setDate(today.getDate() - today.getDay()); // Bắt đầu từ Chủ Nhật

    for (let i = 0; i < 7; i++) {
      const d = new Date(firstDayOfWeek);
      d.setDate(firstDayOfWeek.getDate() + i);
      labels.push(initCharts.weekDays[d.getDay()]); // SUN, MON...
    }

    return labels;
  }
  async pickDate(data: number, options: any = {}) {
    const today = new Date();
    this.charts = [];
    switch (data) {
      case 1: // TODAY
        this.params.dateFrom = this.formatDate(today) + ' 00:00:00';
        this.params.dateTo = this.formatDate(today) + ' 23:59:59';
        this.params.group_type = 'hour';
        this.textPickDate = 'today';
        break;

      case 2: // THIS WEEK
        const startOfWeek = new Date(today);
        const dayOfWeek = startOfWeek.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        startOfWeek.setDate(today.getDate() + diffToMonday);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        this.params.dateFrom = this.formatDate(startOfWeek) + ' 00:00:00';
        this.params.dateTo = this.formatDate(endOfWeek) + ' 23:59:59';
        this.params.group_type = 'days';
        this.textPickDate = 'thisWeek';
        break;

      case 3: // THIS MONTH
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          0
        );

        this.params.dateFrom = this.formatDate(startOfMonth) + ' 00:00:00';
        this.params.dateTo = this.formatDate(endOfMonth) + ' 23:59:59';
        this.params.group_type = 'days';
        this.textPickDate = 'thisMonth';
        break;

      case 4: // LAST 30 DAYS
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 29);

        this.params.dateFrom = this.formatDate(thirtyDaysAgo) + ' 00:00:00';
        this.params.dateTo = this.formatDate(today) + ' 23:59:59';
        this.params.group_type = 'days';
        this.textPickDate = 'last30days';
        break;

      case 5: // THIS YEAR
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        const endOfYear = new Date(today.getFullYear(), 11, 31);
        this.params.dateFrom = this.formatDate(startOfYear) + ' 00:00:00';
        this.params.dateTo = this.formatDate(endOfYear) + ' 23:59:59';
        this.params.group_type = 'months';
        this.textPickDate = 'thisYear';
        break;
      case 6:
        this.params.dateFrom = options.dateFrom;
        this.params.dateTo = options.dateTo;
        this.params.group_type = 'days';
        this.textPickDate = 'customDate';
        break;
    }
    this.charts = [];
    this.textBtn =
      data == 1
        ? Utils.getDateString(new Date(), 'M d, yyyy')
        : Utils.getDateString(this.params.dateFrom, 'M d, yyyy') +
          ' - ' +
          Utils.getDateString(this.params.dateTo, 'M d, yyyy');

    this.labels = this.generateXAxisLabels();
    this.updateXScaleFromParams();
    this.loadData4SnapshotCard(this.dataSnapshots);
    if (!Utils.isEmpty(this.chartDetail)) {
      this.breadcrumbs = [];
      this.chartDetail.params.group_type = this.params.group_type;
      this.isChangeViewDetail = false;
      await this.loadChartDetail().toPromise();
    } else {
      // Cập nhật tất cả biểu đồ
      try {
        await this.loadData4Charts().toPromise();
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu:', error);
      }
    }
  }

  private loadData4SnapshotCard(sample_type: any[] = []) {
    const sampleType = sample_type.map((e: any) => ({
      id: e?.id,
      last: e?.last,
    }));
    const body = {
      token: this.user.token || '',
      req_time: new Date().setHours(0, 0, 0, 0),
      from: this.params.dateFrom,
      to: this.params.dateTo,
      patient_ref: this.id2,
      sample_type: sampleType,
    };

    this.dashboardService.loadData4SnapshotCard(body).subscribe({
      next: (res) => {
        if (res.code != 0) {
          this.snackBar.open(res.msg, 'x', {
            duration: 3000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
            panelClass: ['error-snackbar'],
          });
          return;
        }
        this.dataSnapshots.forEach((item: any) => {
          const itemData = Utils.findObject(res.data, '_id', item.id);
          if (itemData.pos > -1) {
            item.value = Utils.formatValueByUnit(
              item.id,
              itemData.obj.item.value
            );
            item.unit = itemData.obj.item.unit || '';
            item.sync_date_utc = itemData.obj.item.sync_date_utc || '';
          }
          if (item.id === 'BMI') {
            const itemWeight = Utils.findObject(res.data, '_id', 'WEIGHT');
            const itemHeight = Utils.findObject(res.data, '_id', 'HEIGHT');
            if (itemWeight.pos > -1 && itemHeight.pos > -1) {
              item.sync_date_utc = itemWeight.obj.item.sync_date_utc || '';
              item.value = Utils.BMICalculator(
                itemWeight.obj.item.value,
                itemHeight.obj.item.value,
                {
                  type: 'lb-ft',
                  decimals: 2,
                }
              );
            }
          }
          item.src =
            '/assets/images/icon-sample-type/ic-' +
            item.id.toString().toLowerCase() +
            '-st.svg';
        });
      },
      error: (err) => {
        console.error('Lỗi khi tải dashboard:', err);
      },
    });
  }

  xScale: any = {
    type: 'category',
    offset: false,
    labels: this.labels,
    bounds: 'ticks',
    ticks: {
      stepSize: 1,
      autoSkip: true,
      callback: (value: any, index: number, ticks: any) => {
        // ép hiển thị tick đầu và tick cuối
        if (index === 0 || index === this.labels.length - 1) {
          return this.labels[index];
        }
        // các trường hợp khác giữ logic cũ
        if (this.textPickDate === 'last30days') {
          return this.labels[index];
        }
        if (this.textPickDate === 'thisYear') {
          return initCharts.monthNames[index];
        }
        if (this.textPickDate === 'thisWeek') {
          return this.labels[index];
        }
        if (this.params.group_type === 'hour') {
          return value;
        }
        if (this.params.group_type === 'days') {
          return this.labels[index];
        }
        return value;
      },
    },
  };

  // Tooltip hiển thị đúng theo group_type
  tooltipOpts(sample_type: string = ''): any {
    return {
      displayColors: false,
      callbacks: {
        title: () => {
          return '';
        },
        label: (context: any) => {
          const yVal = context.raw.y;

          if (sample_type === 'STEP') {
            // STEP thì vẫn format số nguyên
            return Utils.formatNumber(yVal);
          }

          // Các loại khác (HEIGHT, WEIGHT, BODY_TEMPER, BLOOD_GLUCOSE…)
          return Utils.formatValueByUnit(sample_type, yVal);
        },
      },
    };
  }
  generateXAxisLabels(
    dateFrom?: string,
    dateTo?: string,
    group_type?: string
  ): string[] {
    const groupType = !Utils.isEmpty(group_type)
      ? group_type
      : this.params.group_type;
    let labels: string[] = [],
      from = dateFrom ?? this.params.dateFrom,
      to = dateTo ?? this.params.dateTo;

    if (groupType === 'months') {
      // Hiển thị các tháng từ J đến D
      return initCharts.monthNames;
    } else if (groupType === 'days') {
      if (Utils.isEmpty(group_type) && this.textPickDate === 'thisWeek') {
        return this.generateCurrentWeekLabels();
      }
      // Hiển thị các ngày từ dateFrom đến dateTo
      const startDate = new Date(from);
      const endDate = new Date(to);

      if (from && to) {
        // LAST 30 DAYS: Hiển thị theo thứ tự tăng dần
        while (startDate <= endDate) {
          labels.push(startDate.getDate().toString()); // Lấy ngày (1, 2, ..., 30)
          startDate.setDate(startDate.getDate() + 1); // Tăng ngày lên 1
        }
      }
    } else if (groupType === 'hour') {
      // Hiển thị các giờ từ 0 đến 24
      labels = Array.from({ length: 24 }, (_, i) => `${i}`);
    } else if (groupType === 'minute') {
      labels = Array.from({ length: 60 }, (_, i) => `${i}`);
    }

    return labels;
  }
  showUnit(sample_type: string, unit: string) {
    return Utils.showUnit(sample_type, unit);
  }
  checkHasItemInChart(data: any[]) {
    return data.some((item) => item.y !== null && item.y !== undefined);
  }
  convertServerDayToClient(e: any): {
    day_of_week: number;
    day_of_month: number;
    month: number;
    year: number;
    date: Date;
    dateString: string;
  } {
    const utcDate = new Date(Date.UTC(e.year, 0, 1));
    utcDate.setUTCDate(utcDate.getUTCDate() + e.day - 1);
    const localDate = new Date(utcDate);
    return {
      day_of_week: localDate.getDay(),
      day_of_month: localDate.getDate(),
      month: localDate.getMonth() + 1,
      year: localDate.getFullYear(),
      date: localDate,
      dateString: localDate.toISOString(),
    };
  }
  mapDataToXY(
    items: any[],
    labels: string[] = this.labels
  ): { x: string | number; y: number; date?: string }[] {
    const datas: { x: string | number; y: number; date?: string }[] = [];
    const group_type = !Utils.isEmpty(this.chartDetail)
      ? this.chartDetail.params.group_type
      : this.params.group_type;
    items.forEach((e: any) => {
      const data: { x: string | number; y: number; date?: string } = {
        x: '',
        y: e.value,
      };

      if (group_type === 'months') {
        data.x = e._id.month.toString();
        data.date = `${e._id.year}-${String(e._id.month).padStart(2, '0')}-01`;
      } else if (group_type === 'days') {
        // e._id.day = day-of-year
        const baseDate = new Date(e._id.year, 0, 1); // 01-01
        const realDate = new Date(
          baseDate.getTime() + (e._id.day - 1) * 86400000
        );

        const yyyy = realDate.getFullYear();
        const mm = String(realDate.getMonth() + 1).padStart(2, '0');
        const dd = String(realDate.getDate()).padStart(2, '0');

        data.date = `${yyyy}-${mm}-${dd}`;

        if (!this.isChangeViewDetail && this.textPickDate === 'thisWeek') {
          const dow = realDate.getDay(); // 0=SUN..6=SAT
          data.x = labels[dow]; // "SUN", "MON", ...
        } else {
          data.x = dd; // hiển thị theo ngày trong tháng
        }
      } else if (group_type === 'hour') {
        data.x = e._id.hour; // 0-23

        const baseDate = new Date(e._id.year, 0, 1);
        const realDate = new Date(
          baseDate.getTime() + (e._id.day - 1) * 86400000
        );

        const yyyy = realDate.getFullYear();
        const mm = String(realDate.getMonth() + 1).padStart(2, '0');
        const dd = String(realDate.getDate()).padStart(2, '0');

        data.date = `${yyyy}-${mm}-${dd} ${String(e._id.hour).padStart(
          2,
          '0'
        )}:00`;
      }

      datas.push(data);
    });

    return datas;
  }
  private mapDataToXYForMinute(
    item: any
  ): { x: string | number; y: number; date?: string }[] {
    const datas: { x: string | number; y: number; date?: string }[] = [];

    if (!item.values) {
      return datas;
    }

    Object.keys(item.values).forEach((hourKey) => {
      Object.keys(item.values[hourKey]).forEach((minuteKey) => {
        const records = item.values[hourKey][minuteKey];

        records.forEach((r: any) => {
          const dateObj = new Date(r.ts); // tự động thành giờ client

          const yyyy = dateObj.getFullYear();
          const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
          const dd = String(dateObj.getDate()).padStart(2, '0');
          const hh = String(dateObj.getHours()).padStart(2, '0'); // giờ client
          const mi = String(dateObj.getMinutes()).padStart(2, '0'); // phút client

          datas.push({
            x: mi, // label theo phút
            y: r.v,
            date: `${yyyy}-${mm}-${dd} ${hh}:${mi}`, // full datetime client
          });
        });
      });
    });

    return datas;
  }

  private toNum(v: any): number | null {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  private normalizeDatas(
    datas: DataPoint[],
    labels: (string | number)[]
  ): NormalizedPoint[] {
    const out: NormalizedPoint[] = [];
    const index = new Map<string, { date: any; ys: number[] }>();

    const labelsAreNumeric = labels.every((lbl) => !isNaN(Number(lbl)));
    const labelsAreMonths = labels.every(
      (lbl) =>
        typeof lbl === 'string' && initCharts.monthNames.includes(lbl as string)
    );
    const labelsAreWeekdays = labels.every(
      (lbl) =>
        typeof lbl === 'string' && initCharts.weekDays.includes(lbl as string)
    );

    // gom dữ liệu
    for (const d of datas ?? []) {
      let key: string;

      if (labelsAreMonths) {
        // year view: d.x là số 1–12 (tháng)
        key = String(Number(d.x));
      } else if (labelsAreNumeric) {
        key = String(Number(d.x));
      } else if (labelsAreWeekdays) {
        key = String(d.x).toUpperCase();
      } else {
        key = String(d.x);
      }

      if (key === 'NaN') continue;
      const bucket = index.get(key) ?? { date: d.date ?? null, ys: [] };

      if (Array.isArray(d.y)) {
        for (const v of d.y) {
          const n = this.toNum(v);
          if (n !== null) bucket.ys.push(n);
        }
      } else if (d.y !== undefined && d.y !== null) {
        const ny = this.toNum(d.y);
        if (ny !== null) bucket.ys.push(ny);
      }

      if (d.date != null) bucket.date = d.date;
      index.set(key, bucket);
    }

    // duyệt theo labels để giữ đúng index hiển thị
    for (let i = 0; i < labels.length; i++) {
      const lbl = labels[i];
      let key: string;

      if (labelsAreMonths) {
        // tháng i (index 0) => key = i+1
        key = String(i + 1);
      } else if (labelsAreNumeric) {
        key = String(Number(lbl));
      } else if (labelsAreWeekdays) {
        key = String(lbl).toUpperCase();
      } else {
        key = String(lbl);
      }

      const bucket = index.get(key);

      if (!bucket || bucket.ys.length === 0) {
        out.push({ x: String(lbl), xLabel: String(lbl), y: null, date: null });
        continue;
      }

      for (const y of bucket.ys) {
        out.push({ x: String(lbl), xLabel: String(lbl), y, date: bucket.date });
      }
    }

    return out;
  }

  private buildChartData(
    datas: any[],
    textPickDate: string = this.textPickDate,
    labels: string[] = this.labels
  ): { data: any[]; xScale: any } {
    if (Utils.isEmpty(this.chartDetail)) textPickDate = this.textPickDate;
    if (textPickDate === 'this_week') {
      const scatterDataIndex = labels.flatMap((lbl) => {
        const found = datas.find((d) => d.x === lbl);

        if (!found) return [{ x: lbl, y: null, date: null }];

        if (Array.isArray(found.y)) {
          return found.y.map((v: number) => ({
            x: lbl,
            y: v,
            date: found.date,
          }));
        }

        return [{ x: lbl, y: found.y ?? null, date: found.date ?? null }];
      });

      return {
        data: scatterDataIndex,
        xScale: {
          type: 'category',
          labels: labels,
          offset: false,
          ticks: { stepSize: 1 },
        },
      };
    }

    if (
      textPickDate === 'last30days' ||
      textPickDate === 'customDate' ||
      textPickDate === 'hour' ||
      textPickDate === 'days'
    ) {
      const scatterDataIndex = labels.flatMap((lbl) => {
        const found = datas.find((d) => Number(d.x) === Number(lbl));

        if (!found) return [{ x: lbl, y: null, date: null }];

        if (Array.isArray(found.y)) {
          // <-- sửa từ found.value thành found.y
          return found.y.map((v: number) => ({
            x: lbl,
            y: v,
            date: found.date,
          }));
        }

        return [{ x: lbl, y: found.y ?? null, date: found.date ?? null }];
      });

      return {
        data: scatterDataIndex,
        xScale: {
          type: 'category',
          labels: labels,
          offset: false,
          ticks: { stepSize: 1 },
        },
      };
    }

    // fallback
    return {
      data: datas.flatMap((d) => {
        if (Array.isArray(d.y)) {
          return d.y.map((v: number) => ({ x: d.x, y: v, date: d.date }));
        }
        return [{ x: d.x, y: d.y, date: d.date }];
      }),
      xScale: this.xScale,
    };
  }

  private processForChart(
    res: any,
    item: any,
    sample_type: string,
    group_type: string,
    labels: any,
    items: any,
    sort_order: string
  ): void {
    let datas: any[] = [],
      min = 0,
      max = 0;

    if (!Utils.isEmpty(res.data)) {
      if (group_type === 'minute') {
        datas = this.mapDataToXYForMinute(res.data[0] || res.data);
        if (datas.length > 0) {
          min = Math.min(...datas.map((d) => d.y));
          max = Math.max(...datas.map((d) => d.y));
        }
      } else {
        datas = this.mapDataToXY(res.data[0].items);
        if (datas.length > 0) {
          min = Math.min(...datas.map((d) => d.y));
          max = Math.max(...datas.map((d) => d.y));
        }
      }
    }
    //item.dataCharts = datas;
    if (
      res.data.length > 0 &&
      Utils.inArray(res.data[0]._id, initCharts.minMaxCharts)
    ) {
      item.min_max =
        res.data[0]?.items.length === 1
          ? res.data[0].min
          : Utils.formatValueByUnit(sample_type, Number(res.data[0].min)) +
            ' - ' +
            Utils.formatValueByUnit(sample_type, Number(res.data[0].max));
    } else {
      item.avg = res.data[0]?.total
        ? Utils.formatNumber(res.data[0]?.total)
        : Utils.roundDecimals(res.data[0]?.avg || 0, 1);
      if (res.data[0]?.avg > 0) {
        item.avg = Utils.formatValueByUnit(sample_type, Number(item.avg));
      }
    }
    item.iconChart =
      'ic-' + sample_type.toLowerCase().replace(/_/g, '-') + '-st.svg';
    const cstMin = Utils.roundDecimals(
      min - (sample_type === 'HEIGHT' ? 2 : 20),
      0
    );
    const cstMax = Utils.roundDecimals(
      max + (sample_type === 'HEIGHT' ? 2 : 20),
      0
    );
    if (Utils.inArray(sample_type, initCharts.sampleTypeShowCharts)) {
      if (Utils.inArray(sample_type, initCharts.lineCharts)) {
        // 1.1=== line chart ===

        const scatterDataIndex = this.buildChartData(datas, group_type, labels);
        item.dataCharts = [
          {
            type: 'line',
            label: sample_type,
            data: scatterDataIndex.data,
            dataOrigin: datas,
            borderColor: items[0].chart_icon_color[0],
            //backgroundColor: items[0].chart_icon_color[0],
            pointBackgroundColor: 'white',
            pointBorderColor: items[0].chart_icon_color[0],
            pointBorderWidth: 2,
            tension: 0.3,
            fill: false,
            pointRadius: 4,
            showLine: true,
            spanGaps: true,
            parsing: { xAxisKey: 'x', yAxisKey: 'y' },
          },
        ];
        item.chartOptions = {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: this.tooltipOpts(sample_type),
          },
          scales: {
            x: scatterDataIndex.xScale,
            y: {
              type: 'linear',
              min: cstMin < 0 ? 0 : cstMin,
              max: cstMax,
              ticks: {
                stepSize: sample_type === 'HEIGHT' ? 1 : 5,
                callback: (value: any) => {
                  return Utils.formatValueByUnit(sample_type, Number(value));
                },
              },
            },
          },
          onResize: () => console.log('chart resized, redraw...'),
        };

        item.chartType = 'line';
      } else if (Utils.inArray(sample_type, initCharts.line2Charts)) {
        // 1.2=== line 2 chart ===

        const scatterDataIndex = this.buildChartData(datas);
        let color = items[0].chart_icon_color[0];
        item.dataCharts = [
          {
            type: 'line',
            label: sample_type,
            data: scatterDataIndex.data,
            dataOrigin: datas,
            borderColor: color,
            backgroundColor: color,
            tension: 0.3,
            fill: false,
            pointRadius: 4,
            showLine: true,
            spanGaps: true,
            parsing: { xAxisKey: 'x', yAxisKey: 'y' },
          },
        ];
        if (!Utils.isEmpty(res.data[1])) {
          const data2s = this.mapDataToXY(res.data[1].items);
          if (data2s.length > 0) {
            const min2 = Math.min(...data2s.map((d) => d.y));
            const max2 = Math.max(...data2s.map((d) => d.y));
            if (min > min2) min = min2;
            if (max2 > max) max = max2;
          }
          let color = items[0].chart_icon_color[1];
          const scatterDataIndex = this.buildChartData(data2s);
          item.dataCharts.push({
            type: 'line',
            label: sample_type,
            data: scatterDataIndex.data,
            dataOrigin: data2s,
            borderColor: color,
            backgroundColor: color,
            tension: 0.3,
            fill: false,
            pointRadius: 4,
            showLine: true,
            spanGaps: true,
            parsing: { xAxisKey: 'x', yAxisKey: 'y' },
          });
        }
        item.chartOptions = {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: this.tooltipOpts(),
          },
          scales: {
            x: scatterDataIndex.xScale,
            y: {
              min: cstMin < 0 ? 0 : cstMin,
              max: cstMax,
            },
          },
        };

        item.chartType = 'line';
      } else if (Utils.inArray(sample_type, initCharts.minMaxCharts)) {
        //2. === min max chart ===
        item.chartType = 'scatter';

        let scatterDataIndex: {
          x: string | number;
          y: number | null;
          date?: any;
        }[];

        // x = chính là label string (ví dụ: '31','1','2',...)
        scatterDataIndex = this.normalizeDatas(datas, this.labels);

        // Trải phẳng nhưng giữ index
        const validData = scatterDataIndex.flatMap((d, idx) => {
          if (Array.isArray(d.y)) {
            return d.y.map((yy) => ({
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
        });

        const minY = Math.min(...validData.map((d) => d.y));
        const maxY = Math.max(...validData.map((d) => d.y));

        const minPointData = [...validData].reverse().find((d) => d.y === minY);
        const maxPointData = [...validData].reverse().find((d) => d.y === maxY);

        const minIndex = minPointData?.idx ?? -1;
        const maxIndex = maxPointData?.idx ?? -1;

        const cstMin = Utils.roundDecimals(minY - 20, 0);
        const cstMax = Utils.roundDecimals(maxY + 20, 0);

        item.dataCharts = [
          {
            label: sample_type,
            data: scatterDataIndex,
            dataOrigin: datas,
            parsing: { xAxisKey: 'x', yAxisKey: 'y' },
            type: 'scatter',
            pointRadius: 4,
            pointBackgroundColor: scatterDataIndex.map((_, idx) =>
              (idx === minIndex || idx === maxIndex) && validData.length > 2
                ? 'white'
                : items[0].chart_icon_color[0]
            ),
            pointBorderColor: scatterDataIndex.map((_, idx) =>
              (idx === minIndex || idx === maxIndex) && validData.length > 2
                ? 'red'
                : items[0].chart_icon_color[0]
            ),
            pointBorderWidth: 2,
          },
        ];

        item.chartOptions = {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: this.tooltipOpts(),
          },
          scales: {
            x: {
              type: 'category',
              offset: false,
              labels: this.labels,
              ticks: {
                stepSize: 1,
                autoSkip: true,
                callback: (value: any, index: number, ticks: any) => {
                  // Luôn show tick đầu và tick cuối
                  if (index === 0 || index === ticks.length - 1) {
                    return this.labels[index] ?? '';
                  }
                  if (this.textPickDate === 'last30days') {
                    return this.labels[index];
                  }
                  if (this.textPickDate === 'thisYear') {
                    return initCharts.monthNames[index]; // J, F, M...
                  }
                  if (this.textPickDate === 'thisWeek') {
                    return this.labels[index]; // SUN, MON, ...
                  }
                  if (this.params.group_type === 'hour') {
                    return value;
                  }
                  if (this.params.group_type === 'days') {
                    return this.labels[index];
                  }
                  return value;
                },
              },
            },
            y: {
              min: cstMin < 0 ? 0 : cstMin,
              max: cstMax,
            },
          },
        };

        // ⚡️ labels phải ở data, không được để ở scales.x
        item.chartLabels = this.labels;
      } else if (Utils.inArray(sample_type, initCharts.barCharts)) {
        // === 3. bar chart ===
        const scatterDataIndex = this.buildChartData(datas);
        item.dataCharts = [
          {
            type: 'bar',
            label: sample_type,
            data: scatterDataIndex.data,
            dataOrigin: datas,
            backgroundColor: items[0].chart_icon_color[0],
            borderColor: items[0].chart_icon_color[0],
            borderWidth: 1,
          },
        ];

        item.chartOptions = {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: this.tooltipOpts(sample_type),
          },
          scales: {
            x: {
              ...this.xScale,
              grid: {
                display: false,
              },
            },
            y: {
              min: cstMin < 0 ? 0 : cstMin - 30,
              max: cstMax + 30,
              ticks: {
                beginAtZero: true,
              },
            },
          },
        };

        item.chartType = 'bar';
      } else {
        // === 4. scatter chart ===
        item.chartType = 'scatter';
        const scatterDataIndex = this.buildChartData(datas);
        item.dataCharts = [
          {
            label: sample_type,
            data: scatterDataIndex.data,
            dataOrigin: datas,
            backgroundColor: items[0].chart_icon_color[0],
            type: 'scatter',
            pointRadius: 4,
          },
        ];
        item.chartOptions = {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: this.tooltipOpts(sample_type),
          },
          scales: {
            x: scatterDataIndex.xScale,
            y: {
              min: cstMin < 0 ? 0 : cstMin,
              max: cstMax,
              ticks: {
                stepSize: 5,
                callback: (value: any) => {
                  return Utils.formatValueByUnit(sample_type, Number(value));
                },
              },
            },
          },
        };
      }
      // ĐẢM BẢO item có thuộc tính data với cấu trúc đúng
      item.data = {
        labels: [], // Khởi tạo mảng labels rỗng
        datasets: item.dataCharts,
      };

      // ĐẢM BẢO item có phương thức update
      item.update = function () {
        // Logic update sẽ được thêm sau
      };
      item.name = items[0].name || '';
      item.items = items;
      item.sample_type = sample_type;
      if (!Utils.isEmpty(this.chartDetail)) {
        // Deep clone toàn bộ object
        const clonedItem = JSON.parse(JSON.stringify(item));

        // chartDetail là state hiện tại
        this.chartDetail = clonedItem;

        // breadcrumbs lưu lại snapshot -> clone thêm lần nữa
        this.breadcrumbs.push(JSON.parse(JSON.stringify(clonedItem)));
      } else {
        this.pushChartFixedPosition(item, sample_type, sort_order);
      }
    }
    this.cdr.detectChanges();
  }
  private getDataItemForChart(
    body: any,
    sample_type: string,
    items: any,
    sort_order: string,
    group_type: string = this.params.group_type
  ): Observable<any> {
    let item: any = { params: body, textPickDate: this.textPickDate }; // chart item
    const labels: string[] = this.labels;
    if (group_type === 'minute') {
      body.date = body.from;
      return this.dashboardService.loadHDSSharedSamples4TblView(body).pipe(
        tap((res) => {
          if (res.code != 0) {
            this.snackBar.open(res.msg, 'x', {
              duration: 3000,
              horizontalPosition: 'right',
              verticalPosition: 'top',
              panelClass: ['error-snackbar'],
            });
            return;
          }
          this.processForChart(
            res,
            item,
            sample_type,
            group_type,
            labels,
            items,
            sort_order
          );
        }),
        catchError((err) => {
          console.error('Lỗi khi tải dashboard:', err);
          return of(null);
        })
      );
    } else {
      return this.dashboardService.loadHDSSharedSamples4ChartView(body).pipe(
        tap((res) => {
          if (res.code != 0) {
            this.snackBar.open(res.msg, 'x', {
              duration: 3000,
              horizontalPosition: 'right',
              verticalPosition: 'top',
              panelClass: ['error-snackbar'],
            });
            return;
          }
          this.processForChart(
            res,
            item,
            sample_type,
            group_type,
            labels,
            items,
            sort_order
          );
        }),
        catchError((err) => {
          console.error('Lỗi khi tải dashboard:', err);
          return of(null);
        })
      );
    }
  }
  private loadData4Charts(): Observable<void> {
    const apiCalls = this.sampleTypes.map((item: any) => {
      const body = {
        token: this.user.token || '',
        req_time: new Date().setHours(0, 0, 0, 0),
        body_type: 'avg',
        from: this.params.dateFrom,
        to: this.params.dateTo,
        group_type: this.params.group_type,
        last: false,
        patient_ref: this.id2,
        sample_type_id: item._id.sample_type_group_id,
        show_patient_info: false,
        top_type: 'avg',
      };
      const dataTypes = Utils.getBodyTypeTopType(item._id.sample_type_group_id);
      body.body_type = dataTypes.body_type;
      body.top_type = dataTypes.top_type;
      return this.getDataItemForChart(
        body,
        item._id.sample_type_group_id,
        item.items,
        item.sort_order
      ); // phải return Observable
    });
    return forkJoin(apiCalls).pipe(
      tap(() => {
        this.cdr.detectChanges();
      }),
      map(() => void 0)
    );
    console.log('charts:', this.charts);
  }
  changeViewDetail = (
    group_type: string,
    item: any,
    dateFrom: string,
    dateTo: string
  ) => {
    console.log('this.params.group_type', group_type);
    console.log('dateFrom', dateFrom);
    console.log('dateTo', dateTo);
    console.log('item chart', item);
    console.log('breadcrumbs', this.breadcrumbs);
    this.labels = this.generateXAxisLabels(dateFrom, dateTo, group_type);
    this.textPickDate = group_type;
    this.isChangeViewDetail = true;
    this.loadChartDetail(dateFrom, dateTo, group_type).toPromise();
    // thực hiện logic thay đổi view
  };
  private normalizePos(pos: any): number {
    if (pos == null) return Number.POSITIVE_INFINITY;
    if (typeof pos === 'number') return pos;
    if (typeof pos === 'string') {
      const n = Number(pos.replace(',', '.').trim());
      return isNaN(n) ? Number.POSITIVE_INFINITY : n;
    }
    return Number.POSITIVE_INFINITY;
  }

  private pushChartFixedPosition(
    item: any,
    sample_type: string,
    sort_order: string
  ) {
    const _pos = this.normalizePos(sort_order);
    const idx = this.charts.findIndex(
      (c: any) => c._id?.sample_type_group_id === sample_type
    );
    const entry = { ...item, _pos };

    let newCharts: any[];

    if (idx >= 0) {
      newCharts = this.charts.map((c, i) => (i === idx ? entry : c));
    } else {
      newCharts = [...this.charts, entry];
    }

    newCharts.sort((a: any, b: any) => {
      const da = a._pos ?? Number.POSITIVE_INFINITY;
      const db = b._pos ?? Number.POSITIVE_INFINITY;
      if (da !== db) return da - db;
      const ida = a._id?.sample_type_group_id ?? '';
      const idb = b._id?.sample_type_group_id ?? '';
      return ida.localeCompare(idb);
    });

    this.charts = [...newCharts];
  }

  get chunkedSampleTypes() {
    const chunks = [];
    const charts = this.charts.filter(
      (chart) => chart.sample_type !== 'HEIGHT'
    );
    for (let i = 0; i < charts.length; i += 3) {
      chunks.push(charts.slice(i, i + 3));
    }
    return chunks;
  }

  getStringTimeSync(date: Date | string): string {
    return Utils.getStringTimeSync(date);
  }

  loadData(datePicker: number = 1, options: any = {}) {
    if (!isPlatformBrowser(this.platformId)) return;
    this.isBrowser = isPlatformBrowser(this.platformId);
    const body = {
      token: this.user.token || '',
      req_time: new Date().setHours(0, 0, 0, 0),
      patient_ref: this.id2,
      group: true,
    };
    this.dashboardService.loadHDSsampleTypes(body).subscribe({
      next: (res) => {
        if (res.code != 0) {
          this.snackBar.open(res.msg, 'x', {
            duration: 3000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
            panelClass: ['error-snackbar'],
          });
          return;
        }
        this.sampleTypes = [...(res.data || [])];
        const sample_type = this.sampleTypes
          .filter((e: any) => e.web_chart_pos === 1 || e.web_chart_pos === 3)
          .map((e: any) => ({
            id: e._id.sample_type_group_id,
            last: e._id.sample_type_group_id === 'HEIGHT',
          }));
        this.dataSnapshots = sample_type;
        this.pickDate(datePicker, options);
      },
      error: (err) => {
        console.error('Lỗi khi tải dashboard:', err);
      },
    });
  }
}
