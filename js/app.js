/* =========================================================
 * app.js —— 页面总装：控制台 ↔ 引擎 ↔ 图表
 * ========================================================= */

(function () {
  const el = (id) => document.getElementById(id);

  /* ---------- 预设 ---------- */
  const PRESETS = {
    equal: { label: '七雄并立', shares: { allc: 1, tft: 1, gtft: 1, grudge: 1, pavlov: 1, random: 1, alld: 1 } },
    invasion: { label: '掠夺者入侵', shares: { allc: 6, tft: 0, gtft: 0, grudge: 0, pavlov: 0, random: 0, alld: 4 } },
    'tft-vs-alld': { label: '以牙还牙 vs 掠夺者', shares: { allc: 0, tft: 5, gtft: 0, grudge: 0, pavlov: 0, random: 0, alld: 5 } },
    tournament: { label: '复刻 1980 锦标赛', shares: { allc: 15, tft: 20, gtft: 10, grudge: 10, pavlov: 10, random: 10, alld: 25 } },
  };

  /* ---------- 状态 ---------- */
  const state = {
    running: false,
    rafId: null,
    sim: null,
    lastShares: null,
  };

  const opts = {
    T: 5, R: 3, P: 1, S: 0,
    rounds: 100, noise: 0.02, extinct: false, speed: 8,
    payoff: buildPayoff(5, 3, 1, 0),
  };

  /* ---------- 图例 ---------- */
  const legend = el('legend');
  STRATEGIES.forEach((s) => {
    const chip = document.createElement('span');
    chip.className = 'legend-chip';
    chip.innerHTML = `<i style="background:${s.color}"></i>${s.name}`;
    legend.appendChild(chip);
  });

  /* ---------- 策略图鉴卡片 ---------- */
  const cardsBox = el('strategyCards');
  STRATEGIES.forEach((s) => {
    const card = document.createElement('article');
    card.className = 'strategy-card card';
    card.innerHTML = `
      <div class="sc-head">
        <span class="sc-dot" style="background:${s.color}"></span>
        <h3>${s.name}</h3>
        <span class="sc-en">${s.en}</span>
      </div>
      <p class="sc-motto" style="color:${s.color}">「${s.motto}」</p>
      <p class="sc-desc">${s.desc}</p>`;
    cardsBox.appendChild(card);
  });

  /* ---------- 初始种群滑杆 ---------- */
  const slidersBox = el('shareSliders');
  const sliders = {};
  STRATEGIES.forEach((s) => {
    const row = document.createElement('label');
    row.className = 'share-row';
    row.innerHTML = `
      <span class="share-name"><i style="background:${s.color}"></i>${s.name}</span>
      <input type="range" min="0" max="100" step="1" value="14" data-id="${s.id}" />
      <output class="share-val num">14</output>`;
    slidersBox.appendChild(row);
    const input = row.querySelector('input');
    const out = row.querySelector('output');
    sliders[s.id] = { input, out };
    input.addEventListener('input', () => {
      out.textContent = String(input.value);
    });
  });

  function setPreset(name) {
    const preset = PRESETS[name];
    STRATEGIES.forEach((s) => {
      const v = Math.round((preset.shares[s.id] || 0) * 20);
      sliders[s.id].input.value = v;
      sliders[s.id].out.textContent = String(v);
    });
  }
  document.querySelectorAll('.preset').forEach((btn) => {
    btn.addEventListener('click', () => {
      setPreset(btn.dataset.preset);
      resetSim();
    });
  });
  setPreset('tournament');

  function currentWeights() {
    return STRATEGIES.map((s) => Number(sliders[s.id].input.value) || 0);
  }

  /* ---------- 参数读取与校验 ---------- */
  function readPayoff() {
    const T = parseFloat(el('payT').value);
    const R = parseFloat(el('payR').value);
    const P = parseFloat(el('payP').value);
    const S = parseFloat(el('payS').value);
    const valid = [T, R, P, S].every((v) => Number.isFinite(v)) && T > R && R > P && P > S;
    el('payWarn').hidden = valid;
    if (!valid) return false;
    opts.T = T; opts.R = R; opts.P = P; opts.S = S;
    opts.payoff = buildPayoff(T, R, P, S);
    return true;
  }

  ['payT', 'payR', 'payP', 'payS'].forEach((id) => el(id).addEventListener('input', readPayoff));

  el('roundsRange').addEventListener('input', (e) => {
    opts.rounds = Number(e.target.value);
    el('roundsVal').textContent = String(opts.rounds);
  });
  el('noiseRange').addEventListener('input', (e) => {
    opts.noise = Number(e.target.value) / 100;
    el('noiseVal').textContent = `${e.target.value}%`;
  });
  el('speedRange').addEventListener('input', (e) => {
    opts.speed = Number(e.target.value);
    el('speedVal').textContent = String(opts.speed);
  });
  el('extinctCheck').addEventListener('change', (e) => {
    opts.extinct = e.target.checked;
  });

  /* ---------- 图表 ---------- */
  const stackChart = new StackChart(el('stackChart'), STRATEGIES);
  const scoreChart = new LineChart(el('scoreChart'), STRATEGIES);

  /* ---------- 演化大事记 ---------- */
  const logBox = el('eventLog');
  function log(text) {
    if (logBox.querySelector('.log-empty')) logBox.innerHTML = '';
    const li = document.createElement('li');
    li.textContent = `第 ${state.sim.gen} 代 · ${text}`;
    logBox.prepend(li);
    while (logBox.children.length > 8) logBox.removeChild(logBox.lastChild);
  }

  function detectEvents() {
    const cur = state.sim.shares;
    const prev = state.lastShares || cur;
    STRATEGIES.forEach((s, i) => {
      const before = prev[i];
      const now = cur[i];
      if (before > 0.005 && now <= 0.0002) log(`${s.name} 灭绝了`);
      if (before <= 0.5 && now > 0.5) log(`${s.name} 占据了半壁江山`);
      if (before <= 0.9 && now > 0.9) log(`${s.name} 一统天下（占比 90%+）`);
    });
    state.lastShares = [...cur];
  }

  /* ---------- 战况榜 ---------- */
  function renderRanking() {
    const rows = STRATEGIES
      .map((s, i) => ({ s, share: state.sim.shares[i], fit: state.sim.history[state.sim.history.length - 1].fit[i] }))
      .sort((a, b) => b.share - a.share);
    const box = el('rankingBody');
    box.innerHTML = '';
    rows.forEach(({ s, share, fit }) => {
      const pct = Math.max(share * 100, 0.1);
      const row = document.createElement('div');
      row.className = 'rank-row';
      row.innerHTML = `
        <span class="rank-name"><i style="background:${s.color}"></i>${s.name}</span>
        <span class="rank-bar"><b style="width:${pct.toFixed(1)}%; background:${s.color}"></b></span>
        <span class="rank-share num">${(share * 100).toFixed(1)}%</span>
        <span class="rank-fit num">${share > 0.001 ? fit.toFixed(2) : '—'}</span>`;
      box.appendChild(row);
    });
    const last = state.sim.history[state.sim.history.length - 1];
    el('statGen').textContent = String(state.sim.gen);
    el('statMean').textContent = last.mean.toFixed(2);
    el('statAlive').textContent = String(state.sim.shares.filter((v) => v > 0.001).length);
  }

  function refresh() {
    stackChart.setData(state.sim.history);
    scoreChart.setData(state.sim.history);
    renderRanking();
  }

  /* ---------- 引擎控制 ---------- */
  function resetSim() {
    stop();
    readPayoff();
    state.sim = new Evolution(opts, STRATEGIES);
    state.sim.reset(currentWeights());
    state.lastShares = null;
    logBox.innerHTML = '<li class="log-empty">按下「开始演化」后，这里会记录灭绝与称霸事件。</li>';
    refresh();
  }

  function loop() {
    if (!state.running) return;
    for (let i = 0; i < opts.speed; i++) state.sim.step();
    detectEvents();
    refresh();
    state.rafId = requestAnimationFrame(loop);
  }

  function start() {
    if (state.running) return;
    state.running = true;
    el('btnRun').textContent = '暂停';
    el('btnRun').classList.add('running');
    state.rafId = requestAnimationFrame(loop);
  }

  function stop() {
    state.running = false;
    if (state.rafId) cancelAnimationFrame(state.rafId);
    state.rafId = null;
    const btn = el('btnRun');
    btn.textContent = '开始演化';
    btn.classList.remove('running');
  }

  el('btnRun').addEventListener('click', () => (state.running ? stop() : start()));
  el('btnStep').addEventListener('click', () => {
    stop();
    state.sim.step();
    detectEvents();
    refresh();
  });
  el('btnReset').addEventListener('click', resetSim);

  el('btnCsv').addEventListener('click', () => {
    if (!state.sim || state.sim.history.length < 2) return;
    const blob = new Blob(['\uFEFF' + state.sim.toCSV()], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evolution-data-gen${state.sim.gen}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });

  /* ---------- 首屏收益矩阵小交互 ---------- */
  document.querySelectorAll('.payoff-table--mini td').forEach((td) => {
    td.addEventListener('mouseenter', () => td.classList.add('hover'));
    td.addEventListener('mouseleave', () => td.classList.remove('hover'));
  });

  /* ---------- 启动 ---------- */
  resetSim();
})();
