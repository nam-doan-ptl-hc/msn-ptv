import { Chart, Plugin } from 'chart.js';
import { Utils } from '../app/utils/utils';
import { initCharts } from '../app/shared/constants';
export // === Plugin hiển thị nhãn "min" và "max" chỉ cho Heart Rate ===
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
export const verticalLinePlugin = {
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
