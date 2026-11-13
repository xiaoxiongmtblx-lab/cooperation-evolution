/* =========================================================
 * strategies.js —— 策略库
 * 每个策略只需回答一个问题：这一轮，合作(C)还是背叛(D)？
 * decide(自己的历史, 对方的历史) -> 'C' | 'D'
 * 历史数组只包含「实际发生的动作」（含噪声后的结果）。
 * ========================================================= */

const MOVE = { COOP: 'C', DEFECT: 'D' };

const STRATEGIES = [
  {
    id: 'allc',
    name: '老好人',
    en: 'Always Cooperate',
    color: '#0d9488',
    motto: '无论如何，我都选择善意。',
    desc: '无条件合作。它是生态里的「献血者」：谁都能从它身上占到便宜，自己却拿不到任何额外回报。作为个体它脆弱，作为生态的养分它不可或缺。',
    decide: () => MOVE.COOP,
  },
  {
    id: 'tft',
    name: '以牙还牙',
    en: 'Tit for Tat',
    color: '#4f46e5',
    motto: '投桃报李，以直报怨。',
    desc: '第一步先合作，之后完全复制对方上一轮的动作。1980 年 Axelrod 锦标赛冠军，规则极简却极其强大：不惹事、不好欺、不计仇。',
    decide: (my, opp) => (opp.length ? opp[opp.length - 1] : MOVE.COOP),
  },
  {
    id: 'gtft',
    name: '宽恕者',
    en: 'Generous Tit for Tat',
    color: '#7c3aed',
    motto: '还击，但永远留一次原谅。',
    desc: '以牙还牙的宽容版：对方背叛后，仍有约 20% 的概率先伸出橄榄枝。在存在「误会」的嘈杂环境里，它比以牙还牙活得更好。',
    decide: (my, opp) => {
      if (!opp.length) return MOVE.COOP;
      const last = opp[opp.length - 1];
      if (last === MOVE.COOP) return MOVE.COOP;
      return Math.random() < 0.2 ? MOVE.COOP : MOVE.DEFECT;
    },
  },
  {
    id: 'grudge',
    name: '记仇者',
    en: 'Grudger',
    color: '#b45309',
    motto: '一次背叛，永不再信。',
    desc: '一直合作，直到对方背叛过一次——从此永远背叛。对老好人和同类非常友好，但一次误会就足以让它把盟友永久拉黑。',
    decide: (my, opp) => (opp.includes(MOVE.DEFECT) ? MOVE.DEFECT : MOVE.COOP),
  },
  {
    id: 'pavlov',
    name: '巴甫洛夫',
    en: 'Win-Stay, Lose-Shift',
    color: '#0369a1',
    motto: '赢了就照旧，输了就换招。',
    desc: '上一轮对方合作（自己「赚了」）就重复上一步，对方背叛（「亏了」）就换另一种打法。它会稳定剥削老好人，也能与合作者建立互惠。',
    decide: (my, opp) => {
      if (!my.length) return MOVE.COOP;
      const myLast = my[my.length - 1];
      const oppLast = opp[opp.length - 1];
      const winning = oppLast === MOVE.COOP; // 对方合作 = 上一轮收益满意
      if (winning) return myLast;
      return myLast === MOVE.COOP ? MOVE.DEFECT : MOVE.COOP;
    },
  },
  {
    id: 'random',
    name: '掷硬币者',
    en: 'Random',
    color: '#78716c',
    motto: '我出什么，我自己也不知道。',
    desc: '每轮等概率随机合作或背叛。谁也无法和它建立信任——包括它自己。常被当作生态里的「背景噪音」与搅局者。',
    decide: () => (Math.random() < 0.5 ? MOVE.COOP : MOVE.DEFECT),
  },
  {
    id: 'alld',
    name: '掠夺者',
    en: 'Always Defect',
    color: '#dc2626',
    motto: '世界对我客气，因为我从不手软。',
    desc: '无条件背叛。单次博弈里它是理性的；但在重复博弈的生态中，它屠杀自己赖以生存的合作者——杀掉会下金蛋的鹅。',
    decide: () => MOVE.DEFECT,
  },
];

/* 根据策略 id 查找 */
const strategyById = (id) => STRATEGIES.find((s) => s.id === id);
