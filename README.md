# Agent-Audited Compute Outsourcing Platform with Cobo Wallet

## 0. 项目简述

在 AI 时代，general computation 不再只是底层资源，而是模型训练、推理服务、数据处理、自动化评测和 AI infrastructure 搭建中不可或缺的生产要素。未来的 AI 系统不会只运行在少数中心化平台上，大量训练、评测、推理和数据任务会走向更开放、更细粒度、更可组合的分布式计算网络。

我们构建一个面向 AI / 通用计算任务的 **Agent-Audited Compute Outsourcing Platform**：用户发布计算任务，计算节点提交结果，验证者给结果打分，同时引入 AI Agent 作为实时审计员，对验证者评分进行动态约束。Cobo Agentic Wallet 负责平台中的资金托管、任务预算、奖励发放、质押和高风险操作的审批控制。

一个好的计算外包平台，是 model training 和 AI infra 从中心化部署走向分布式协作的基石产品，也是 AI x Blockchain 这个交叉世界的起点：AI 需要可扩展、可购买、可验证的计算供给，Blockchain 则提供开放结算、可编程激励和可追责的协作规则。

核心目标是解决：

> 当用户把计算任务外包给第三方节点时，如何让“计算结果、验证打分、奖励分配”更可信、更自动化，同时对用户透明、可审计、可追责？

---

# Sec 1. 平台在做什么？各个角色定位是什么？

## 1.1 平台要解决的问题

在 AI 推理、数据处理、模型评测、代码执行、标注任务、benchmark 任务等场景中，用户经常希望把计算任务外包给第三方节点。但这里有几个问题：

```text
1. 计算节点可能提交低质量或伪造结果；
2. 验证者可能不认真评估，甚至和某些计算节点串通；
3. 用户很难逐个检查计算结果；
4. 奖励分配如果完全靠人工，会很慢；
5. 如果完全靠自动合约，又很难判断复杂 AI 输出的质量。
```

本平台的设计是：

```text
Compute Worker 提交结果
        ↓
Validator 给结果打分
        ↓
AI Audit Agent 同步给 reference score
        ↓
Smart Contract 比较 validator score 和 AI score
        ↓
根据偏离程度调整 reward / reputation / score
        ↓
Cobo Wallet 完成资金与审批控制
```

AI Agent 不直接替代 validator，而是作为 **动态审计层**，实时约束 validator 的评分行为。

## 1.2 平台角色

### A. Task Creator / User

任务发布者，可以是普通用户、项目方、DAO、研究者或企业。

负责：

```text
- 发布计算任务；
- 设置任务预算；
- 设置评分规则；
- 设置奖励池；
- 选择是否启用 AI audit；
- 通过 Cobo Wallet 审批资金操作。
```

示例：

```text
“我想外包 100 个 reasoning QA 任务，每个任务最多奖励 0.01 ETH。
结果由 validator 打分，但如果 validator 和 AI auditor 分数偏差太大，需要降低 validator reputation。”
```

### B. Compute Worker

计算节点，负责真正执行任务。

可以执行：

```text
- AI inference；
- 数据处理；
- OCR；
- 代码执行；
- benchmark solving；
- synthetic data generation；
- model evaluation；
- general API computation。
```

Worker 的目标是提交高质量结果并获得奖励。

### C. Validator

验证者，负责评价 worker 的结果。

负责：

```text
- 读取 worker output；
- 根据任务规则给出 score；
- 把 score 提交到 smart contract；
- 获得 validator reward；
- 如果长期偏离 AI audit，则 reputation 下降。
```

Validator 不是完全可信的，所以平台不会无条件相信 validator score。

### D. AI Audit Agent

AI 审计 agent，是一个 **reference evaluator**。

每次 validator 给 worker 打分时，AI Agent 也独立打一个分数：

```text
validator_score = 90
ai_score = 35
delta = 55
```

如果差距过大，合约会触发动态约束：

```text
- 降低 validator reputation；
- 调整 final score；
- 降低 validator reward；
- 标记该 validator 为 suspicious；
- 在未来版本中可触发人工/大众评审。
```

这个设计的好处是：

> 平台不是等 worker 事后申诉，而是在每次评分时自动审计 validator。

### E. Cobo Wallet / Agentic Wallet

Cobo 是平台的钱包与审批控制层。

根据 Cobo Agentic Wallet manual，CAW 支持 Agent 创建和操作钱包，也支持转账、合约调用、消息签名；配对 App 后，Agent 发起交易前需要提交 Pact，并由人类审批后，Agent 才能在 Pact 规则内执行交易。

在本项目中，Cobo 负责：

```text
- 创建任务预算钱包；
- fund reward pool；
- approve high-risk transactions；
- register worker / validator stake；
- 限制 agent 可调用的合约；
- 限制单次资金使用额度；
- 对 reward distribution 做人类审批或 policy-based 自动审批。
```

### F. Smart Contract

智能合约是平台的结算与规则执行层。

它不直接运行 AI，也不直接判断复杂输出质量，而是负责：

```text
- 注册任务；
- 注册 worker；
- 注册 validator；
- 记录 worker output commitment / URI；
- 记录 validator score；
- 记录 AI audit score；
- 计算 score deviation；
- 更新 validator reputation；
- 计算最终 reward；
- 分发奖励；
- 管理 reward pool 和 stake。
```

---

# Sec 2. 怎么做：Frontend、Backend 调度、Smart Contract、Cobo Wallet

## 2.1 系统整体架构

```text
┌────────────────┐
│  Frontend UI   │
│ task / pay / UX│
└───────┬────────┘
        │ user action
        ↓
┌────────────────────────┐
│     Backend Server      │
│ routing / orchestration │
└───┬───────────────┬────┘
    │               │
    │ dispatch task │ sync task state / events
    ↓               ↓
┌──────────────┐   ┌────────────────────────┐
│Compute Worker│   │     Smart Contract      │
│ run task     │   │ reward / stake / dispute│
└──────┬───────┘   └───────────┬────────────┘
       │ worker output         ↑
       ├──────────────┐        │ validator score
       │              │        │ reference score
       ↓              ↓        │
┌──────────────┐   ┌────────────────┐
│  Validator   │   │ AI Audit Agent │
│ score output │   │ reference eval │
└──────┬───────┘   └───────┬────────┘
       │                   │
       └─────────┬─────────┘
                 ↓
          Smart Contract

Worker         ↔ Cobo Wallet: stake / payout
Validator      ↔ Cobo Wallet: stake / reward
Smart Contract ↔ Cobo Wallet: escrow / settlement / Pact
```

Frontend 负责用户交互，Backend 负责调度 worker、AI audit agent、validator 和 smart contract。Worker 的计算结果会同时进入 validator 和 AI audit agent：validator 提交正式评分，agent 提交 reference score，二者最终都进入 smart contract，由合约执行 reward、stake、penalty 和 dispute 相关逻辑。Cobo Wallet 连接 worker、validator 和 smart contract，负责质押、奖励、托管、提现和 Pact 审批。

## 2.2 Smart Contract 设计

### 核心对象

```solidity
struct Task {
    address creator;
    string taskURI;
    uint256 rewardBudget;
    uint256 deadline;
    bool finalized;
}

struct WorkerSubmission {
    address worker;
    string outputURI;
    bytes32 outputHash;
    bool submitted;
}

struct Evaluation {
    address validator;
    uint256 validatorScore; // 0-100
    uint256 aiScore;        // 0-100
    bool aiSubmitted;
    bool finalized;
}

struct ValidatorProfile {
    uint256 stake;
    uint256 reputation;
    bool active;
}
```

### 核心函数

```solidity
function createTask(
    string calldata taskURI,
    uint256 deadline
) external payable returns (uint256 taskId);

function registerWorker() external payable;

function registerValidator() external payable;

function submitWorkerOutput(
    uint256 taskId,
    string calldata outputURI,
    bytes32 outputHash
) external;

function submitValidatorScore(
    uint256 taskId,
    address worker,
    uint256 score
) external;

function submitAIScore(
    uint256 taskId,
    address worker,
    uint256 aiScore,
    bytes calldata aiSignature
) external;

function finalizeEvaluation(
    uint256 taskId,
    address worker
) external;

function claimReward(
    uint256 taskId
) external;
```

## 2.3 Scoring / Audit 机制

核心逻辑：

```text
delta = abs(validatorScore - aiScore)
```

三档处理：

```text
1. delta <= 20
   validator 和 AI 基本一致。
   finalScore = validatorScore
   validator reputation 小幅上升

2. 20 < delta <= 40
   存在中等偏离。
   finalScore = weighted average of validatorScore and aiScore
   validator reputation 小幅下降

3. delta > 40
   validator 行为高度可疑。
   finalScore 更靠近 aiScore
   validator reputation 明显下降
   validator reward 降低
```

可以写成：

```text
validatorTrust = validatorReputation / MAX_REPUTATION

finalScore =
    validatorTrust * validatorScore
    +
    (1 - validatorTrust) * aiScore
```

动态性质：

```text
- 可信 validator 的分数权重大；
- 不可信 validator 的分数权重小；
- AI 是 audit reference，不是唯一裁判；
- validator 长期表现好，会获得更大 scoring authority；
- validator 经常偏离，会失去影响力。
```

## 2.4 后端 Agent 调用方式

后端负责链下计算和路由。

### Backend Server

负责：

```text
- 接收 task creator 的任务；
- 把任务分发给 workers；
- 收集 worker outputs；
- 调用 validators；
- 触发 AI audit agent；
- 把结果写回智能合约；
- 监听合约事件；
- 更新前端状态。
```

### AI Audit Agent

AI Agent 的流程：

```text
1. 监听 WorkerOutputSubmitted 或 ValidatorScoreSubmitted 事件；
2. 读取 taskURI、outputURI、validatorScore；
3. 根据 task rubric 生成 reference score；
4. 生成 explanation；
5. 用 oracle key 签名；
6. 调用 submitAIScore() 写回合约。
```

注意：EVM 合约不能主动调用 AI Agent。正确模式是：

```text
contract emits event
        ↓
off-chain AI agent listens
        ↓
AI agent computes score
        ↓
AI agent submits transaction back to contract
```

## 2.5 Cobo Wallet 适配

Cobo 的作用不是跑计算，而是做：

```text
agentic custody + human approval + policy enforcement
```

Cobo manual 中展示了 CLI/API/SDK 方式创建钱包、创建地址、提交 Pact、调用合约；API 创建地址时支持 `chain_type: "ETH"`，并说明 ETH type 指代 EVM 链；Pact 可以限制合约调用、交易次数、目标合约和 `always_review`。

在本平台里可以这样接：

### A. Task Creator 使用 Cobo 创建任务钱包

```text
User: Create a compute task with 0.1 ETH budget.

Agent:
  - 生成 task spec
  - 调用 Cobo 创建/使用钱包
  - 创建 Pact
  - 用户手机审批
  - 调用 createTask() 并注入 reward budget
```

### B. Pact Policy 限制 Agent 权限

例如：

```text
- 只能调用 ComputeOutsourcePlatform 合约；
- 单次 fund reward pool 不超过 0.1 ETH；
- 只能调用 createTask / fundTask / finalizeTask；
- 涉及 slash / withdraw 的函数 always_review；
- 每 24 小时最多 N 笔交易。
```

这体现 Cobo 的核心价值：

> Agent 可以自动操作平台，但资金动作由 Pact 和手机审批控制。

### C. Validator / Worker Staking

Worker 和 validator 可以通过 Cobo 钱包质押：

```text
registerWorker() payable
registerValidator() payable
```

如果 validator reputation 太低，可以要求追加 stake 或降低其评分权重。

## 2.6 前端 UI 设计

前端可以做 5 个页面。

### Page 1: Create Task

用户输入：

```text
- task name
- task description
- task type
- reward budget
- deadline
- evaluation rubric
- enable AI audit: yes/no
```

创建流程：

```text
Frontend → Backend → Cobo Pact → User approves → Contract createTask()
```

### Page 2: Worker Dashboard

Worker 看到可接任务：

```text
Task #12: Summarize 100 documents
Reward pool: 0.1 ETH
Deadline: 2 hours
AI audit: enabled
```

Worker 提交：

```text
outputURI + outputHash
```

### Page 3: Validator Dashboard

Validator 看到待评估 worker output：

```text
Worker A output
Rubric
Submit score: 0-100
Reason
```

提交后等待 AI audit score。

### Page 4: Audit Dashboard

展示：

```text
worker output
validator score
AI score
delta
final score
validator reputation change
reward amount
```

Demo 重点组件：

```text
Validator Score: 92
AI Audit Score: 38
Deviation: 54
Action: Validator reputation -15; final score adjusted to 49
```

### Page 5: Cobo Approval / Wallet Page

展示：

```text
- task wallet address
- reward pool balance
- pending Pact approval
- approved policy
- transaction history
```

---

# Sec 3. Demo 演示设计

## 3.1 Demo 目标

展示完整闭环：

```text
用户发布任务
    ↓
worker 提交结果
    ↓
validator 打分
    ↓
AI audit 动态约束
    ↓
Cobo 钱包审批资金
    ↓
合约分发奖励
```

## 3.2 Demo 场景：AI 回答质量评测任务

### Step 1: 用户创建任务

用户在前端输入：

```text
Task: Answer a technical question about smart contract security.
Reward budget: 0.05 ETH.
Scoring rubric:
  - correctness 50%
  - completeness 30%
  - clarity 20%
AI audit enabled.
```

Agent 生成 task spec，并通过 Cobo Wallet 创建 Pact，用户手机审批。

### Step 2: Worker 提交两个答案

Worker A 提交高质量答案。

Worker B 提交低质量答案。

```text
Worker A output: detailed and correct
Worker B output: vague and partially wrong
```

### Step 3: Validator 恶意打分

Validator 给 Worker B 高分，给 Worker A 低分：

```text
Validator score:
  Worker A = 30
  Worker B = 95
```

### Step 4: AI Agent 审计

AI Agent 独立评估：

```text
AI score:
  Worker A = 88
  Worker B = 35
```

合约计算 deviation：

```text
Worker A:
  delta = |30 - 88| = 58

Worker B:
  delta = |95 - 35| = 60
```

### Step 5: 合约调整结果

因为偏离过大：

```text
- Validator reputation drops
- Validator reward reduced
- Final score adjusted toward AI score
- Worker A receives larger reward
- Worker B receives smaller reward
```

前端展示：

```text
Suspicious validator behavior detected.
AI audit constrained validator score.
Reward distribution adjusted.
```

### Step 6: Cobo Wallet 展示资金流

Cobo Wallet 显示：

```text
- reward pool funded after human approval
- contract call approved by Pact
- final reward distribution transaction
```

可以在 Cobo approval 中展示：

```text
This transaction distributes 0.05 ETH reward according to audited final scores.
Approve?
```

## 3.3 Demo Narrative

> A malicious validator tried to mis-score worker outputs, but the AI audit agent detected large deviation and the smart contract dynamically reduced the validator’s influence before distributing rewards through a Cobo-approved wallet flow.

---

# Sec 4. 什么新 feature 能吸引更多用户？

## Feature 1: Task Templates

很多用户不会写 scoring rubric。平台可以内置任务模板：

```text
- AI answer evaluation
- code generation benchmark
- OCR extraction
- data labeling
- document summarization
- translation quality check
- smart contract audit microtask
```

用户只需要选择模板，平台自动生成：

```text
- task spec
- validator rubric
- AI audit prompt
- reward rule
```

## Feature 2: Validator Reputation Marketplace

让用户选择不同 reputation 的 validator：

```text
High reputation validator:
  expensive but reliable

New validator:
  cheap but lower influence

AI-heavy mode:
  cheaper, more automated
```

形成 validator 市场：

```text
validator reputation 越高，能接更高价值任务；
validator 经常偏离 AI audit，reputation 下降；
用户可以按预算选择 validator quality。
```

## Feature 3: AI Audit Explanation

AI 不只是给分，还给 explanation：

```text
AI score: 82/100
Reason:
  - answer is technically correct
  - missing discussion of edge cases
  - explanation is clear
```

这能让 reward 分配更可解释。

## Feature 4: Cobo Policy Templates

预设 Cobo Pact 模板：

```text
Low-risk mode:
  max 0.01 ETH per task
  auto approve reward distribution
  always review withdrawals

Enterprise mode:
  all funding and withdrawals require review
  only whitelisted contracts
  daily cap 1 ETH

Research mode:
  allow frequent small task payouts
  cap per worker per day
```

这可以把 Cobo 的钱包优势变成产品功能，而不是单纯“接了个钱包”。

## Feature 5: Multi-Agent Evaluation

从一个 AI auditor 扩展成多个 AI auditors：

```text
- general reasoning evaluator
- code-specific evaluator
- security-specific evaluator
- domain-specific evaluator
```

最终取 ensemble score：

```text
AI reference score = weighted average of multiple audit agents
```

这样可以降低单个 AI agent 的 bias。

## Feature 6: Worker Quality Passport

给 worker 建立长期 profile：

```text
- completed tasks
- average final score
- AI-audit agreement rate
- validator disagreement history
- payout history
```

高质量 worker 可以通过 reputation 获得更高收益。

## Feature 7: Private / Encrypted Tasks

面向企业用户：

```text
- task input encrypted
- worker runs inside TEE or private backend
- output hash committed on-chain
- only authorized validator / AI auditor can view result
```

这是长期 feature，但企业吸引力较强。

---

# Sec 5. Milestones

## 5.1 Project Milestones

### Milestone 1: Finalize Scope & Architecture

```text
- 确定 MVP 任务类型：AI answer evaluation
- 定义角色：task creator / worker / validator / AI auditor
- 定义 score range、deviation threshold、reward rule
- 确定合约接口和前端页面结构
```

Deliverable:

```text
- architecture diagram
- contract interface draft
- demo script draft
```

### Milestone 2: Smart Contract v0

```text
- 实现 createTask()
- 实现 registerWorker()
- 实现 registerValidator()
- 实现 submitWorkerOutput()
- 实现基础 reward pool
```

Deliverable:

```text
- ComputeOutsourcePlatform.sol v0
- local testnet deployment
```

### Milestone 3: Scoring & Audit Contract Logic

```text
- 实现 submitValidatorScore()
- 实现 submitAIScore()
- 实现 deviation calculation
- 实现 finalScore 计算
- 实现 validator reputation update
```

Deliverable:

```text
- scoring pipeline on-chain working
- unit tests for low / medium / high deviation cases
```

### Milestone 4: AI Audit Agent Backend

```text
- 后端监听合约事件
- 读取 taskURI 和 outputURI
- 调用 AI model 生成 score + explanation
- 使用 oracle key 签名或直接提交 submitAIScore()
```

Deliverable:

```text
- AI auditor service
- event listener
- working score submission tx
```

### Milestone 5: Worker & Validator Backend APIs

```text
- worker submit output API
- validator submit score API
- backend task routing
- mock worker outputs
- mock malicious validator scenario
```

Deliverable:

```text
- backend API server
- demo data flow without frontend
```

### Milestone 6: Cobo Wallet Integration

```text
- 使用 Cobo CLI/API 创建或连接钱包
- 创建 Pact policy
- 通过 Cobo 发起 createTask / fundTask / contract call
- 测试 human approval flow
```

Deliverable:

```text
- Cobo-approved task funding
- Cobo-approved contract call
- documented Pact policy template
```

### Milestone 7: Frontend v0

```text
- Create Task 页面
- Worker Dashboard
- Validator Dashboard
- Audit Dashboard
- Wallet / Approval status 页面
```

Deliverable:

```text
- clickable frontend prototype
- connected to backend APIs
```

### Milestone 8: End-to-End Demo Integration

```text
- 用户创建任务
- Cobo approve funding
- worker 提交结果
- validator 提交恶意评分
- AI auditor 提交 reference score
- contract finalize reward
- frontend 展示 score adjustment
```

Deliverable:

```text
- full E2E demo works on testnet
```
