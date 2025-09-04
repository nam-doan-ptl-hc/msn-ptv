import { Plugin } from 'chart.js';
import { Utils } from '../app/utils/utils';
import { initCharts } from '../app/shared/constants';

export const minMaxLabelPlugin: Plugin<'scatter'> = {
  id: 'minMaxLabelPlugin',

  afterDatasetsDraw(chart) {
    const ctx = chart.ctx;

    chart.data.datasets.forEach((dataset: any, i: number) => {
      // Chỉ áp dụng cho scatter và các chart trong minMaxCharts
      if (
        dataset.type !== 'scatter' ||
        !Utils.inArray(dataset.label, initCharts.minMaxCharts)
      ) {
        return;
      }

      const data = dataset.data as { x: number | string; y: number | null }[];
      if (!data.length) return;

      // Chỉ lấy các điểm có y !== null
      const validData = data
        .map((d, idx) => ({ ...d, idx }))
        .filter((d) => d.y !== null);

      if (!validData.length) return;

      // Tìm giá trị min/max
      const minY = Math.min(...validData.map((d) => d.y!));
      const maxY = Math.max(...validData.map((d) => d.y!));

      // Chỉ lấy 1 điểm duy nhất để highlight
      // Dùng reverse().find để lấy điểm cuối cùng xuất hiện trong dataset
      const minPointData = [...validData].reverse().find((d) => d.y === minY);
      const maxPointData = [...validData].reverse().find((d) => d.y === maxY);

      const meta = chart.getDatasetMeta(i);

      const minPoint = minPointData ? meta.data[minPointData.idx] : null;
      const maxPoint = maxPointData ? meta.data[maxPointData.idx] : null;

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
        ctx.fillText(`Min ${Utils.roundDecimals(minY, 1)}`, minPoint.x, y);
      }

      if (maxPoint) {
        const chartArea = chart.chartArea;
        const y =
          maxPoint.y - 10 < chartArea.top ? maxPoint.y + 20 : maxPoint.y - 10;
        ctx.fillText(`Max ${Utils.roundDecimals(maxY, 1)}`, maxPoint.x, y);
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
