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

Chart.register(...registerables, minMaxLabelPlugin);

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
        this.loadData4Charts();
      }
    });
  }
  pickDate(data: number) {
    const today = new Date();

    switch (data) {
      case 1: // TODAY
        this.params.dateFrom = this.formatDate(today) + ' 00:00:00';
        this.params.dateTo = this.formatDate(today) + ' 23:59:59';
        this.params.group_type = 'hour';
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
        break;

      case 4: // LAST 30 DAYS
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);

        this.params.dateFrom = this.formatDate(thirtyDaysAgo) + ' 00:00:00';
        this.params.dateTo = this.formatDate(today) + ' 23:59:59';
        this.params.group_type = 'days';
        break;

      case 5: // THIS YEAR
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        const endOfYear = new Date(today.getFullYear(), 11, 31);
        this.params.dateFrom = this.formatDate(startOfYear) + ' 00:00:00';
        this.params.dateTo = this.formatDate(endOfYear) + ' 23:59:59';
        this.params.group_type = 'months';
        break;
    }
    this.charts = [];
    this.textBtn =
      data == 1
        ? Utils.getDateString(new Date(), 'M d, yyyy')
        : Utils.getDateString(this.params.dateFrom, 'M d, yyyy') +
          ' - ' +
          Utils.getDateString(this.params.dateTo, 'M d, yyyy');
    this.loadData4Charts();
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
  xScale: any = {
    type: 'linear',
    offset: true, // căn đều 2 đầu
    bounds: 'ticks', // ticks chiếm hết trục
    min: this.params.group_type === 'hour' ? 0 : 1,
    max:
      this.params.group_type === 'hour'
        ? 23
        : this.params.group_type === 'days'
        ? 31
        : 12,
    ticks: {
      stepSize: 1,
      callback: (value: any) => {
        if (this.params.group_type === 'months') {
          return initCharts.monthNames[value - 1]; // Jan–Dec
        } else if (this.params.group_type === 'days') {
          return value; // ngày
        } else if (this.params.group_type === 'hour') {
          return value + 'h'; // giờ
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
  private loadData4Charts() {
    this.sampleTypes.forEach((item: any) => {
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
      this.dashboardService.loadHDSSharedSamples4ChartView(body).subscribe({
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
                  datas[e._id.day] = e.value; // ngày trong tháng
                } else if (this.params.group_type === 'hour') {
                  datas[e._id.hour] = e.value; // giờ trong ngày
                }
              } else {
                // scatter chart
                if (this.params.group_type === 'months') {
                  data.x = e._id.month;
                } else if (this.params.group_type === 'days') {
                  data.x = e._id.day;
                } else if (this.params.group_type === 'hour') {
                  data.x = e._id.hour;
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
              //
              console.log('datas chart line', datas);

              // Chuẩn hóa data: chuyển null -> bỏ
              const scatterData = datas
                .map((v, i) => (v !== null ? { x: i, y: v } : null))
                .filter((v) => v);

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
            this.pushChartFixedPosition(item);
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Lỗi khi tải dashboard:', err);
        },
      });
    });
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
        this.loadData4Charts();
      },
      error: (err) => {
        console.error('Lỗi khi tải dashboard:', err);
      },
    });
  }
}
