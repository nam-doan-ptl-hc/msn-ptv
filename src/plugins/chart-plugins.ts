import { Plugin } from 'chart.js';
import { Utils } from '../app/utils/utils';
import { initCharts } from '../app/shared/constants';

export const minMaxLabelPlugin: Plugin<'scatter'> = {
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

      const data = dataset.data as { x: number | string; y: number | null }[];
      if (!data.length) return;

      const validData = data
        .map((d, idx) => ({ ...d, idx }))
        .filter((d) => d.y !== null);

      if (!validData.length) return;

      const min = validData.reduce((a, b) => (a.y! < b.y! ? a : b));
      const max = validData.reduce((a, b) => (a.y! > b.y! ? a : b));

      const meta = chart.getDatasetMeta(i);
      const minPoint = meta.data[min.idx];
      const maxPoint = meta.data[max.idx];

      ctx.save();
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'red';

      if (minPoint) {
        const chartArea = chart.chartArea;
        const y =
          minPoint.y + 20 > chartArea.bottom
            ? minPoint.y - 10
            : minPoint.y + 20;

        ctx.fillText(`Min ${Utils.roundDecimals(min.y!, 1)}`, minPoint.x, y);
      }

      if (maxPoint) {
        const chartArea = chart.chartArea;
        const y =
          maxPoint.y - 10 < chartArea.top ? maxPoint.y + 20 : maxPoint.y - 10;

        ctx.fillText(`Max ${Utils.roundDecimals(max.y!, 1)}`, maxPoint.x, y);
      }

      ctx.restore();
    });
  },
};

export const crosshairLine = {
  id: 'crosshairLine',
  afterDatasetsDraw(chart: any) {
    const {
      ctx,
      chartArea: { top, bottom, left, right },
    } = chart;

    const active = chart.getActiveElements();

    if (active.length > 0) {
      const { element, datasetIndex, index } = active[0];
      const x = element.x;

      // Vẽ đường thẳng
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'red'; // đổi màu dễ thấy
      ctx.stroke();
      ctx.restore();

      // Lấy dữ liệu gốc
      const dataset = chart.data.datasets[datasetIndex];
      const raw = dataset.data[index] as any;

      let formatted = '';
      if (raw?.date) {
        const date = new Date(raw.date);
        formatted = date.toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
        });
      }

      console.log('raw:', raw, 'formatted:', formatted);

      // Vẽ text (luôn luôn hiển thị test trước)
      ctx.save();
      ctx.fillStyle = 'red';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(formatted || 'NO DATE', x, bottom + 10); // đẩy xuống xa để không bị cắt
      ctx.restore();
    }
  },
};
