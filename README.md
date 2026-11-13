# 演化实验场 Evolution Arena

一个**零依赖、双击即玩**的交互式教学网页：通过模拟「重复囚徒困境」的长期演化，
探索博弈策略（以牙还牙、掠夺者、老好人……）在种群中的兴衰规律。

> 灵感来源：Robert Axelrod 1980 年的计算机锦标赛与《合作的进化》。

## 怎么运行

**方式一（最简单）**：直接双击 `index.html`，浏览器打开即用。

**方式二（推荐，更接近真实开发）**：在本目录起一个本地服务器：

```bash
# 任选其一
python -m http.server 8000        # 需要 Python
npx serve .                       # 需要 Node.js
```

然后访问 `http://localhost:8000`。

## 页面功能

| 模块 | 内容 |
|---|---|
| 知识讲解 | 囚徒困境原理、重复如何改变博弈、复制动态规则 |
| 模拟实验台 | 7 种策略 × 锦标赛 × 复制动态，含种群占比堆叠图、得分折线图、CSV 导出 |
| 策略图鉴 | 每种策略的性格、规则与生态位说明 |
| 亲自上场 | 人机对弈 20 轮，终局给出针对该策略的知识点评 |
| 演化启示 | 四条可迁移到现实世界的结论 + 延伸阅读 |

## 建议实验

1. **掠夺者入侵**：只放老好人 + 掠夺者，看背叛的短期繁荣与长期自毁
2. **复刻 1980 锦标赛**：观察以牙还牙如何登顶
3. **嘈杂的世界**：噪声调到 10%，比较以牙还牙 vs 宽恕者的存活
4. **合作崩塌**：把 R 从 3 改成 2（2R ≤ T），看生态滑向全员背叛

## 目录结构

```
cooperation-evolution/
├── index.html          # 页面结构（唯一入口）
├── css/style.css       # 全部样式（实验记录本风格）
└── js/
    ├── strategies.js   # 策略库：每个策略一个 decide 函数
    ├── simulation.js   # 引擎：对局、适应度、复制动态
    ├── charts.js       # 手写 Canvas 图表（无第三方库）
    ├── minigame.js     # 亲自上场模块
    └── app.js          # 控制台接线与渲染
```

想加新策略？打开 `js/strategies.js`，照抄一个对象、写好 `decide()` 即可，图表和战况榜会自动识别。

## 把它发布到 GitHub Pages

```bash
git init
git add .
git commit -m "feat: 囚徒困境演化实验场 v1.0"
git branch -M main
git remote add origin https://github.com/<你的用户名>/cooperation-evolution.git
git push -u origin main
```

然后在仓库页面：**Settings → Pages → Branch 选 `main` → Save**，
几分钟后就能通过 `https://<你的用户名>.github.io/cooperation-evolution/` 访问。

## License

MIT
