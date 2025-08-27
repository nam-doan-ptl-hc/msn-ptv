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
import {
  Chart,
  ChartOptions,
  ChartDataset,
  registerables,
  Plugin,
} from 'chart.js';
import { DashboardService } from '../../../../services/dashboar.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Utils } from '../../../utils/utils';
import { initCharts } from '../../../shared/constants';
import 'chartjs-adapter-date-fns';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { catchError, forkJoin, map, Observable, of, tap } from 'rxjs';

// === Plugin hiển thị nhãn "min" và "max" chỉ cho Heart Rate ===
const minMaxLabelPlugin: Plugin<'scatter'> = {
  id: 'minMaxLabelPlugin',
  afterDatasetsDraw(chart) {
    const ctx = chart.ctx;

    chart.data.datasets.forEach((dataset: any, i: number) => {
      if (
        dataset.type !== 'scatter' ||
        !Utils.inArray(dataset.label, initCharts.minMaxCharts)
      ) {
        return;
      }

      const data = dataset.data as { x: number; y: number }[];
      if (!data.length) return;

      const min = data.reduce((a, b) => (a.y < b.y ? a : b));
      const max = data.reduce((a, b) => (a.y > b.y ? a : b));

      const meta = chart.getDatasetMeta(i);
      const minIndex = data.findIndex((d) => d === min);
      const maxIndex = data.findIndex((d) => d === max);

      const minPoint = meta.data[minIndex];
      const maxPoint = meta.data[maxIndex];

      // ✅ Chỉ vẽ label
      ctx.save();
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'red';

      if (minPoint) {
        ctx.fillText(
          `Min ${Utils.roundDecimals(min?.y, 1)}`,
          minPoint.x,
          minPoint.y + 20
        );
      }
      if (maxPoint) {
        ctx.fillText(
          `Max ${Utils.roundDecimals(max?.y, 1)}`,
          maxPoint.x,
          maxPoint.y - 10
        );
      }

      ctx.restore();
    });
  },
};
const verticalLinePlugin = {
  id: 'verticalLinePlugin',
  afterDraw: (chart: any) => {
    if (chart.tooltip?._active?.length) {
      const ctx = chart.ctx;
      const x = chart.tooltip._active[0].element.x;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x, chart.chartArea.top);
      ctx.lineTo(x, chart.chartArea.bottom);
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#000';
      ctx.stroke();
      ctx.restore();
    }
  },
};
Chart.register(...registerables, minMaxLabelPlugin, verticalLinePlugin);

@Component({
  selector: 'hds',
  standalone: true,
  imports: [
    CommonModule,
    BaseChartDirective,
    MatDatepickerModule,
    MatNativeDateModule,
    ReactiveFormsModule,
  ],
  templateUrl: './hds.component.html',
  providers: [DatePipe],
  styleUrls: ['./hds.component.scss'],
})
export class HdsComponent implements OnInit {
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

  isBrowser = false;

  labels: string[] = initCharts.monthNames;

  dataSnapshots: any[] = [];
  sampleTypes: any[] = [];
  charts: any[] = [];
  user: any = {};
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
  formatDate(date: Date): string {
    return this.datePipe.transform(date, 'MM/dd/yyyy') || '';
  }
  ngOnInit(): void {
    if (this.isBrowser && !this.auth.isLoggedIn()) {
      this.router.navigate(['/']);
    }

    this.route.paramMap.subscribe((params) => {
      this.id1 = params.get('id1') || '';
      this.id2 = params.get('id2') || '';
      this.id3 = params.get('id3') || '';
      console.log({ id1: this.id1, id2: this.id2, id3: this.id3 });
    });
    this.loadData();
    if (this.isBrowser) {
      this.params.dateFrom = this.formatDate(new Date()) + ' 00:00:00';
      this.params.dateTo = this.formatDate(new Date()) + ' 23:59:59';
      this.textBtn = Utils.getDateString(new Date(), 'M d, yyyy');
    }
    this.range.valueChanges.subscribe((value) => {
      if (value.start && value.end) {
        this.params.dateFrom = this.formatDate(value.start) + ' 00:00:00';
        this.params.dateTo = this.formatDate(value.end) + ' 23:59:59';
        this.textBtn =
          Utils.getDateString(this.params.dateFrom, 'M d, yyyy') +
          ' - ' +
          Utils.getDateString(this.params.dateTo, 'M d, yyyy');
        this.pickDate(0);

        this.updateXScaleFromParams();
      }
    });
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
        this.xScale.min = 1;
        this.xScale.max = 31;
      }
    } else if (gt === 'months') {
      this.xScale.min = 1;
      this.xScale.max = 12;
    }

    if (!this.xScale.ticks) this.xScale.ticks = {};
    this.xScale.ticks.stepSize = 1;
  }

  private generateCurrentWeekLabels(): string[] {
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const labels: string[] = [];

    const today = new Date();
    const firstDayOfWeek = new Date(today);
    firstDayOfWeek.setDate(today.getDate() - today.getDay()); // Bắt đầu từ Chủ Nhật

    for (let i = 0; i < 7; i++) {
      const d = new Date(firstDayOfWeek);
      d.setDate(firstDayOfWeek.getDate() + i);
      labels.push(dayNames[d.getDay()]); // SUN, MON...
    }

    return labels;
  }
  async pickDate(data: number) {
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
        thirtyDaysAgo.setDate(today.getDate() - 30);

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
    }
    this.charts = [];
    this.textBtn =
      data == 1
        ? Utils.getDateString(new Date(), 'M d, yyyy')
        : Utils.getDateString(this.params.dateFrom, 'M d, yyyy') +
          ' - ' +
          Utils.getDateString(this.params.dateTo, 'M d, yyyy');
    //this.loadData4Charts();
    // Cập nhật nhãn trục x

    this.labels =
      data === 2
        ? this.generateCurrentWeekLabels()
        : this.generateXAxisLabels();
    this.updateXScaleFromParams();
    // Cập nhật tất cả biểu đồ
    try {
      await this.loadData4Charts().toPromise();
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu:', error);
    }
  }

  private loadData4SnapshotCard(sample_type: any[] = []) {
    const body = {
      token: this.user.token || '',
      req_time: new Date().setHours(0, 0, 0, 0),
      from: this.params.dateFrom,
      to: this.params.dateTo,
      patient_ref: this.id2,
      sample_type: sample_type,
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
            item.value =
              item.id == 'HEIGHT'
                ? Utils.convertUnit.showHeightInch(itemData.obj.item.value)
                : itemData.obj.item.value || '';
            item.unit = itemData.obj.item.unit || '';
            item.sync_date_utc = itemData.obj.item.sync_date_utc || '';
          }
          if (item.id === 'BMI') {
            const itemWeight = Utils.findObject(res.data, '_id', 'WEIGHT');
            const itemHeight = Utils.findObject(res.data, '_id', 'HEIGHT');
            if (itemWeight.pos > -1) {
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
  generateLabels(): string[] {
    if (this.textPickDate === 'thisWeek') {
      return this.labels; // đã chuẩn bị sẵn 7 ngày
    }

    if (this.params.group_type === 'days') {
      // Last 30 days
      const labels: string[] = [];
      const today = new Date();
      const start = new Date();
      start.setDate(today.getDate() - 29); // lùi 29 ngày để đủ 30 ngày (tính cả hôm nay)

      for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        labels.push(`${day}/${month}`);
      }

      return labels;
    }

    if (this.params.group_type === 'months') {
      return initCharts.monthNames; // ['Jan', 'Feb', ... 'Dec']
    }

    if (this.params.group_type === 'hour') {
      return Array.from({ length: 24 }, (_, i) => `${i}h`);
    }

    return [];
  }

  xScale: any = {
    type: 'category',
    offset: true,
    bounds: 'ticks',
    labels: this.generateLabels(), // generateLabels trả về list ngày đầy đủ dạng '28/07', '29/07', ...
    ticks: {
      stepSize: 1,
      callback: (value: any, index: number) => {
        if (this.textPickDate === 'thisYear') {
          return initCharts.monthNames[index]; // J, F, M...
        }
        if (this.textPickDate === 'thisWeek') {
          return this.labels[index]; // SUN, MON, ...
        }
        if (this.params.group_type === 'hour') {
          return value + 'h';
        }
        if (this.textPickDate === 'last30days') {
          // chỉ lấy ngày (phần số) để hiển thị trên trục
          const fullDate = this.generateLabels()[index]; // ví dụ '28/07'
          console.log(fullDate);
          return fullDate.split('/')[0]; // chỉ lấy '28'
        }
        if (this.params.group_type === 'days') {
          return this.labels[index];
        }
        return value;
      },
    },
  };

  // Tooltip hiển thị đúng theo group_type
  tooltipOpts: any = {
    displayColors: false,
    callbacks: {
      title: () => null,
      label: (context: any) => {
        return Utils.roundDecimals(context.raw.y, 1);
      },
    },
  };
  generateXAxisLabels() {
    const groupType = this.params.group_type;
    let labels: string[] = [];

    if (groupType === 'months') {
      // Hiển thị các tháng từ J đến D
      labels = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
    } else if (groupType === 'days') {
      // Hiển thị các ngày từ dateFrom đến dateTo
      const startDate = new Date(this.params.dateFrom);
      const endDate = new Date(this.params.dateTo);

      if (this.params.dateFrom && this.params.dateTo) {
        // LAST 30 DAYS: Hiển thị theo thứ tự tăng dần
        while (startDate <= endDate) {
          labels.push(startDate.getDate().toString()); // Lấy ngày (1, 2, ..., 30)
          startDate.setDate(startDate.getDate() + 1); // Tăng ngày lên 1
        }
      }
    } else if (groupType === 'hour') {
      // Hiển thị các giờ từ 0 đến 24
      labels = Array.from({ length: 24 }, (_, i) => `${i}h`);
    }

    return labels;
  }

  convertServerDayToClient(e: any): {
    day_of_week: number;
    day_of_month: number;
    month: number;
    year: number;
  } {
    // 1. Lấy ngày gốc từ server (theo day_of_year)
    const utcDate = new Date(Date.UTC(e.year, 0, 1));
    utcDate.setUTCDate(utcDate.getUTCDate() + e.day - 1);

    // 2. Convert sang giờ local client
    const localDate = new Date(utcDate);

    return {
      day_of_week: localDate.getDay(), // 0 = Chủ nhật
      day_of_month: localDate.getDate(), // Ngày trong tháng
      month: localDate.getMonth() + 1, // Tháng (JS: 0-11 → +1 để thành 1-12)
      year: localDate.getFullYear(),
    };
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
      if (
        item._id.sample_type_group_id === 'STEP_AZ' ||
        item._id.sample_type_group_id === 'HF_TREND'
      ) {
        body.top_type = 'none';
      } else if (item._id.sample_type_group_id === 'STEP') {
        body.body_type = 'total';
        body.top_type = 'total';
      } else if (item._id.sample_type_group_id === 'HEIGHT') {
        body.body_type = 'last';
        body.top_type = 'last';
      }
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
          let datas: any[] = [],
            min = 0,
            max = 0;
          if (!Utils.isEmpty(res.data)) {
            res.data[0].items.forEach((e: any) => {
              let data: any = {};

              if (
                Utils.inArray(
                  item._id.sample_type_group_id,
                  initCharts.lineCharts
                )
              ) {
                // line chart kiểu theo tháng
                if (this.params.group_type === 'months') {
                  datas[e._id.month] = e.value;
                } else if (this.params.group_type === 'days') {
                  const localDay = this.convertServerDayToClient(e._id);
                  if (this.textPickDate === 'thisWeek') {
                    const dow = localDay.day_of_week;
                    datas[dow] = e.value;
                  } else {
                    const dom = localDay.day_of_month;
                    datas[dom] = e.value;
                  }
                } else if (this.params.group_type === 'hour') {
                  datas[e._id.hour] = e.value; // Giờ trong ngày
                }
              } else {
                // scatter chart
                if (this.params.group_type === 'months') {
                  data.x = e._id.month;
                } else if (this.params.group_type === 'days') {
                  const localDay = this.convertServerDayToClient(e._id);
                  if (this.textPickDate === 'thisWeek') {
                    const dow = localDay.day_of_week;
                    datas[dow] = e.value;
                  } else {
                    data.x = localDay.day_of_month;
                  }
                } else if (this.params.group_type === 'hour') {
                  data.x = e._id.hour; // Giờ trong ngày
                }
                data.y = e.value;
                datas.push(data);
              }

              if (e.value < min || min === 0) {
                min = e.value;
              }
              if (e.value > max || max === 0) {
                max = e.value;
              }
            });
          }
          //item.dataCharts = datas;
          item.avg = Utils.roundDecimals(res.data[0]?.avg || 0, 1);
          item.iconChart =
            'ic-' +
            item._id.sample_type_group_id.toLowerCase().replace(/_/g, '-') +
            '-st.svg';
          const cstMin = Utils.roundDecimals(min - 20, 0);
          const cstMax = Utils.roundDecimals(max + 20, 0);
          if (
            Utils.inArray(
              item._id.sample_type_group_id,
              initCharts.sampleTypeShowCharts
            )
          ) {
            if (
              Utils.inArray(
                item._id.sample_type_group_id,
                initCharts.lineCharts
              )
            ) {
              // 1.=== line chart ===
              const scatterData =
                this.textPickDate === 'thisWeek'
                  ? datas
                  : datas
                      .map((v, i) => (v !== null ? { x: i, y: v } : null))
                      .filter((v) => v);
              console.log('scatterData', scatterData);
              item.dataCharts = [
                {
                  type: 'line',
                  label: item._id.sample_type_group_id,
                  data: scatterData,
                  borderColor: item.items[0].chart_icon_color[0],
                  backgroundColor: item.items[0].chart_icon_color[0],
                  tension: 0.3,
                  fill: false,
                  pointRadius: 6,
                  showLine: true, // Bật line nối giữa các điểm
                  spanGaps: true, // Cho phép bỏ qua null
                },
              ];

              item.chartOptions = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: this.tooltipOpts,
                },
                scales: {
                  x: this.xScale,
                  y: {
                    min: cstMin < 0 ? 0 : cstMin,
                    max: cstMax,
                  },
                },
              };

              item.chartType = 'line';
            } else if (
              Utils.inArray(
                item._id.sample_type_group_id,
                initCharts.minMaxCharts
              )
            ) {
              // === 2. scatter + min/max ===
              item.chartType = 'scatter';

              // ✅ Tìm min/max và set màu ngay trong dataset
              let minIndex = 0,
                maxIndex = 0;
              if (datas.length > 0) {
                let min = datas[0].y,
                  max = datas[0].y;
                datas.forEach((d, idx) => {
                  if (d.y < min) {
                    min = d.y;
                    minIndex = idx;
                  }
                  if (d.y > max) {
                    max = d.y;
                    maxIndex = idx;
                  }
                });
              }
              console.log('datas', datas);
              item.dataCharts = [
                {
                  label: item._id.sample_type_group_id,
                  data: datas,
                  type: 'scatter',
                  pointRadius: 6,
                  pointBackgroundColor: datas.map((_, idx) =>
                    idx === minIndex || idx === maxIndex
                      ? 'white'
                      : item.items[0].chart_icon_color[0]
                  ),
                  pointBorderColor: datas.map((_, idx) =>
                    idx === minIndex || idx === maxIndex
                      ? 'red'
                      : item.items[0].chart_icon_color[0]
                  ),
                  pointBorderWidth: 2,
                },
              ];

              item.chartOptions = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: this.tooltipOpts,
                },
                scales: {
                  x: this.xScale,
                  y: {
                    min: cstMin < 0 ? 0 : cstMin,
                    max: cstMax,
                  },
                },
              };
            } else if (
              Utils.inArray(item._id.sample_type_group_id, initCharts.barCharts)
            ) {
              // === 3. bar chart ===
              const barData = datas.map((v) => (v !== null ? v : 0));

              item.dataCharts = [
                {
                  type: 'bar',
                  label: item._id.sample_type_group_id,
                  data: barData,
                  backgroundColor: item.items[0].chart_icon_color[0],
                  borderColor: item.items[0].chart_icon_color[0],
                  borderWidth: 1,
                },
              ];

              item.chartOptions = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: this.tooltipOpts,
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
              item.dataCharts = [
                {
                  label: item._id.sample_type_group_id,
                  data: datas,
                  backgroundColor: item.items[0].chart_icon_color[0],
                  type: 'scatter',
                  pointRadius: 6,
                },
              ];
              item.chartOptions = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: this.tooltipOpts,
                },
                scales: {
                  x: this.xScale,
                  y: {
                    min: cstMin < 0 ? 0 : cstMin,
                    max: cstMax,
                  },
                },
              };
            }
            //console.log('charts item:', item);
            // ĐẢM BẢO item có thuộc tính data với cấu trúc đúng
            item.data = {
              labels: [], // Khởi tạo mảng labels rỗng
              datasets: item.dataCharts,
            };

            // ĐẢM BẢO item có phương thức update
            item.update = function () {
              // Logic update sẽ được thêm sau
            };

            this.pushChartFixedPosition(item);
          }
          this.cdr.detectChanges();
        }),
        catchError((err) => {
          console.error('Lỗi khi tải dashboard:', err);
          return of(null);
        })
      );

      /* this.dashboardService.loadHDSSharedSamples4ChartView(body).subscribe({
        next: (res) => {
          
        },
        error: (err) => {
          console.error('Lỗi khi tải dashboard:', err);
        },
      }); */
    });
    return forkJoin(apiCalls).pipe(
      tap(() => {
        this.cdr.detectChanges();
      }),
      map(() => void 0)
    );
    console.log('charts:', this.charts);
  }
  private normalizePos(pos: any): number {
    if (pos == null) return Number.POSITIVE_INFINITY;
    if (typeof pos === 'number') return pos;
    if (typeof pos === 'string') {
      const n = Number(pos.replace(',', '.').trim());
      return isNaN(n) ? Number.POSITIVE_INFINITY : n;
    }
    return Number.POSITIVE_INFINITY;
  }

  private pushChartFixedPosition(item: any) {
    const _pos = this.normalizePos(item.sort_order);
    const key = item._id?.sample_type_group_id;
    const idx = this.charts.findIndex(
      (c: any) => c._id?.sample_type_group_id === key
    );
    const entry = { ...item, _pos };

    if (idx >= 0) this.charts[idx] = entry;
    else this.charts.push(entry);

    this.charts.sort((a: any, b: any) => {
      const da = a._pos ?? Number.POSITIVE_INFINITY;
      const db = b._pos ?? Number.POSITIVE_INFINITY;
      if (da !== db) return da - db;
      const ida = a._id?.sample_type_group_id ?? '';
      const idb = b._id?.sample_type_group_id ?? '';
      return ida.localeCompare(idb);
    });
  }

  get chunkedSampleTypes() {
    const chunks = [];
    for (let i = 0; i < this.charts.length; i += 3) {
      chunks.push(this.charts.slice(i, i + 3));
    }
    return chunks;
  }

  getStringTimeSync(date: Date | string): string {
    return Utils.getStringTimeSync(date);
  }

  loadData() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.isBrowser = isPlatformBrowser(this.platformId);
    const userInfoStr = localStorage.getItem('user_info');
    this.user = JSON.parse(userInfoStr || '{}');
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
        this.sampleTypes = res.data || [];
        const sample_type = this.sampleTypes
          .filter((e: any) => e.web_chart_pos === 1 || e.web_chart_pos === 3)
          .map((e: any) => ({
            id: e._id.sample_type_group_id,
            last: e._id.sample_type_group_id === 'HEIGHT',
          }));
        this.dataSnapshots = sample_type;
        this.loadData4SnapshotCard(sample_type);
        this.pickDate(1);
      },
      error: (err) => {
        console.error('Lỗi khi tải dashboard:', err);
      },
    });
  }
}
