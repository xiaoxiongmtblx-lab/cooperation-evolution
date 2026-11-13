/* =========================================================
 * simulation.js —— 演化引擎
 *
 * 流程（每个「代」）：
 *   1. 锦标赛：7 种策略两两对局（含自己打自己），
 *      得到每轮平均分矩阵 matrix[i][j] = 策略i 面对策略j 的每轮平均收益
 *   2. 适应度：fit[i] = Σ_j share[j] * matrix[i][j]
 *      （在当前种群分布下的期望每轮收益）
 *   3. 复制动态：share'[i] = share[i] * fit[i] / meanFit
 *      得分高于平均 → 比例上升；低于平均 → 下降
 *   4. 可选「火种」：给灭绝策略保留 0.3% 份额（模拟随机移民），
 *      让生态有机会恢复；也可选择让灭绝是永久的。
 * ========================================================= */

function buildPayoff(T, R, P, S) {
  // key = 我方动作 + 对方动作
  return {
    CC: [R, R], // 双方合作
    CD: [S, T], // 我合作，对方背叛
    DC: [T, S], // 我背叛，对方合作
    DD: [P, P], // 双方背叛
  };
}

const flipMove = (m) => (m === MOVE.COOP ? MOVE.DEFECT : MOVE.COOP);

/* 一场对局：a、b 各自出招 rounds 轮，带噪声（出招失手被翻转） */
function playMatch(a, b, opts) {
  const ha = [];
  const hb = [];
  let sa = 0;
  let sb = 0;
  for (let r = 0; r < opts.rounds; r++) {
    let ma = a.decide(ha, hb);
    let mb = b.decide(hb, ha);
    if (Math.random() < opts.noise) ma = flipMove(ma);
    if (Math.random() < opts.noise) mb = flipMove(mb);
    ha.push(ma);
    hb.push(mb);
    const pair = opts.payoff[ma + mb];
    sa += pair[0];
    sb += pair[1];
  }
  return { sa, sb };
}

function normalizeShares(arr) {
  const total = arr.reduce((s, v) => s + Math.max(0, v), 0);
  if (total <= 0) return arr.map(() => 1 / arr.length); // 全零兜底：均分
  return arr.map((v) => Math.max(0, v) / total);
}

class Evolution {
  constructor(opts, strategies) {
    this.opts = opts;
    this.strategies = strategies;
    this.history = [];
  }

  /* 用新的初始份额重置（opts 已由外部更新完毕） */
  reset(shares) {
    this.gen = 0;
    this.shares = normalizeShares(shares);
    this.matrix = this.computeMatrix();
    this.history = [];
    this.snapshot();
  }

  /* 锦标赛：两两对局，返回每轮平均分矩阵 */
  computeMatrix() {
    const n = this.strategies.length;
    const m = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      const self = playMatch(this.strategies[i], this.strategies[i], this.opts);
      m[i][i] = self.sa / this.opts.rounds;
      for (let j = i + 1; j < n; j++) {
        const res = playMatch(this.strategies[i], this.strategies[j], this.opts);
        m[i][j] = res.sa / this.opts.rounds;
        m[j][i] = res.sb / this.opts.rounds;
      }
    }
    return m;
  }

  /* 当前分布下的适应度与群体平均 */
  computeFitness() {
    const n = this.strategies.length;
    const fit = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      if (this.shares[i] <= 0) continue; // 已灭绝者适应度记 0
      let f = 0;
      for (let j = 0; j < n; j++) {
        if (this.shares[j] <= 0) continue;
        f += this.shares[j] * this.matrix[i][j];
      }
      fit[i] = f;
    }
    const mean = this.shares.reduce((s, p, i) => s + p * fit[i], 0);
    return { fit, mean };
  }

  /* 记录一代快照 */
  snapshot() {
    const { fit, mean } = this.computeFitness();
    this.history.push({
      gen: this.gen,
      shares: [...this.shares],
      fit,
      mean,
    });
  }

  /* 前进一代 */
  step() {
    this.matrix = this.computeMatrix();
    const { fit } = this.computeFitness();
    const total = this.shares.reduce((s, p, i) => s + p * fit[i], 0);

    if (total > 0) {
      let next = this.shares.map((p, i) => (p * fit[i]) / total);
      if (this.opts.extinct) {
        // 允许彻底灭绝：过小份额清零
        next = next.map((v) => (v < 1e-4 ? 0 : v));
      } else {
        // 保留 0.3% 火种（模拟随机移民），再归一化
        next = normalizeShares(next.map((v) => Math.max(v, 0.003)));
      }
      this.shares = next;
    }
    this.gen++;
    this.snapshot();
  }

  /* CSV 导出 */
  toCSV() {
    const head = ['gen', ...this.strategies.map((s) => `占比_${s.name}`), ...this.strategies.map((s) => `得分_${s.name}`), '群体平均分'];
    const lines = [head.join(',')];
    for (const h of this.history) {
      const row = [h.gen, ...h.shares.map((v) => v.toFixed(5)), ...h.fit.map((v) => v.toFixed(3)), h.mean.toFixed(3)];
      lines.push(row.join(','));
    }
    return lines.join('\n');
  }
}
