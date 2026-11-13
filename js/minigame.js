/* =========================================================
 * minigame.js —— 亲自上场：人机对弈 20 轮
 * 你 vs 任一经典策略。策略看到的和你看到的一样：
 * 只有实际发生过的出招历史，没有作弊。
 * ========================================================= */

(function () {
  const TOTAL_ROUNDS = 20;
  const PAY = buildPayoff(5, 3, 1, 0);

  const el = (id) => document.getElementById(id);
  const oppSelect = el('mgOppSelect');
  const oppDesc = el('mgOppDesc');
  const myScoreEl = el('mgMyScore');
  const oppScoreEl = el('mgOppScore');
  const oppNameEl = el('mgOppNameLabel');
  const roundEl = el('mgRound');
  const lastEl = el('mgLast');
  const historyEl = el('mgHistory');
  const resultEl = el('mgResult');
  const btnCoop = el('mgCoop');
  const btnDefect = el('mgDefect');
  const btnRestart = el('mgRestart');

  let opp = null;
  let myHist = [];
  let oppHist = [];
  let myScore = 0;
  let oppScore = 0;
  let round = 0;
  let over = false;

  /* 填充下拉框 */
  STRATEGIES.forEach((s) => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = `${s.name}（${s.en}）`;
    oppSelect.appendChild(opt);
  });
  oppSelect.value = 'tft';

  function reset() {
    opp = strategyById(oppSelect.value);
    myHist = [];
    oppHist = [];
    myScore = 0;
    oppScore = 0;
    round = 0;
    over = false;
    myScoreEl.textContent = '0';
    oppScoreEl.textContent = '0';
    oppNameEl.textContent = opp.name;
    oppDesc.innerHTML = `<b style="color:${opp.color}">${opp.motto}</b><br />${opp.desc}`;
    roundEl.textContent = `第 1 / ${TOTAL_ROUNDS} 轮 · 等待你出招`;
    lastEl.textContent = '选择合作或背叛，开始第一轮。';
    historyEl.innerHTML = '';
    resultEl.hidden = true;
    btnCoop.disabled = false;
    btnDefect.disabled = false;
  }

  function moveBadge(m, who) {
    const coop = m === MOVE.COOP;
    return `<span class="badge ${who} ${coop ? 'b-coop' : 'b-defect'}">${coop ? '合作' : '背叛'}</span>`;
  }

  function play(myMove) {
    if (over) return;
    const oppMove = opp.decide(oppHist, myHist);
    myHist.push(myMove);
    oppHist.push(oppMove);
    const pair = PAY[myMove + oppMove];
    myScore += pair[0];
    oppScore += pair[1];
    round++;

    myScoreEl.textContent = String(myScore);
    oppScoreEl.textContent = String(oppScore);
    roundEl.textContent = `第 ${Math.min(round + 1, TOTAL_ROUNDS)} / ${TOTAL_ROUNDS} 轮`;

    const mine = myMove === MOVE.COOP ? '你选择合作' : '你选择背叛';
    const theirs = oppMove === MOVE.COOP ? '对方合作' : '对方背叛';
    lastEl.innerHTML = `${mine}，${theirs} —— 你 +${pair[0]} 分，对方 +${pair[1]} 分。`;

    const chip = document.createElement('div');
    chip.className = 'mg-chip';
    chip.innerHTML = `<em>R${round}</em> ${moveBadge(myMove, 'me')} ${moveBadge(oppMove, 'opp')}`;
    historyEl.appendChild(chip);
    historyEl.scrollTop = historyEl.scrollHeight;

    if (round >= TOTAL_ROUNDS) finish();
  }

  /* 终局点评：按对手类型给出知识性总结 */
  function verdictText() {
    const iDefected = myHist.filter((m) => m === MOVE.DEFECT).length;
    const base = `终局比分 —— 你 ${myScore} : ${oppScore} ${opp.name}。`;
    const tips = {
      allc: `你从老好人身上榨到了 ${myScore} 分。爽吗？去实验台用「掠夺者入侵」预设看看：当所有人都这么做，老好人灭绝之后，掠夺者之间只剩 1 分 1 分的内耗。`,
      alld: `面对掠夺者，背叛是唯一不吃亏的回应——这正是单次囚徒困境的「理性困境」。但留意：如果博弈会重复，且对方认得出你，情况就完全不同了。`,
      tft: `和以牙还牙对局，你几乎占不到便宜：你合作它就合作（各 3 分），你背叛它立刻奉还（各 1 分）。稳定、清醒、不好惹——这就是它 1980 年夺冠的原因。`,
      gtft: `宽恕者会原谅你偶尔的背叛，但持续背叛会被持续反击。它证明了：还击 + 适度原谅，比纯以牙还牙更能穿越误会。`,
      grudge: `你背叛过 ${iDefected} 次。${iDefected > 0 ? '记仇者的账本永远记着那一次——从那之后每一轮都是互相伤害。信任一旦打碎，重建成本极高。' : '你对它全程合作，于是收获了 20 轮稳定的双赢。信任被善待时非常坚固。'}`,
      pavlov: `巴甫洛夫跟着你的行为切换模式：你合作它就锁定合作，你背叛它立刻换打法。它对老好人却会持续剥削——「见人下菜碟」的策略。`,
      random: `对面是台老虎机，这局纯属运气。但注意实验台里它的作用：噪音让所有精细策略都失去准星。`,
    };
    return `${base}<br />${tips[opp.id] || ''}`;
  }

  function finish() {
    over = true;
    btnCoop.disabled = true;
    btnDefect.disabled = true;
    roundEl.textContent = `对局结束 · 共 ${TOTAL_ROUNDS} 轮`;
    resultEl.innerHTML = verdictText();
    resultEl.hidden = false;
  }

  btnCoop.addEventListener('click', () => play(MOVE.COOP));
  btnDefect.addEventListener('click', () => play(MOVE.DEFECT));
  btnRestart.addEventListener('click', reset);
  oppSelect.addEventListener('change', reset);

  reset();
})();
