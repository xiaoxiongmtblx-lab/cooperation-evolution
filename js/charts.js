/* =========================================================
 * charts.js —— 手绘 Canvas 图表（无第三方依赖）
 * 1. StackChart  种群占比堆叠面积图（0 ~ 100%）
 * 2. LineChart   每轮平均得分折线图
 * 均支持高分屏（DPR）、窗口缩放、长序列抽样绘制。
 * ========================================================= */

function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || 600;
  const h = canvas.clientHeight || 240;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}

const CHART = {
  padL: 40, padR: 10, padT: 12, padB: 24,
  ink: '#1c1917', grid: '#e9e3d6', tick: '#a8a29e', text: '#78716c',
};

/* 抽样下标：点太多时均匀取样，保证绘制性能 */
function sampleIndices(n, maxPoints = 700) {
  if (n <= maxPoints) return Array.from({ length: n }, (_, i) => i);
  const step = Math.ceil(n / maxPoints);
  const idx = [];
  for (let i = 0; i < n; i += step) idx.push(i);
  if (idx[idx.length - 1] !== n - 1) idx.push(n - 1);
  return idx;
}

function drawAxes(ctx, w, h, maxGen, yMax, yFmt) {
  const { padL, padR, padT, padB } = CHART;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  ctx.strokeStyle = CHART.grid;
  ctx.lineWidth = 1;
  ctx.fillStyle = CHART.text;
  ctx.font = '11px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  // 横向网格 + y 刻度
  const yTicks = 5;
  for (let i = 0; i <= yTicks; i++) {
    const v = (yMax * i) / yTicks;
    const y = padT + plotH - (v / yMax) * plotH;
    ctx.beginPath();
    ctx.moveTo(padL, y + 0.5);
    ctx.lineTo(w - padR, y + 0.5);
    ctx.stroke();
    ctx.fillText(yFmt(v), padL - 6, y);
  }
  // x 刻度（约 5 个）
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const xTicks = Math.min(5, Math.max(1, Math.floor(plotW / 90)));
  for (let i = 0; i <= xTicks; i++) {
    const g = Math.round((maxGen * i) / xTicks);
    const x = padL + (g / maxGen) * plotW;
    ctx.fillText(String(g), x, h - padB + 6);
  }
  // 轴
  ctx.strokeStyle = CHART.tick;
  ctx.beginPath();
  ctx.moveTo(padL + 0.5, padT);
  ctx.lineTo(padL + 0.5, h - padB + 0.5);
  ctx.lineTo(w - padR, h - padB + 0.5);
  ctx.stroke();
}

function drawEmpty(ctx, w, h, text) {
  ctx.fillStyle = CHART.text;
  ctx.font = '13px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2);
}

/* ---------------- 堆叠面积图 ---------------- */
class StackChart {
  constructor(canvas, strategies) {
    this.canvas = canvas;
    this.strategies = strategies;
    this.data = [];
    this.redraw = () => this.draw();
    window.addEventListener('resize', this.redraw);
  }
  setData(history) {
    this.data = history;
    this.draw();
  }
  draw() {
    const { ctx, w, h } = setupCanvas(this.canvas);
    if (!this.data.length) {
      drawEmpty(ctx, w, h, '按「开始演化」后，这里会绘制种群占比的变迁');
      return;
    }
    const { padL, padR, padT, padB } = CHART;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;
    const n = this.data.length;
    const maxGen = Math.max(1, this.data[n - 1].gen);
    const idxs = sampleIndices(n);

    // 计算每个抽样点的累计占比（自底向上堆叠）
    const stacks = idxs.map((i) => {
      let acc = 0;
      const bands = this.strategies.map((s, k) => {
        const v = this.data[i].shares[k];
        const lo = acc;
        acc += v;
        return { k, lo, hi: acc };
      });
      return { gen: this.data[i].gen, bands };
    });

    const x = (g) => padL + (g / maxGen) * plotW;
    const y = (v) => padT + plotH - v * plotH;

    // 从上层往底层画（底层在最上面遮住即可，直接按顺序画）
    for (let s = 0; s < this.strategies.length; s++) {
      ctx.beginPath();
      const first = stacks[0].bands[s];
      ctx.moveTo(x(stacks[0].gen), y(first.hi));
      for (const st of stacks) ctx.lineTo(x(st.gen), y(st.bands[s].hi));
      for (let i = stacks.length - 1; i >= 0; i--) {
        ctx.lineTo(x(stacks[i].gen), y(stacks[i].bands[s].lo));
      }
      ctx.closePath();
      ctx.fillStyle = this.strategies[s].color;
      ctx.globalAlpha = 0.88;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    drawAxes(ctx, w, h, maxGen, 1, (v) => `${Math.round(v * 100)}%`);
  }
}

/* ---------------- 折线图 ---------------- */
class LineChart {
  constructor(canvas, strategies) {
    this.canvas = canvas;
    this.strategies = strategies;
    this.data = [];
    this.redraw = () => this.draw();
    window.addEventListener('resize', this.redraw);
  }
  setData(history) {
    this.data = history;
    this.draw();
  }
  draw() {
    const { ctx, w, h } = setupCanvas(this.canvas);
    if (!this.data.length) {
      drawEmpty(ctx, w, h, '这里会绘制各策略的每轮平均得分');
      return;
    }
    const { padL, padR, padT, padB } = CHART;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;
    const n = this.data.length;
    const maxGen = Math.max(1, this.data[n - 1].gen);
    const yMax = Math.max(3, Math.ceil(Math.max(...this.data.map((d) => Math.max(...d.fit))) + 0.5));
    const idxs = sampleIndices(n);

    const x = (g) => padL + (g / maxGen) * plotW;
    const y = (v) => padT + plotH - (v / yMax) * plotH;

    this.strategies.forEach((s, k) => {
      const pts = idxs.map((i) => [x(this.data[i].gen), y(this.data[i].fit[k])]);
      if (pts.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 1.6;
      ctx.lineJoin = 'round';
      ctx.stroke();
    });

    // 群体平均：加粗墨线
    ctx.beginPath();
    idxs.forEach((i, n2) => {
      const px = x(this.data[i].gen);
      const py = y(this.data[i].mean);
      if (n2 === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 2.4;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    drawAxes(ctx, w, h, maxGen, yMax, (v) => v.toFixed(0));
  }
}
