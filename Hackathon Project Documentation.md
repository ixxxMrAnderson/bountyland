# Project Codename: BountyLand

## 候选项目名

| 候选名 | 方向 | 备注 |
|---|---|---|
| **BountyLand** | 最高优先级: Wanted 订单 + Killer Agent 大厅 | 计算订单像 wanted bounty, 用户悬赏问题; 我们和市场上的 Agent / 人类 solver 进入大厅接单、解决、被评审、被结算 |
| **AgentForge** | Agent 发布 + 任务解决平台 | 强调我们不只是任务市场, 也是 Agent 被设计、发布、评审和变现的地方 |
| **ProofAgents** | 可验证 Agent 网络 | 强调 Agent 输出需要被公开评审、评分和结算 |
| **DebugArena** | Debug / Audit 起步场景 | 适合把 Debug Agent 作为首个核心叙事, 但未来扩展性略窄 |
| **ComputeForge** | 通用计算任务平台 | 强调 general computation, 偏基础设施 |
| **AgentArena** | Agent 竞技与评审市场 | 强调多 Agent 竞争、open review、reward split |
| **TaskForge** | 任务定义 + Agent 执行 | 更偏任务协议, 品牌感中性 |
| **OpenAgentWorks** | 开放 Agent 工坊 | 强调第三方 Agent 发布和开放评审 |
| **AgentProof Market** | Agent 结果证明市场 | 直白表达 proof/review/settlement, 但名字稍长 |

**优先项目名: BountyLand**

> BountyLand 是一个面向通用计算任务的开放 Agent bounty platform：用户把计算问题发布成 wanted order, Agent / 人类 solver 接单解决, 社区与 AI 共同评审结果, 链上完成奖励托管与结算。

**Slogan: We will make it clean.**

黑客松目标: Demo 以智能合约审计 / Debug 作为首个垂直场景, 把 **Web3 安全审计和复杂代码 Debug "贵、慢、不可信"** 这个行业级痛点, 做成一个 **去中心化、多 Agent 协同解决、开放评审、人工兜底、链上结算** 的开放 bounty land。Demo 用 smart contract audit / debug 作为第一个落地 vertical, 但底层是 **general computation task protocol + agent publishing platform + bounty marketplace**。

---

## 1. 痛点 (Why this matters)

> 这一节是整个文档的核心 — 痛点越大、越被大家熟知, 解决方案就越有价值。

### 1.1 行业级痛点: Web3 安全审计供不应求

这是目前整个加密行业最被广泛认知、最常被引用、损失最惨重的痛点之一:

- **黑客攻击 / Rug Pull 频发, 损失巨大**  
  公开行业经验与多家安全机构 (如 SlowMist, CertiK, PeckShield, Chainalysis 等历史报告) 长期显示: Web3 行业每年因合约漏洞、桥漏洞、私钥泄露、钓鱼等事件造成的损失, 累计已达 **数百亿美元** 量级. 单一年度的损失也常以 **数十亿美元** 计.  
  (注: 出于严谨, 我们不在文档中给出未经验证的精确数字, 仅以 "billions of dollars lost historically" 描述, 实际 pitch 时可引用你确认过的具体报告.)

- **审计供给严重不足**  
  顶级安全公司档期通常排到几个月之后, 中小项目方根本排不上. 一个完整审计报价动辄 **几万到几十万美元**, 而且交付周期长, 反馈循环慢.

- **审计质量本身不可信**  
  即使做了审计, 项目方也无法保证: 审计员是否真的仔细看? 是否漏掉关键漏洞? 不同审计公司标准不一, 业内还有 "audit theater" (走形式审计) 的批评. 历史上多个被审计过的合约, 上线后仍然被攻击, 这种案例在 DeFi 历史上不胜枚举.

- **单一审计师/单一模型天然有偏见和盲点**  
  不论是人力审计师, 还是单一 AI 模型 (例如某 LLM 跑一遍代码), 都存在认知偏差、知识盲区和攻击模式库不全的问题. 没有一个"对手方机制" 互相校验.

- **赏金 / Bug Bounty 平台也只是事后兜底**  
  Immunefi 等平台已经在做 bug bounty, 但大多都是 **事后** 模式: 漏洞被利用 / 被白帽发现之后, 才触发奖励. 无法做到 **主动、持续、多方协同** 的审计.

### 1.2 由此衍生的"客户的真实损失"

如果客户 (Web3 项目方、DAO、基金会) 不解决这个问题, 会持续面临:

- **资金损失风险**: 一旦上线后被攻击, 损失动辄百万 / 千万美元级, 项目直接归零.
- **信任流失**: 用户和投资人看到 "未审计" 或 "审计仍被攻击" 的标签, 直接撤资撤户.
- **上线延期**: 排队等审计公司档期, 错过市场窗口.
- **审计预算失控**: 反复修复合规问题, 改一次就要重新审计, 成本成倍增加.

### 1.3 我们的判断: 痛点的本质是"评估机制 + 激励机制的缺失"

- **贵**: 因为没有开放的供给侧市场, 价格被少数审计公司垄断.
- **慢**: 因为评估是单点、串行、人力密集.
- **不可信**: 因为没有多方校验 + 透明激励.

> 核心论点: **审计不是"少一个审计师"的问题, 是"评估 + 激励"基础设施的问题**.  
> 而多 Agent + AI Audit + 人工兜底 + 链上结算, 正好可以补足这一层基础设施.

---
## 2. 解决方案: BountyLand 是什么

**BountyLand = 一个开放的计算 bounty 平台。用户把计算问题发布成 wanted order, 我们的 killer Agent 和市场上的 solver 进入大厅接单, 结果经过 open review 后按贡献度结算。**

- **Wanted Order Layer**: 计算订单被包装成 wanted bounty。用户不是填一张冷冰冰的外包表单, 而是在 BountyLand 发布一个明确的问题、证据、验收标准和赏金.
- **Killer Agent Layer**: 我们会不断推出各个专项的 killer Agent。比如 Demo 叙事里的 Debug Agent, 就是第一个 Hall of Fame killer: 专门清理复杂 bug、审计线索和代码问题.
- **Open Review Layer**: 每个 killer Agent 的输出都可以被公开 review、challenge、评分和复盘。我们会用这些 review 信号不断训练、迭代和升级自己的 killer Agent.
- **Marketplace Layer**: 订单也可以进入大厅, 让市场上的人类专家、第三方 Agent 和工具型 solver 接单。平台负责撮合交易、评审结果、维护声誉和完成结算.
- **底层 (General)**: 我们做的是一个 general computation task protocol — 任何需要"Agent / solver 解决问题 + 多方评估 + 公平奖励"的计算任务都可以跑在上面.
- **首个 Vertical (Demo)**: 智能合约审计 / Debug / 漏洞检测 — 因为它 **价值高、痛点强、结果可验证**, 适合作为黑客松 showcase.
- **未来**: 拓展到 bug bounty 持续监控、代码审查、模型评测、benchmark 求解、数据标注、数据集构建等.

### 2.1 一句话价值主张

> Post a wanted order. Let our killer Agents and the open market solve it. Review the evidence. Settle the bounty. We will make it clean.

### 2.2 核心业务升级: 从"计算外包"到"BountyLand"

原始叙事是 **compute outsourcing platform**: 用户发布任务, 矿工 / Agent 完成任务, 验证者评分, 链上结算。升级后的叙事是 **BountyLand**:

```text
User has a hard computation problem
        ↓
User posts a wanted order with reward + acceptance criteria
        ↓
BountyLand routes it to Hall of Fame killer Agents and the open market
        ↓
BountyLand-owned killers, third-party Agents, and human solvers submit solutions
        ↓
Open review + AI reference score + human judge evaluate evidence
        ↓
Reward, reputation, and rankings are settled transparently
```

这让平台不只是一个"任务市场", 而是一个 **wanted order hall + killer Agent hall of fame + open review + settlement network**:

- **我们发布自己的 killer Agent**: 例如 Debug Agent, 作为第一个 Hall of Fame killer, 直接帮用户定位代码问题、解释 bug、生成 patch suggestion、输出复现证据.
- **我们持续训练和迭代 killer**: killer Agent 的每次输出都进入 review, 形成数据闭环。好结果强化, 错误结果复盘, 版本持续升级.
- **第三方发布 Agent**: 其他团队可以发布 audit agent、data agent、benchmark solver、model evaluator、security scanner 等, 接入平台任务流.
- **开放评审 Agent 输出**: Agent 的结果不是黑盒交付, 而是被 AI reference、Validator、用户和社区共同审查.
- **Agent 积累声誉**: 每个 Agent 都有能力标签、历史任务、通过率、争议率、平均评分、收益记录.
- **订单进入大厅由市场接单**: 如果不是我们自研 killer 直接解决, 订单也可以进入公开大厅, 由市场上的 solver 竞争接单; 平台负责促成交易、验收与结算.
- **任务和 killer 双边增长**: 更多 wanted order 训练更强 killer, 更强 killer 吸引更多用户发布更高价值订单.

### 2.3 与现状对比 (Before / After)

| 维度 | 现状 (传统审计) | BountyLand |
|---|---|---|
| 供给 | 少数几家头部公司 / 单点 AI 工具 | Hall of Fame killer Agent + third-party Agent + 人类专家 |
| 时间 | 数周~数月 | 数小时~数天 (并行 + 评估自动化) |
| 成本 | $50k~$200k+ | 灵活 (按任务定价 + 链上 escrow) |
| 评估方式 | 单审计师 / 单一 AI | 多 Agent 并行 + AI Audit 互相校验 + open review + Human Judge |
| 透明度 | 黑盒 (客户看不到审计过程) | 评分、理由、reward split 全部链上可查 |
| 激励 | 一次性付费 | 持续贡献者可通过 reputation / ranking 长期获利 |
| 信任 | 靠品牌 | 靠机制: 多方校验 + 偏差检测 + 链上结算 |
| Agent 生态 | 工具分散, 难比较 | Agent 可发布、可调用、可评审、可积累声誉 |

---

## 3. 产品形态: 客户如何用 BountyLand

### 3.1 客户 (Web3 项目方) 视角的工作流

# AI x Human 联合审计工作流 (Workflow)

## 1. 需求提交与标准定制 (Demand Submission & AI Refinement)
* **用户输入**：客户在前端提交初步的审计需求（如合约代码、GitHub Repo、Bug Log 或 Debug 描述）。
* **AI 引导细化**：系统通过一个内置的 **AI Chatbot** 与客户交互，引导并帮助客户最终确定（Finalize）具体的评估标准（如漏洞严重度、复现步骤、PoC 要求）以及相应的奖励发放机制。

## 2. 资金托管与双轨奖池充值 (Dual-Pool Deposit & Escrow)
为了明确 AI 与人工 Miner 的结算机制，资金将进入智能合约托管，并分为两个独立的奖池：
* **Pool A (AI Miner 驱动资金)**：客户提前预支的固定费用，专门用于支付 AI Agent 的算力与运行成本。该部分的结算**不基于**工作质量，只要 AI 完成预设的分析任务即可触发分发。
* **Pool B (Human Miner 奖励资金)**：客户投入的悬赏奖池（Bounty Pool，如 0.1 ETH）。该部分的奖励数额严格**由人工 Miner 的最终工作质量**决定。

## 3. 任务派发与多方并发执行 (Task Distribution & Execution)
订单流转至任务大厅或由特定 Agent 认领，所有执行均在链下完成，完成后提交 Result URI 与内容 Hash：
* **自动化与 AI 阵营 (由 Pool A 驱动)**：
    * *Hall of Fame Debug Killer*：平台自研 Killer，优先进行自动化 Debug、漏洞分型（Triage）与 Patch 建议。
    * *Agent A（静态分析型）*：自动运行 Slither / Mythril 等安全工具。
    * *Agent B（LLM 推理型）*：基于大语言模型的漏洞深度推理。
    * *Agent D（第三方工具）*：其他外部安全扩展 Agent。
* **人工专家阵营 (由 Pool B 驱动)**：
    * *Agent C（人类安全专家）*：独立安全研究员或审计团队在大厅接单，产出人工审计报告。

## 4. 人工产出评估与验证 (Evaluation & Quality Scoring)
* **聚焦人工评分**：在此阶段，平台上的 Validator（验证者）或平台 AI Audit Reference **仅针对所有人工 Miner (Agent C) 的输出进行打分**。
* **偏差仲裁**：如果多方 Evaluator 对人工产出的评分出现严重偏差，或者平台 AI 评估结果与人类复核产生巨大鸿沟，将触发高级别的人工裁判（Human Judge）介入仲裁。

## 5. 加权评分与链上奖励分发 (Scoring & On-Chain Settlement)
* **Scoring Engine 结算**：计分引擎根据最终评分（FinalScore）计算出每位人工 Miner 应得的奖励份额。
* **多轨自动分发**：
    * **Pool A** 自动按运行状态结算给各个 AI/工具的提供方。
    * **Pool B** 链上合约严格按照加权比例，将悬赏金分发给对应的人工专家地址。

## 6. 交付"可验证"的多方联合审计报告 (Final Report Delivery)
客户最终拿到一份兼顾效率与安全深度的审计报告，报告包含：
* 完整的漏洞清单与 Patch 修复建议。
* **Pool A** 中各 AI 节点的自动化扫描与推理参考报告。
* **Pool B** 中人工专家的深度审计发现。
* 公开透明的“评分依据”与“奖池分发链上证明”，确保整个评估过程可追溯、可验证。

### 3.2 给客户的具体价值

- **减少资金损失风险**: 多个独立 Agent + 偏差检测机制, 大幅降低"漏报关键漏洞"的概率.
- **降低审计成本**: 开放供给侧, 客户可以灵活定价, 不再被头部公司绑死.
- **缩短上线周期**: 并行执行 + 自动评估, 从数周缩短到数天甚至数小时.
- **审计过程可追责**: 评分理由、reward split、reputation 全部链上可查, 避免 "走形式审计".
- **持续可扩展**: 客户可以一直挂着持续审计任务 (类似 bug bounty 升级版), 而不只是单次审计.

### 3.3 给 Agent (执行者) 的具体价值

- **变现通道**: 任何 AI Agent / 人类专家都可以接入, 提交审计结果换奖励.
- **声誉积累**: 长期高质量贡献的 Agent, 会在 reputation 系统里获得更高权重, 接更高价值任务.
- **公平激励**: reward 按贡献度分, 不靠关系、不靠中心化运营.
- **可组合**: Agent 不需要懂链上结算, 只需要提交 output, 链上结算由合约自动完成.

### 3.4 Agent 发布平台视角: 开发者如何发布自己的 Agent

平台的第二条核心业务线是 **Agent publishing**。开发者 / 团队可以把自己的 Agent 发布到平台, 让它在真实任务中被调用、被评审、被付费。

1. **注册 Agent Profile**  
   发布者提交 Agent 名称、任务类型、能力标签、输入输出 schema、调用方式、定价模式、版本号和维护者地址.

2. **声明能力边界**  
   Agent 需要明确自己能解决什么问题, 不能解决什么问题。例如:
   - smart contract vulnerability detection
   - code debug and patch suggestion
   - dataset cleaning
   - benchmark solving
   - model output evaluation

3. **接入任务流**  
   当用户发布匹配任务时, 平台可以自动推荐 Agent, 或由用户手动选择 Agent 参与.

4. **提交结果并接受 open review**  
   Agent 输出会被 AI reference score、Validator、人类 judge 或社区 review 评估。优秀结果获得奖励, 低质量结果影响 reputation.

5. **积累 reputation 与收益历史**  
   Agent 的历史通过率、争议率、任务收益、平均评分和擅长领域会公开展示, 形成可比较的 Agent marketplace.

### 3.5 Hall of Fame Killer: Debug Agent

Debug Agent 是 BountyLand 的第一个 Hall of Fame killer, 也是我们区别于普通计算外包平台的核心设计资产。

**Debug Agent 的定位**:

> 一个面向 Web3 / general codebase 的问题清理 Agent, 能够读取错误日志、源码、测试失败信息和用户描述, 输出 bug root cause、复现路径、patch suggestion 和验证步骤。它的承诺是: We will make it clean.

**在 Demo 叙事里的作用**:

- **作为首个 Hall of Fame killer**: 用户不是只看到一个空市场, 而是立刻能用我们自己发布的 Debug Agent 解决真实开发问题.
- **作为 killer 迭代样板**: Debug Agent 有清晰 profile、版本、能力边界、输入输出 schema、历史评分和 review 记录.
- **作为 open review 的对象**: Debug Agent 的输出会被其他 Agent / Validator / 用户评审, 展示"killer 也需要被审计和评分".
- **作为训练闭环入口**: 每一次 review、challenge、human judge 结果都会成为我们改进 Debug Agent 的反馈信号.
- **作为未来业务扩展入口**: 从 smart contract audit 扩展到 general debugging、CI failure diagnosis、security patch review、agentic code repair.

**Debug Agent 的标准输出**:

```text
Root cause:
  The exact reason the bug happens.

Evidence:
  File / function / log / test failure that supports the diagnosis.

Patch suggestion:
  Minimal code change or repair strategy.

Verification:
  Test command or reproduction step to confirm the fix.

Confidence:
  Agent self-estimated confidence and known uncertainty.
```

这条业务线让平台具有两个入口:

- **用户入口**: "我有一个复杂计算 / debug / audit 问题, 帮我发布 wanted order 或直接找 killer 解决."
- **开发者入口**: "我有一个 Agent, 帮我发布、获客、被评审、变现."

### 3.6 订单大厅: 市场如何接单

不是所有订单都必须由 BountyLand 自研 killer 直接解决。平台也允许订单进入公开大厅, 由市场上的人类专家、第三方 Agent 和工具团队接单。

- **平台负责撮合**: 根据任务类型、预算、deadline、隐私要求和 solver reputation 推荐合适接单方.
- **平台负责验收机制**: 统一任务 schema、输出格式、review 流程、challenge 流程和评分规则.
- **平台负责交易安全**: 赏金进入链上 escrow, 结果通过 review 后再结算.
- **平台负责长期声誉**: 高质量 solver 和 Agent 被沉淀进 leaderboard, 未来获得更多订单.

---
## 4. 核心 Features (产品功能列表)

我们把 Features 分成 **MVP (黑客松) / 短期 (3-6 月) / 中长期 (6-18 月)** 三档, 让评审一眼看出我们想清楚了产品演进路径.

### 4.1 MVP / Hackathon Demo Features (必须演示)

| Feature | 说明 | 给客户的价值 |
|---|---|---|
| **Wanted Order Submission** | 客户在前端发布 wanted order, 设置 bounty + rubric | 一键悬赏复杂计算问题, 几分钟完成 |
| **Hall of Fame Debug Killer** | 平台自带 Debug Agent, 可对 mock bug / audit issue 输出 root cause、evidence、patch suggestion | 评审能看到我们的 killer Agent 能力 |
| **Killer Profile Page** | 展示 Debug Killer / Audit Killer 的能力标签、版本、历史表现和 open review 记录 | 平台像 killer 大厅, 不只是任务表单 |
| **Wanted Order Hall** | 订单可以进入大厅, 由市场上的人类专家、第三方 Agent 和工具团队接单 | 平台负责促成交易, 供给侧自然生长 |
| **On-chain Reward Pool** | ETH/test token 充值到托管合约 | 资金安全, 不会被卷款 |
| **Multi-Agent Submission** | 多个 Agent (AI + 模拟人类) 并行提交审计 output | 并行审计, 速度快 |
| **Validator Scoring** | 评估者对每个 Agent output 打分 | 客户能看到评估过程 |
| **AI Audit Reference** | 独立 AI Agent 给 reference score, 检测 evaluator 偏差 | 防止"恶意打高分"或"漏报" |
| **Killer Open Review Feed** | 展示 killer / solver 输出、评分理由、争议和最终结算依据 | Agent 结果可被公开审查, 并反哺训练迭代 |
| **Human-in-the-loop** | 高偏差时触发 human judge | 兜底机制, 适合高价值任务 |
| **Weighted Scoring Engine** | FinalScore = w1*AI + w2*Human + w3*Reputation | 评分有依据, 可解释 |
| **On-chain Reward Distribution** | 合约按比例分发奖励 | 公平透明, 不可篡改 |
| **Demo Frontend** | 完整展示 wanted order / killer submit / open review / settle | 评审能完整看一遍流程 |
| **Mock Audit Scenario** | 模拟漏洞 + 模拟恶意 validator, 展示防御机制 | 客户能直观感受"我们能防住攻击" |

### 4.2 短期 Features (Post-Hackathon, 3-6 月)

| Feature | 说明 | 给客户的价值 |
|---|---|---|
| **Reputation System** | Agent 和 Validator 的长期声誉分 | 客户可以按 reputation 选 Agent |
| **Task Templates** | 内置 audit / code review / benchmark / labeling 等模板 | 客户不需要从零写任务 |
| **Staking & Slashing** | Validator 必须质押, 作弊被 slash | 进一步提升信任 |
| **Private Tasks** | 加密输入 + TEE, 适合企业级审计 | 大客户敢把代码放上来 |
| **Multi-AI Ensemble** | 多个 AI Auditor 投票, 降低单一 AI 偏差 | 评估更鲁棒 |
| **Audit Explanation** | AI 不只给分, 还给"为什么扣分"的解释 | 客户理解报告更轻松 |
| **Killer Hall of Fame** | 平台展示各专项 killer 的能力标签、版本、历史表现和收益记录 | 用户能快速选择可信 solver |
| **Agent Publishing SDK** | 第三方开发者可注册 Agent profile、输入输出 schema、callback endpoint | 外部 Agent 可以低成本接入 |
| **Open Review / Challenge System** | 用户和 Validator 可以 challenge Agent 输出, 胜出方影响 reputation 和 reward | 防止低质量 Agent 滥竽充数 |
| **Debug Killer v1** | 支持 CI failure、test failure、smart contract bug triage、patch suggestion | 从 audit 扩展到更通用的开发者问题 |
| **Killer Training Loop** | 将 open review、challenge、judge 结果沉淀为训练 / 评测数据 | 平台 killer 持续变强 |

### 4.3 中长期 Features (6-18 月)

| Feature | 说明 | 给客户的价值 |
|---|---|---|
| **Continuous Audit Mode** | 合约部署后持续审计 (类似升级版 bug bounty) | 上线后也持续保护 |
| **Confidential Compute (TEE)** | 审计在可信执行环境里跑, 代码不外泄 | 大客户可接受 |
| **Cross-chain Task Support** | 多链合约审计 | 覆盖更广 |
| **DAO Governance** | 协议参数由 DAO 治理 | 去中心化升级 |
| **Insurance Integration** | 接入 DeFi 保险, 审计通过的项目可买保险 | 形成"审计 + 保险"完整服务 |
| **Vertical Expansion** | audit → code review → model eval → labeling | 通用 computation protocol 完整化 |
| **Enterprise API** | 提供给企业客户的 SDK / API | 集成到客户 CI/CD 流程 |
| **BountyLand Revenue Share** | 平台成为 wanted order 发布、solver 接单、killer 调用和结算网络 | 形成订单侧 + killer / solver 侧双边平台 |
| **Agent Certification** | 对高质量 Agent 做安全认证、能力认证和版本审计 | 企业客户更敢使用外部 Agent |

---
## 5. 技术架构 (简化版, 给评审看)

> 这一节是技术骨干 — 让评审相信"方案能跑通". 详细接口和公式见附录.

### 5.1 一句话架构

> Wanted order 链下编排, killer / solver 链下执行, 输出开放评审, 资金链上托管, 结算链上分发；Agent 本身也作为可发布、可调用、可评审、可训练迭代的生产资产被平台管理.

### 5.2 架构图






### 5.3 关键流程 (Sequence)



### 5.4 评分公式 (Demo)

### 5.4 评分与奖励分配算法 (Algorithm)

系统采用动态权重清算机制。首先根据人工验证节点（Validator）与 AI 节点的评分差异（Delta）及验证者声誉（Trust），计算出最终的结算得分（FinalScore），再按比例分发奖励。

#### 1. 核心清算逻辑 (Pseudocode)

```python
# 计算人工评分与 AI 评分的绝对绝对绝对绝对误差
delta = abs(ValidatorScore - AIScore)

# 根据当前验证者的声誉值计算信任度权重
trust = ValidatorReputation / MAX_REP

# 动态权重清算分支
if delta <= 20:      
    FinalScore = ValidatorScore
elif delta <= 40:    
    FinalScore = trust * ValidatorScore + (1 - trust) * AIScore
else:                
    FinalScore = 0.25 * ValidatorScore + 0.75 * AIScore
```

#### 2. 奖励分发数学公式 (Mathematical Formula)

单个审计节点 $i$ 最终获得的奖励金计算公式如下：

$$ Reward_i = TotalReward \times \frac{FinalScore_i}{\sum_{j=1}^{N} FinalScore_j} $$


(参考 Bittensor 加权思想, Demo 简化版, 未来可替换.)

---
## 6. 商业模式与市场机会 (Why it can be a business)

### 6.1 客户 (谁会付钱)

- Web3 项目方 / 协议团队: 上线前必审计, 已有付费习惯
- DAO 基金会 / 协议治理: 持续监控预算
- DeFi / 桥 / 跨链项目: 风险高, 付费意愿强
- 交易所 / 钱包: 合作集成
- 传统企业 (链改): 私有任务 / TEE 需求
- Agent 开发者 / 安全团队: 需要发布 Agent、获得任务流量、建立 reputation
- 开发者团队 / DevTool 公司: 需要 Debug Agent、CI failure diagnosis、代码质量评估
- 公开市场 solver: 需要进入订单大厅接 wanted order 并获得可信结算

### 6.2 商业模式 (Post-Hackathon)

- Wanted order transaction fee: 每次 bounty reward 抽 5-10%
- Killer usage fee: 平台自研 Debug Killer / Audit Killer 被调用时收取基础服务费或 success fee
- Third-party Agent revenue share: 第三方 Agent 在平台上赚取 reward, 平台按成交抽佣
- Order Hall facilitation fee: 市场 solver 接单时, 平台从撮合、验收和结算中抽取服务费
- Premium Validators / Agents: 高级 reputation 排名订阅
- Agent Certification: 对 Agent 做能力认证、安全认证、企业可用性认证, 收取认证费 / 年费
- Enterprise API: 企业客户 SDK / CI/CD 集成
- Private Killer Deployment: 为企业部署私有 Debug Killer / Audit Killer / Code Review Killer
- Insurance + Audit 组合服务: 长期

### 6.3 市场体量 (公开行业经验, 避免编造数字)

- Web3 安全市场: 公开报告 (如慢雾、CertiK、Grand View 等) 长期把 Web3 安全行业描述为 数亿到数十亿美元年规模 的市场, 且仍在高速增长.
- 智能合约审计细分: 是其中最大、最刚需的子市场.
- Bug Bounty 子市场: Immunefi 等平台历史累计支付的 bug bounty 总额已达 数亿美元 量级, 验证了"安全任务有付费能力".
- AI Agent / DevTool 市场: 开发者已经习惯为 GitHub Copilot、CI、代码质量、安全扫描等工具付费, Debug Agent 可以切入现有开发工作流.

出处: 这些是行业广泛引用的"方向性"数据, 我们在正式 pitch 时会附上你确认过的具体报告链接.
  
---
## 7. 黑客松 Demo 范围 (5天交付矩阵)

为了在 5 天的黑客松期间实现最高效的交付，团队严格划分了产品边界，确保核心路演链路的绝对闭环。

### 7.1 Must-have (必须演示 - 核心交付)

以下功能在本次黑客松中**全部实现并现场演示**：

* [x] 🖥️ **完整前端交互**：覆盖 `发布 Wanted Order` ➔ `Killer / Solver 提交` ➔ `Validator 打分` ➔ `AI Audit` ➔ `最终结算` 的全套可视化 UI。
* [x] 🧩 **Hall of Fame Debug Killer 展示**：展示平台自研 Debug Killer 的 profile、能力边界、mock debug 输出与 review 记录。
* [x] **Wanted Order Hall 展示**：展示订单进入大厅后如何被市场 solver 接单, 以及平台如何促成交易。
* [x] 🤖 **多 Agent 并发提交**：模拟至少 2-3 个不同风格的 Agent（包括 `静态分析器` / `LLM 审计器` / `模拟人类专家`），展现去中心化协作。
* [x] 🧠 **AI Audit Reference**：独立的 AI 评分引擎，具备自动打分能力与**偏差检测**核心算法。
* [x] 🧾 **Open Review Feed**：展示 Agent 输出如何被评分、challenge、解释和最终结算。
* [x] 🛡️ **对抗性演示 (模拟恶意 Validator)**：现场演示恶意验证者故意给错分，并展示其如何被 `AI Audit` 智能识别并拦截。
* [x] ⛓️ **链上 RewardPool 合约**：基于 Solidity 实现的核心仓储合约，演示 `创建 pool` ➔ `资金充值` ➔ `链上自动结算`。
* [x] 🔄 **端到端完整闭环 (E2E)**：全流程一遍跑通，确保评委能在 3 分钟路演内看到完美的业务闭环。

---

### 7.2 Out-of-scope (明确不做 - 边界定义)

为了确保 5 天内的交付质量，以下高级特性**不包含**在本次黑客松 Demo 中（作为未来路线图）：

* [ ] 👥 **真实客户接入**：当前仅针对 Demo 环境进行闭门演示。
* [ ] 🔍 **真实漏洞挖掘**：Demo 阶段的核心数据采用 **Mock 数据**，不挂载真实生产环境漏洞。
* [ ] 💼 **Cobo / 托管机制集成**：暂不接入第三方中心化托管钱包。
* [ ] 📜 **链上 task registry**：任务生命周期暂在链下编排，避免链上Gas费高昂与效率低下。
* [ ] 📊 **完整 reputation / staking 系统**：验证者质押与信誉分惩罚机制暂做简化处理。
* [ ] 🔒 **TEE / 隐私保护**：源码与评分暂时全公开，不引入可信执行环境隐私计算。
* [ ] 🏛️ **DAO 治理体系**：不包含链上代币投票或去中心化治理逻辑。


### 7.3 五天计划 (团队 5 人)

团队采用敏捷开发模式，将 5 天冲刺目标与每日交付产物严格锚定，确保项目高效推进：



| 📅 Day | 🎯 核心目标 | 📦 关键交付产物 |
| :---: | :--- | :--- |
| **Day 1** | 痛点叙事、方案与架构冻结，写完基础文档 | `Pitch Deck v1`、系统总体架构图、智能合约接口定义 |
| **Day 2** | 后端任务编排 (`Orchestration`) + `RewardPool` 合约 v0 | 后端核心 API 接口、智能合约本地部署与初步测试 |
| **Day 3** | `Agent Pipeline` + `Debug Killer Profile` + `Wanted Order Hall` + `Validator UI` + `AI Audit` 数据 Mock | 多 Agent 异步提交、Debug Killer 展示页、订单大厅、评估全链路数据完整跑通 |
| **Day 4** | 评分清算引擎 (`Scoring Engine`) + `Settlement` 联调 + E2E 测试 | 端到端全流程一遍跑通、录制备份 `Demo` 演示视频 |
| **Day 5** | 前端 UI 细节打磨 + Pitch 路演反复演练 + 最终提交 | 线上最终 `Demo` 完美呈现、开源仓库完整技术文档 |

> 💡 **执行策略**：每日结束前进行线上 Sync 同步联调，由 2 位 PM 即时进行产物验收，确保技术研发（Day 2-4）与产品叙事完美契合，拒绝最后一刻的集成灾难。


---
## 8. 团队介绍 (Team Configuration)

项目由 5 人黑客松全功能团队紧密协作完成，核心分工与职责如下：


| 角色岗位 | 人数 | 核心职责划分 | 负责模块 |
| :--- | :---: | :--- | :--- |
| 👑 **Tech Lead / 全栈架构** | 1 | 系统设计 + 合约开发 + 全局集成协调 | 整体架构、`RewardPool` 智能合约 |
| 🎨 **Frontend Developer** | 1 | UI 界面实现 + 业务任务流交互 | 前端看板、`Leaderboard` 交互、用户前端 |
| ⚙️ **Backend Developer** | 1 | 任务编排 (Orchestration) + 评分引擎 | 链下管理系统、`Scoring Engine` 权重算法 |
| 🎯 **Product / PM** | 2 | 用户流程 + 痛点叙事 + Demo story + 界面打磨 + Pitch deck | 需求定义、产品体验、黑客松 Pitch 逻辑与路演设计 |

> 💡 **团队协作模式**：技术线（3 人）专注于系统底层、智能合约与前端交互的高效研发与集成；产品线（2 人）强强联手，全方位打磨用户旅程、产品细节、项目叙事及商业路演（Pitch），确保技术硬核的同时具备极高的商业完成度。


---
## 9. 风险与缓解 (Risks)

| 风险 (Risks) | 缓解措施 (Mitigations) |
| :--- | :--- |
| **痛点被低估，客户不买账** | 公开报告 + 真实攻击案例佐证 (黑客松后) |
| **Killer / Solver 输出质量参差，评分难统一** | AI Audit + Human Judge + 任务模板化 |
| **低质量第三方 Agent 涌入** | Agent profile 审核 + open review + reputation + challenge 机制 |
| **Hall of Fame killer 表现不足影响叙事** | Debug Killer 在 Demo 中使用可控 mock case，输出 root cause / evidence / patch suggestion 的完整闭环 |
| **评估者与 Agent 合谋** | Reputation + Staking (中后期) + 偏差检测 |
| **真实漏洞验证困难** | PoC / test failure / 复现步骤作为评估标准 |
| **隐私问题 (企业客户)** | 中后期引入 TEE / 加密输入 |
| **Demo 效果不够震撼** | 准备 1-2 个"被 AI Audit 抓住恶意 validator"的精彩场景 |

---
## 10. Open Questions (留给团队继续讨论)

* **目标客户**：付费用户优先级：协议项目方 vs DAO 基金 vs 跨链桥 vs 交易所？
* **首发赛道**：第一个 vertical：Smart Contract Audit vs Code Review vs Benchmark？
* **评分机制**：评分公式：Demo 简化版 vs 生产级需要加入哪些 Anti-collusion（防合谋）机制？
* **准入门槛**：评估者 / Agent 的准入门槛与 Staking 比例如何设定？
* **Agent 审核**：第三方 Agent / Solver 发布是否需要审核，还是完全 Permissionless（无许可）？
* **产品叙事**：Debug Killer 是否作为第一优先级 Hall of Fame killer，还是与 Audit Killer 并列展示？
* **信息公开**：Agent open review 的结果是否应该完全公开，企业私有任务如何处理？
* **认证体系**：Agent certification 是平台中心化认证，还是逐步 DAO / Reputation 化？
* **隐私与安全**：私有任务 / 加密输入是否需要早期支持？
* **后续推进**：黑客松后是否立刻接触 1-2 个真实项目做 Pilot（试点）？
* **商业模式**：商业模式抽佣比例如何定？
* **生态集成**：Cobo / Custody 集成是否在企业版本需要？
* **需求转化**：原始技术文件中的 remaining items 是否需要转成产品需求？

---
## 11. 附录: 技术细节 (供评审深入了解)
这一节是技术骨架的浓缩版, 详细接口/公式都按之前讨论过的方案保留.

### 任务模型设计 (Task Model Design)

#### A. 任务模型

* **数据结构定义**
  ```typescript
  Task { 
      id,                  // 任务唯一标识
      type,                // 审计任务类型
      description,         // 任务详细描述
      inputArtifacts,      // 输入产物/目标源码路径
      rewardBudget,        // 奖励预算
      deadline,            // 截止时间
      evaluationCriteria,  // 评估标准/权重规则
      visibility           // 任务可见性 (公开/私密)
  }
  ```
* **架构设计原则**：任务在**链下**进行全生命周期管理，**链上**仅做奖池与清算。

#### B. Agent Profile / Registry 模型

* **数据结构定义**
  ```typescript
  AgentProfile {
      id,                  // Agent 唯一标识
      ownerAddress,        // Agent 发布者 / 维护者钱包
      name,                // Agent 名称, 例如 Debug Agent
      version,             // Agent 版本号
      taskTypes,           // 支持任务类型: audit / debug / code_review / dataset 等
      capabilityTags,      // 能力标签
      inputSchema,         // 输入格式约束
      outputSchema,        // 输出格式约束
      executionEndpoint,   // 链下调用地址或执行适配器
      visibility,          // public / private / enterprise
      reputationScore,     // 历史声誉分
      reviewStats,         // 通过率、争议率、平均评分等
      revenueAddress       // 奖励收款地址
  }
  ```
* **发布原则**：Agent 的 profile、版本和输出 schema 必须可审查；真实执行逻辑可以链下运行, 但其输出需要进入 open review 与 scoring 流程。
* **Debug Killer 样板**：平台自研 Debug Killer 使用该模型发布, 作为第三方 Agent / solver 接入的参考实现。

#### C. 智能合约最小接口

### 奖池智能合约接口 (Smart Contract Interface)

`RewardPool` 合约负责管理链上资金托管（Escrow）以及最终的去中心化奖励自动分发。

#### 1. 合约接口定义 (Solidity Interface)

使用 ```solidity 代码块可以激活 Solidity 专属的关键字高亮（如 `external`, `payable`, `view` 等）：

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract RewardPool {
    // 创建一个新的奖池并绑定审计任务，可同时注入初始奖金
    function createRewardPool(bytes32 taskHash) external payable returns (uint256 poolId);
    
    // 向已存在的奖池追加充值奖励 (Escrow)
    function depositToPool(uint256 poolId) external payable;
    
    // 锁定奖池，防止在审计和评估期间追加或篡改资金状态
    function lockPool(uint256 poolId) external;
    
    // 提交最终清算分配方案（由后端/多签根据权重引擎计算后触发）
    function submitSettlement(uint256 poolId, address[] calldata recipients, uint256[] calldata amounts) external;
    
    // 依据已提交的清算方案，自动将代币分发给各个 Agents 节点
    function distributeRewards(uint256 poolId) external;
    
    // 异常或任务取消时，将奖池剩余资金全额退款给 Project Owner
    function refundPool(uint256 poolId) external;
    
    // 只读函数：查询当前奖池的详细状态、资金余额及结算进度
    function viewPoolStatus(uint256 poolId) external view returns (
        bytes32 taskHash, 
        uint256 balance, 
        bool isLocked, 
        bool isSettled
    );
}
```

#### 2. 方法与状态流转说明 (Methods Overview)


| 函数名称 | 触发角色 | 资金影响 | 核心作用说明 |
| :--- | :--- | :---: | :--- |
| `createRewardPool` | **Project Owner** | ➕ 注入初始资金 | 初始化链上奖池，绑定任务 Hash 并生成唯一 `poolId` |
| `depositToPool` | **Project Owner** | ➕ 追加资金 | 允许随时为该审计任务追加悬赏金额 |
| `lockPool` | **Backend / Oracle** | 🔒 资金锁定 | 任务分发后锁定奖池，确保清算前资金无法被提走 |
| `submitSettlement` | **Backend (Orchestrator)**| 📝 写入方案 | 传入 Agents 地址数组与对应的计算得分奖励金额 |
| `distributeRewards` | **Automated Contract**| ➖ 分发扣减 | 执行批量转账，按比例将 `reward` 自动打入 Agents 钱包 |
| `refundPool` | **Governance / Owner**| 🔙 全额退款 | 兜底机制，任务流产时原路退回质押资产 |
| `viewPoolStatus` | **任何人 (Public)** | ℹ️ 无 | 链下/前端看板异步监听，获取当前奖池的最新状态 |

#### D. 评分与结算

* **多源信号整合**：综合评估 `AI` / `Human` / `Validator` / `Reputation` 四个维度的输入数据。
* **结算清算机制**：引入加权公式并进行偏差防御处理（算法细节详见 **[5.4 评分与奖励分配算法](#54-评分与奖励分配算法-algorithm)**）。
* **奖励分发逻辑**：所有奖金严格按照最终计算出的 `FinalScore` 比例进行链上全自动分配。

#### E. Cobo / Custody (资产托管)

* ⚠️ **当前阶段 (MVP)**：暂不集成第三方中心化托管，以降低系统复杂度。
* 🔮 **未来规划**：仅作为长期的 `optional` 扩展方案进行考量。

#### F. 隐私 (Privacy)

* 🌐 **Demo 阶段**：所有审计任务及产物数据完全公开透明。
* 🔒 **未来演进路线**：
  * 支持**私有任务**模式
  * 引入**加密输入**机制
  * 基于 **TEE (可信执行环境)** 的隐私计算
  * 结合 **NDA (保密协议)** 链下法律确权

---
## 12. 总结 (Conclusion)

> 🚀 **核心定位**
> **BountyLand** 打造了一个融合 **Wanted Order Hall + Hall of Fame Killer Agent + open review + AI Audit 智能清算 + 人工兜底校验 + 链上自动结算** 的开放 bounty 平台，旨在彻底解决 Web3 安全审计、复杂 Debug 与通用计算任务中“贵、慢、不可信、难复用”的行业痛点。

### 核心价值主张 (Value Proposition)

* 🔴 **痛点大**：Web3 行业每年因合约漏洞造成的资产损失以数十亿美元计。顶级审计公司排期动辄数月，导致中小型项目方基本排不上档期。
* 💡 **方案新**：**BountyLand** 绝不只是“再做一个 AI 工具”，而是从底层构建了一套全新的**wanted order + killer Agent + 开放评审 + 链上激励基础设施**。
* 💎 **价值显**：
  * **对项目方**：花费更少的资金、更短的时间，即可拿到多方交叉校验且**可追责**的审计结果。
  * **对 Agent 开发者 / 市场 solver**：提供了一个接 wanted order、获得真实任务流量、接受 open review、积累 reputation 并变现的开放大厅。
  * **对平台本身**：Debug Killer / Audit Killer 等 Hall of Fame killer 可以成为核心产品资产, 不只是撮合外部供需。
* 📈 **可演进**：系统的底层设计是通用的协议框架（`general computation task protocol`）加 BountyLand 订单大厅（`wanted order hall`）和 killer 迭代网络（`killer training network`）。智能合约审计 / Debug 仅是第一个垂直落地场景（`vertical`），未来可无缝平滑扩展至 `code review` / `bug bounty` 持续监控 / 模型评测 / `benchmark` / 数据集构建等更广阔的通用计算市场。

---

### 🎯 路线图与近期目标 (Roadmap)

1. **当前目标 (Current)**：用 5 天时间全力交付一个具备可演示性的全链路 MVP，跑通 wanted order 发布、killer / solver 解决、开放评审、平台撮合、去中心化核验与链上自动结算机制，**全力赢下本次黑客松**。
2. **下一步计划 (Next Step)**：黑客松结束后，积极接触 1-2 个真实区块链项目进行试点（`pilot`），同时迭代 Debug Killer / Audit Killer 两个 Hall of Fame killer, 跑通商业化闭环并验证客户的真实付费意愿，再据此决定是否推进后续的融资计划。
