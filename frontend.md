# Frontend Product Design

This file defines the frontend experience for the MVP.

The frontend should focus on four primary topic pages:

```text
1. Define New Task
2. Active Tasks
3. Activities
4. Platform Agents
```

The goal is to make task creation feel like an agent-guided workflow, while keeping the marketplace of executable tasks easy for miners and validators to browse.

---

## 1. Define New Task

### Core Idea

This page is where the user chooses how to define a new compute outsourcing task.

The user should not start from a form with many fields. The first screen should show three large platform-agent entry bubbles:

```text
┌────────────────────────────────────────────┐
│ 我想要一个特定的数据集                     │
│ 数据采集 / 筛查 / 清洗 agent               │
│ Helps define dataset scope and quality     │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ 我想 audit 一个 Web3 协议 / 程序            │
│ Code auditor agent                         │
│ Helps define audit scope and evidence      │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ 其他计算外包任务                           │
│ 帮忙拟定订单进入人工 miner 平台            │
│ Uses the current order drafting workflow   │
└────────────────────────────────────────────┘
```

### Bubble 1: Dataset Platform Agent

Label:

```text
我想要一个特定的数据集
```

Subtitle:

```text
数据采集 / 筛查 / 清洗 agent
```

Short intro:

```text
For users who need a specific dataset, this platform agent helps turn a dataset idea into collection scope, filtering rules, cleaning standards, schema, quality criteria, and validator acceptance checks.
```

Examples:

```text
- CV / resume dataset
- finance reasoning QA dataset
- domain-specific instruction tuning dataset
- labeled smart contract vulnerability dataset
```

MVP click behavior:

```text
Clicking this bubble opens a placeholder / coming-soon agent panel.
The full dataset-agent interaction is pending.
```

Future interaction:

```text
The dataset agent should ask about:
- domain and use case
- dataset size
- source constraints
- privacy / licensing constraints
- schema and output format
- cleaning and deduplication standard
- validation methodology
- reward pool and settlement preference
```

### Bubble 2: Web3 Code Auditor Agent

Label:

```text
我想 audit 一个 Web3 协议 / 程序
```

Subtitle:

```text
Code auditor agent
```

Short intro:

```text
For users who want to audit a Web3 protocol, smart contract, or program, this platform agent helps define audit scope, threat model, deliverables, severity rubric, test requirements, and validator review standards.
```

Examples:

```text
- Solidity contract audit
- protocol economic/security review
- reentrancy and access-control review
- exploit proof-of-concept validation
```

MVP click behavior:

```text
Clicking this bubble opens a placeholder / coming-soon agent panel.
The full code-auditor interaction is pending.
```

Future interaction:

```text
The code auditor agent should ask about:
- repo or contract address
- target chain / VM
- contract scope
- threat model and protected assets
- expected deliverables
- severity rubric
- proof-of-concept requirements
- validator qualification requirements
```

### Bubble 3: Other Compute Outsourcing Task

Label:

```text
其他计算外包任务
```

Subtitle:

```text
帮忙拟定订单进入人工 miner 平台
```

This bubble uses the existing chat-first order drafting workflow.

After clicking it, the UI opens:

```text
Centered natural language input box
Prompt placeholder:
  "Describe the dataset, computation, or AI task you want to outsource to human miners..."
```

Example user input:

```text
帮我外包生成一个高质量的 reasoning QA 数据集，包含 1000 条问题、标准答案和简短推理过程。
```

Suggested flow:

```text
1. User describes task in natural language.
2. Platform spec agent returns a high-level scoring methodology.
3. User confirms or revises the methodology.
4. Platform spec agent asks strategy questions:
   - validator access: broad crowd vs curated experts
   - output format strictness
   - AI reference score vs human validator weighting
   - threshold / refund preference
5. User enters explicit Reward Pool amount.
6. Platform spec agent generates:
   - task summary
   - miner output requirements
   - validator checklist
   - pass / fail condition
   - AI threshold line
   - reward rule
   - dispute trigger
   - taskURI / orderURI / criteriaHash preview
   - Cobo Pact policy draft
7. User confirms task creation.
8. Task is created on-chain or mocked as on-chain for the demo.
9. Task appears in Active Tasks.
```

### Confirmation State

Before confirming, the user should see a compact summary:

```text
Task:
  Generate a reasoning QA dataset with 1000 records.

Miner output:
  JSONL dataset with question, answer, reasoning, difficulty, topic.

Validator criteria:
  Dataset quality and diversity first.

Reward:
  User-entered Reward Pool, e.g. 0.01 ETH.

Escrow:
  The Reward Pool is escrowed before the task becomes active.
  This is not gas fee.

AI threshold line:
  72/100
  If all miner submissions fail to pass this threshold,
  most of the Reward Pool is refunded to the user.

Audit:
  AI audit enabled.

Contract:
  createTask(taskURI, orderURI, criteriaHash, deadline, aiAuditEnabled)
```

Primary action:

```text
Approve Reward Pool escrow and create task
```

After confirmation:

```text
Task created.
Reward Pool escrowed.
Status: Active
Available for miners.
```

Then the task should pop into the second topic page: `Active Tasks`.

---

## 2. Active Tasks

### Core Idea

This page shows tasks that have already been created and are available for miners to accept.

For the MVP, tasks can be treated as already on-chain once the user confirms creation in the mock flow.

Each task card should visualize:

```text
- task overview
- number of miner submissions
- reward overview
- AI audit status
- selected validator criteria
- two role actions:
  - I wanna mine
  - I wanna validate
```

Each active task card should also be clickable. Clicking the card opens a floating rectangular detail modal. The modal sits above the page, has a close button in the top-right corner, and keeps the user in the same page context.

The two role actions should be available both on the card and inside the floating detail modal.

### Task Card Structure

Each active task should be displayed as a compact card:

```text
┌────────────────────────────────────────────┐
│ Reasoning QA Dataset Generation            │
│ Generate 1000 QA records with answers...    │
│                                            │
│ Status: On-chain / Active                  │
│ Miner submissions: 3                       │
│ Reward pool: 0.1 ETH                       │
│ AI audit: Enabled                          │
│ Criteria: Dataset quality and diversity    │
│                                            │
│ [I wanna mine] [I wanna validate]           │
└────────────────────────────────────────────┘
```

Click behavior:

```text
Click card body:
  open floating task detail modal

Click I wanna mine:
  open miner interaction interface for this task

Click I wanna validate:
  open validator interaction interface for this task
```

### Task Overview

The overview should be short and scannable:

```text
Title:
  Reasoning QA Dataset Generation

Summary:
  Generate 1000 reasoning QA records with question, answer, reasoning, difficulty, and topic fields.

Output format:
  JSONL

Deadline:
  48h
```

### Miner Submission Count

Show how many miners have already submitted:

```text
Miner submissions: 3
```

If none:

```text
Miner submissions: 0
Open for first submission
```

### Reward Overview

Show reward in a way that helps miners decide quickly:

```text
Reward pool: 0.1 ETH
Estimated payout: score-based
Validator reward: reduced if validator deviates from AI audit
```

For the MVP, this can be simplified:

```text
Reward pool: 0.1 ETH
Payout: based on audited final score
```

### Role Actions

Each task card has two main actions.

### Task Detail View

When a user clicks an active task card, show a floating rectangular task detail modal:

```text
┌────────────────────────────────────────────────────────────┐
│ Task details                                           [x] │
│                                                            │
│ ...task content...                                         │
│                                                            │
│ [I wanna mine] [I wanna validate]                           │
└────────────────────────────────────────────────────────────┘
```

Modal behavior:

```text
- opens above Active Tasks without navigating away
- top-right close button
- clicking outside can also close it
- card actions remain available inside the modal
```

Modal content:

```text
Task summary
  title
  status
  created time
  deadline
  reward pool
  escrowed Reward Pool amount
  AI threshold line
  AI audit status

Computation order
  task description
  miner output requirements
  output format
  taskURI
  orderURI
  criteriaHash

Validator acceptance criteria
  selected criteria option
  scoring dimensions
  pass / fail condition
  AI threshold line
  validator checklist
  dispute trigger

Reward Pool / refund rule
  Reward Pool escrowed by user
  if all miner submissions score below the AI threshold line,
  most of the Reward Pool is refunded to the user

Submissions
  miner submission count
  latest submission status

Actions
  I wanna mine
  I wanna validate
```

This view should make the task feel like an actual order that has already been created and can now be worked on.

### Miner Interaction Interface

Opened by clicking:

```text
I wanna mine
```

This is the miner's working interface for a specific task.

Suggested layout:

```text
┌──────────────────────────────┬──────────────────────────────┐
│ Computation Order             │ Miner Submission             │
│ task summary                  │ output upload / text input   │
│ output requirements           │ outputURI                    │
│ reward / deadline             │ outputHash preview           │
│ validator criteria preview    │ submit button                │
└──────────────────────────────┴──────────────────────────────┘
```

Left side:

```text
- task overview
- required output format
- miner output requirements
- deadline
- reward pool
- selected validator criteria preview
```

Right side:

```text
- output text area or file upload
- outputURI input
- generated outputHash preview
- submit output button
```

After submission:

```text
Submission created.
Status: Waiting for validator score.
Potential reward: +0.0X ETH
AI threshold line: 72/100
```

The task should then appear in `Activities` under the user's mining activity.

### Validator Interaction Interface

Opened by clicking:

```text
I wanna validate
```

This is the validator's working interface for a specific task.

Suggested layout:

```text
┌──────────────────────────────┬──────────────────────────────┐
│ Miner Submission              │ Validator Panel              │
│ submitted output              │ criteria checklist           │
│ outputURI / outputHash        │ score input                  │
│ task requirements             │ reason input                 │
│ AI audit pending/status       │ submit validation            │
└──────────────────────────────┴──────────────────────────────┘
```

Left side:

```text
- selected miner submission
- outputURI
- outputHash
- output preview
- original computation order
```

Right side:

```text
- validator acceptance criteria
- checklist
- score input 0-100
- reason input
- submit validation button
- AI audit result after submission
```

After validator submits:

```text
Validator score submitted.
AI audit score generated.
Delta calculated.
Status: Scored / Waiting for settlement.
Potential validator reward: +0.00X ETH
Potential reputation change: +3 / -5 / -15
```

The task should then appear in `Activities` under the user's validation activity.

---

## 3. Activities

### Core Idea

`Activities` is the user's personal work history. It shows orders the user has mined or validated.

This page should be in the sidebar navigation:

```text
Define New Task
Active Tasks
Activities
Platform Agents
```

Each activity row/card is clickable and opens the full detail for that activity.
Clicking an activity opens a floating rectangular activity detail modal with a top-right close button.

### Activity List Visual Style

The list should feel like a transaction/activity feed:

```text
┌────────────────────────────────────────────────────────────┐
│ Reasoning QA Dataset Generation             +0.034 ETH     │
│ Mining activity | Settled                                  │
│ Final score: 88 | Submitted 2h ago                         │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ Reasoning QA Dataset Generation             +0.008 ETH     │
│ Validation activity | Scored                               │
│ Validator delta: 12 | Reputation +3                        │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ OCR Extraction Batch                         +0.015 ETH     │
│ Mining activity | Unscored                                │
│ Potential reward | Waiting for validator                   │
└────────────────────────────────────────────────────────────┘
```

The right side amount should be prominent:

```text
Settled:
  green number: +0.034 ETH

Scored but not settled:
  muted/outlined number: potential +0.034 ETH

Unscored:
  muted number: potential +0.015 ETH
```

### Activity Status

Each activity has one of these states:

```text
Unscored:
  miner submitted output, no validator score yet

Scored:
  validator score and AI audit score exist, final score calculated, settlement not complete

Settled:
  reward distributed or settlement mocked as complete
```

Chinese labels if the UI uses Chinese:

```text
未评分
已评分
已结算
```

### Mining Activity Card

For mining activity, show:

```text
- task title
- role: Mining
- status: Unscored / Scored / Settled
- miner submitted time
- final score if available
- potential reward if not settled
- settled reward if settled
- outputHash short preview
```

Right-side amount:

```text
Settled:
  +0.034 ETH

Unscored / Scored:
  potential +0.034 ETH
```

### Validation Activity Card

For validation activity, show:

```text
- task title
- role: Validation
- status: Scored / Settled
- validator score
- AI audit score
- delta
- validator reward or potential validator reward
- reputation settlement change
```

Right-side amount:

```text
Settled:
  +0.008 ETH

Scored:
  potential +0.008 ETH
```

Reputation line:

```text
Reputation +3
Reputation -5
Reputation -15
```

Positive reputation change should be green. Negative reputation change should be red or amber.

### Activity Detail View

Clicking an activity card opens a floating rectangular activity detail modal:

```text
┌────────────────────────────────────────────────────────────┐
│ Activity details                                       [x] │
│                                                            │
│ ...activity content...                                     │
└────────────────────────────────────────────────────────────┘
```

Modal behavior:

```text
- opens above Activities without navigating away
- top-right close button
- clicking outside can also close it
- shows the full task and reward context
```

Modal content:

```text
Task summary
Activity role: Mining / Validation
Status timeline
Reward calculation
Reward Pool / refund rule if relevant
Score details
AI audit explanation
Cobo settlement status
Contract params
```

Mining detail should include:

```text
- submitted outputURI
- outputHash
- validator score if available
- AI audit score if available
- final score if available
- reward formula
```

Validation detail should include:

```text
- miner submission reviewed
- selected validator criteria
- validator score
- validator reason
- AI audit reference score
- deviation
- reputation change
- validator reward formula
```

---

## 4. Platform Agents

### Core Idea

`Platform Agents` is a sidebar page dedicated to explaining the two platform-provided agents:

```text
1. Dataset Collection / Filtering / Cleaning Agent
2. Web3 Code Auditor Agent
```

This page is not the task marketplace and not a marketing landing page. It should be a practical, technical overview that helps users understand what these agents can do, how they are backed, and how their outputs connect to the human miner / validator platform.

### Sidebar Navigation

The sidebar should include:

```text
Define New Task
Active Tasks
Activities
Platform Agents
```

Chinese label:

```text
平台 agent 简介
```

### Page Layout

Suggested layout:

```text
┌────────────────────────────────────────────────────────────┐
│ Platform Agents                                            │
│ Data and code-audit agents that help users define tasks    │
├──────────────────────────────┬─────────────────────────────┤
│ Dataset Agent                 │ Web3 Code Auditor Agent     │
│ architecture                  │ architecture                │
│ capabilities                  │ capabilities                │
│ validation backing            │ validation backing          │
│ current status                │ current status              │
└──────────────────────────────┴─────────────────────────────┘
```

### Dataset Agent Detail

The dataset agent should be described as a platform service for users who want a specific dataset but do not know how to specify collection, cleaning, schema, or validation.

Architecture:

```text
User dataset intent
  ↓
Requirement parser
  ↓
Source / scope planner
  ↓
Schema designer
  ↓
Cleaning and deduplication policy generator
  ↓
Validator scoring methodology generator
  ↓
Human miner order draft
```

Capabilities:

```text
- turns natural language dataset requests into structured dataset specs
- proposes fields, schema, format, and size
- defines filtering and cleaning rules
- drafts validator methodology and scoring rubric
- suggests threshold / refund rules
- generates order artifacts for the miner marketplace
```

Backing / credibility:

```text
- z.ai model-assisted specification drafting
- validator review methodology
- JSONL/schema parseability checks
- human miner marketplace for collection and production
- Cobo mock escrow approval for reward-pool funding
```

Current status:

```text
MVP:
  agent intro and placeholder flow

Future:
  full interactive dataset-agent flow
```

### Web3 Code Auditor Agent Detail

The code auditor agent should be described as a platform service for users who want security review, protocol audit, or program analysis.

Architecture:

```text
User audit intent
  ↓
Scope parser
  ↓
Threat model generator
  ↓
Severity rubric generator
  ↓
Evidence / PoC requirement planner
  ↓
Validator scoring methodology generator
  ↓
Human miner / auditor order draft
```

Capabilities:

```text
- turns audit requests into structured audit scope
- identifies contract/program boundaries
- defines severity levels and expected evidence
- drafts vulnerability checklist
- proposes validator qualification rules
- generates audit deliverable requirements
```

Backing / credibility:

```text
- z.ai model-assisted audit scope drafting
- human auditor / miner execution
- validator scoring and dispute review
- artifact hash / URI recording
- Cobo mock escrow approval for payout control
```

Current status:

```text
MVP:
  agent intro and placeholder flow

Future:
  full interactive code-auditor flow
```

### Relationship To Define New Task

The first two bubbles on `Define New Task` should route naturally to these platform-agent concepts.

```text
Dataset bubble:
  routes to dataset-agent placeholder or future dataset-agent flow

Web3 audit bubble:
  routes to code-auditor-agent placeholder or future audit-agent flow

Other compute outsourcing bubble:
  routes to the existing order-drafting chat flow
```

---

## 5. Cobo Wallet Integration In The Frontend

### Product Role

Cobo should not feel like a separate page that users must understand before using the product. It should appear as a wallet and approval layer inside the task lifecycle.

Recommended frontend integration:

```text
1. A small Wallet / Approval widget in the sidebar or top-right area.
2. A Cobo approval panel inside Define New Task confirmation.
3. Settlement status inside Activities detail.
```

### Sidebar Wallet Widget

The sidebar can include a compact wallet status block:

```text
Cobo Wallet
Connected / Mock connected
Task wallet: 0x1234...abcd
Pending approvals: 1
```

Actions:

```text
Connect wallet
View approvals
```

For MVP:

```text
Mock connected
```

### Define New Task Cobo Panel

When the user confirms a new task, show a Cobo Pact preview and Reward Pool escrow requirement:

```text
Cobo Pact Draft
  Reward Pool: user-entered amount, e.g. 0.01 ETH
  Gas fee: separate wallet/network cost, not part of Reward Pool
  AI threshold line: 72/100
  Refund rule:
    If all miner submissions score below the threshold,
    most of the Reward Pool is refunded to the user.
  Allowed contract: ComputeOutsourcePlatform
  Allowed functions:
    createTask
    fundTask
    finalizeEvaluation
    claimReward
  Always review:
    withdraw
    slashValidator
```

Primary button:

```text
Approve Reward Pool escrow and create task
```

For MVP:

```text
Mock approve Reward Pool escrow and create task
```

For real integration:

```text
Clicking approve calls backend:
  POST /wallet/cobo/pacts

Backend creates Pact through Cobo API.
Frontend shows:
  Waiting for mobile approval
  Approved
  Transaction submitted
  Task active
```

### Activities Cobo Settlement Status

Activity details should show Cobo settlement state:

```text
Cobo settlement
  Pending approval
  Approved
  Settlement transaction submitted
  Reward distributed
```

For settled rows:

```text
Settled via Cobo policy
Tx: 0xabc...123
```

For pending rows:

```text
Waiting for Cobo approval
```

### Why This Fits The Architecture

Cobo belongs at moments where money or contract authority changes:

```text
Create task:
  fund reward pool

Worker / validator stake:
  register and stake

Settlement:
  distribute rewards

Risky actions:
  withdraw / slash / policy change
```

So the frontend should expose Cobo as contextual approval state, not as the main task workflow.

---

## 6. Navigation

The top-level navigation should be:

```text
Define New Task
Active Tasks
Activities
Platform Agents
```

Optional later pages:

```text
Audit Dashboard
Wallet Settings
Reputation
```

For now, the product should not start with many separate dashboard pages. The first demo should make the task creation, marketplace, and personal activity loop obvious.

---

## 7. MVP Frontend State Flow

```text
Define New Task agent entry bubbles
        ↓
User chooses one of three entry bubbles
        ↓
If Dataset Agent or Code Auditor Agent:
  show platform-agent placeholder / coming-soon panel
        ↓
If Other Compute Outsourcing Task:
  open existing chat-first order drafting workflow
        ↓
User submits task description
        ↓
Platform spec agent returns scoring methodology
        ↓
User confirms or revises methodology
        ↓
Platform spec agent returns strategy questions
        ↓
User selects strategy options
        ↓
User enters explicit Reward Pool amount
        ↓
Platform spec agent returns computation order preview
        ↓
User confirms task
        ↓
User approves Reward Pool escrow through Cobo approval / mock approval
        ↓
Task status becomes Active / On-chain mock
        ↓
Task appears in Active Tasks
        ↓
User clicks task card to inspect details
        ↓
Miner chooses "I wanna mine"
        ↓
Miner submits output
        ↓
Mining activity appears in Activities as Unscored
        ↓
Validator chooses "I wanna validate"
        ↓
Validator submits score
        ↓
Validation activity appears in Activities as Scored
        ↓
AI audit result + settlement updates Activities
```

---

## 8. Implementation Notes

Current backend can support this flow with:

```text
POST /tasks/criteria
POST /tasks
GET  /tasks
GET  /tasks/:taskId
POST /tasks/:taskId/submissions
POST /tasks/:taskId/evaluations
```

Additional frontend state needed:

```text
activities:
  local projection from submissions + evaluations + settlement state

selectedTask:
  active task detail drawer/page

selectedActivity:
  activity detail drawer/page

wallet:
  Cobo connection state / mock approval state
```

Current mock agent behavior:

```text
Platform Dataset Agent:
  placeholder / pending full interaction

Platform Web3 Code Auditor Agent:
  placeholder / pending full interaction

Task Criteria Agent:
  drafts methodology, strategy questions, and computation order preview

AI Audit Agent:
  returns a mock reference score after validator evaluation
```

No real z.ai, Cobo, or on-chain transaction is required for the first UI demo. The UI can label confirmed tasks as:

```text
On-chain mock
```

and Cobo actions as:

```text
Cobo mock approval
```

until the real contract and wallet integration are connected.
