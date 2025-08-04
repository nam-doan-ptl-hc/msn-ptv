import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
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

// === Plugin hiển thị nhãn "min" và "max" chỉ cho Heart Rate ===
const minMaxLabelPlugin: Plugin<'scatter'> = {
  id: 'minMaxLabelPlugin',
  afterDatasetsDraw(chart) {
    const ctx = chart.ctx;

    chart.data.datasets.forEach((dataset, i) => {
      if (dataset.type !== 'scatter' || dataset.label !== 'Heart Rate') return;
      const data = dataset.data as { x: number; y: number }[];
      if (!data.length) return;

      const min = data.reduce((a, b) => (a.y < b.y ? a : b));
      const max = data.reduce((a, b) => (a.y > b.y ? a : b));

      const meta = chart.getDatasetMeta(i);
      const minIndex = data.findIndex((d) => d === min);
      const maxIndex = data.findIndex((d) => d === max);

      const minPoint = meta.data[minIndex];
      const maxPoint = meta.data[maxIndex];

      ctx.fillStyle = '#000';
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';

      if (minPoint) {
        ctx.fillText('min', minPoint.x + 6, minPoint.y);
      }
      if (maxPoint) {
        ctx.fillText('max', maxPoint.x + 6, maxPoint.y);
      }
    });
  },
};

Chart.register(...registerables, minMaxLabelPlugin);

@Component({
  selector: 'hds',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './hds.component.html',
  styleUrl: './hds.component.scss',
})
export class HdsComponent implements OnInit {
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);

  id1!: string;
  id2!: string;
  id3!: string;

  isBrowser = false;

  labels: string[] = [];

  oxygenData: ChartDataset<'line'>[] = [];
  oxygenOptions: ChartOptions<'line'> = {};

  heartData: ChartDataset<'scatter'>[] = [];
  heartOptions: ChartOptions<'scatter'> = {};

  respirationData: ChartDataset<'scatter'>[] = [];
  respirationOptions: ChartOptions<'scatter'> = {};

  ngOnInit(): void {
    this.isBrowser = isPlatformBrowser(this.platformId);

    if (this.isBrowser && !this.auth.isLoggedIn()) {
      this.router.navigate(['/']);
    }

    this.route.paramMap.subscribe((params) => {
      this.id1 = params.get('id1') || '';
      this.id2 = params.get('id2') || '';
      this.id3 = params.get('id3') || '';
      console.log({ id1: this.id1, id2: this.id2, id3: this.id3 });
    });

    if (this.isBrowser) {
      this.initCharts();
    }
  }

  private initCharts() {
    this.labels = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

    // === 1. Oxygen Saturation ===
    this.oxygenData = [
      {
        label: 'Oxygen Saturation',
        data: [89, 80],
        borderColor: '#3e95cd',
        tension: 0.3,
        fill: false,
        pointRadius: 5,
      },
    ];
    this.oxygenOptions = {
      responsive: true,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          min: 70,
          max: 90,
        },
      },
    };

    // === 2. Heart Rate (scatter + min/max) ===
    this.heartData = [
      {
        label: 'Heart Rate',
        data: [
          { x: 1, y: 123 },
          { x: 2, y: 90 },
          { x: 3, y: 46 },
          { x: 4, y: 46 },
          { x: 5, y: 46 },
          { x: 6, y: 46 },
          { x: 7, y: 46 },
        ],
        backgroundColor: '#e91e63',
        type: 'scatter',
        pointRadius: 6,
      },
    ];
    this.heartOptions = {
      responsive: true,
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: {
          min: 1, // ← Thêm dòng này
          max: 12, // ← Thêm dòng này
          ticks: {
            stepSize: 1,
            callback: (value) => {
              const monthLabels = [
                'J',
                'F',
                'M',
                'A',
                'M',
                'J',
                'J',
                'A',
                'S',
                'O',
                'N',
                'D',
              ];
              return monthLabels[+value - 1] ?? value;
            },
          },
        },
        y: {
          min: 0,
          max: 160,
        },
      },
    };

    // === 3. Respiration Rate ===
    this.respirationData = [
      {
        label: 'Respiration',
        data: [
          { x: 2, y: 58 },
          { x: 3, y: 57.5 },
          { x: 5, y: 58.2 },
        ],
        backgroundColor: '#ff9800',
        type: 'scatter',
        pointRadius: 6,
      },
    ];
    this.respirationOptions = {
      responsive: true,
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: {
          min: 1, // ← Thêm dòng này
          max: 12, // ← Thêm dòng này
          ticks: {
            callback: (value) => {
              const monthLabels = [
                'J',
                'F',
                'M',
                'A',
                'M',
                'J',
                'J',
                'A',
                'S',
                'O',
                'N',
                'D',
              ];
              return monthLabels[+value - 1] ?? value;
            },
            stepSize: 1,
          },
        },
        y: {
          min: 57,
          max: 59,
        },
      },
    };
  }
}
