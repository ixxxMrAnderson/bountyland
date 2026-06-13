# 前端 Agent 接口文档

这份文档给前端同学使用，统一说明当前 `aurora-agent-core` 暴露给前端的所有 Agent 接口、调用顺序、典型返回状态，以及 Sepolia 付款验证/结算需要保留的数据字段。

基础地址：

```text
http://127.0.0.1:8791
```

统一约定：

- 所有请求都使用 `Content-Type: application/json`
- 当前接口返回都是 JSON
- 当前没有登录鉴权
- `status` 字段优先作为前端状态机判断依据

## 1. 接口总览

| 接口 | 方法 | 用途 |
|---|---|---|
| `/health` | `GET` | 健康检查 |
| `/v1/intake` | `POST` | 用户自然语言任务受理、拆解、缺失字段检查、价格确认 |
| `/v1/payment/verify` | `POST` | 校验 Sepolia 付款交易哈希、付款金额、付款人和合约地址 |
| `/v1/execute` | `POST` | 真正执行 dataset/debug agent |
| `/v1/human-market/spec` | `POST` | 生成人工 miner 市场任务定义、validator 规则、奖励规则 |
| `/v1/platform-agents` | `POST` | 注册平台 agent |
| `/v1/platform-agents` | `GET` | 查询平台 agent 列表 |
| `/v1/platform-agents/{agent_id}` | `GET` | 查询单个平台 agent |

## 2. 推荐调用顺序

### 2.1 平台自有 Dataset / Debug Agent

```text
用户输入自然语言
  -> POST /v1/intake
  -> 如果 status=needs_confirmation：前端补字段
  -> 如果 status=awaiting_price_confirmation：前端展示建议价格
  -> 用户确认预算并用钱包付款
  -> POST /v1/payment/verify 校验 txHash
  -> 如果 payment_verified=true：POST /v1/execute
```

### 2.2 人工 miner 市场任务

```text
用户输入自然语言
  -> POST /v1/human-market/spec
  -> 如果 status=needs_confirmation：前端补奖励规则/校验规则
  -> 如果 status=awaiting_spec_confirmation：前端展示规则确认页
  -> 用户确认后再次 POST /v1/human-market/spec
  -> 如果 status=ready：拿 human_market_task_spec 去生成 taskURI / orderURI / criteriaHash
  -> 前端或后端再调用链上 createTask 建奖池
```

### 2.3 公司接入平台 agent

```text
前端表单收集 6 个字段
  -> POST /v1/platform-agents
  -> 后端自动补齐内部字段
  -> 前端可用 GET /v1/platform-agents 查询列表
```

## 3. 健康检查

### `GET /health`

示例响应：

```json
{
  "status": "ok",
  "service": "aurora-agent-core"
}
```

## 4. 自然语言任务受理

### `POST /v1/intake`

用途：

- 识别任务类型
- 拆解成 `draft_task`
- 检查缺失字段
- 估算价格
- 在用户确认后输出 `task_spec`

请求体：

```json
{
  "user_input": "帮我 debug 这个公开 GitHub 仓库 https://github.com/example/project，测试命令 python -m pytest -q",
  "price_confirmed": false,
  "user_budget": null,
  "use_llm": false
}
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `user_input` | string | 是 | 用户自然语言输入 |
| `price_confirmed` | boolean | 否 | 用户是否确认建议价格 |
| `user_budget` | number/null | 否 | 用户预算；若确认且不传，后端会使用建议价格 |
| `use_llm` | boolean | 否 | 是否启用 Z.ai 做任务拆解 |

### 可能返回状态

#### `status = "needs_confirmation"`

说明：信息不足，前端需要追问或补字段。

示例响应：

```json
{
  "status": "needs_confirmation",
  "agent_message": "我已经理解任务方向，但还需要补充：dataset.target_size。",
  "missing_fields": ["dataset.target_size"],
  "ready": false
}
```

#### `status = "awaiting_price_confirmation"`

说明：任务已足够清晰，但还没确认预算。

示例响应：

```json
{
  "status": "awaiting_price_confirmation",
  "agent_message": "任务已经足够清晰，建议价格为 0.052 ETH。请确认或修改预算。",
  "suggested_price": 0.052,
  "ready": false,
  "draft_task": {
    "task_type": "dataset_generation"
  }
}
```

#### `status = "ready"`

说明：前端可以展示正式 `task_spec`，也可以继续调用 `/v1/execute`。

示例响应：

```json
{
  "status": "ready",
  "ready": true,
  "task_spec": {
    "task_id": "task_xxx",
    "task_type": "code_debug",
    "assigned_agent": "debug_miner",
    "user_budget": 0.2,
    "metadata": {
      "schema_version": "0.2.0"
    }
  }
}
```

### 前端建议

- 以 `status` 做主判断，不要靠文案解析
- `missing_fields` 直接映射成补充问题
- `suggested_price` 单位当前默认是 `ETH`
- `use_llm=true` 时，后续 Debug patch loop 会继承这个开关

## 5. Agent 执行接口

### `POST /v1/execute`

用途：

- 真正执行 `dataset_miner` 或 `debug_miner`
- 内部流程是：`intake -> router -> miner`

请求体：

```json
{
  "user_input": "帮我 debug 这个公开 GitHub 仓库 https://github.com/example/project，测试命令 python -m pytest -q",
  "price_confirmed": true,
  "user_budget": 0.021,
  "payment_tx_hash": "0x...",
  "payment_expected_price": 0.021,
  "payer_address": "0x0000000000000000000000000000000000001001",
  "use_llm": false,
  "output_dir": "artifacts/frontend_demo_debug"
}
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `user_input` | string | 是 | 用户自然语言输入 |
| `price_confirmed` | boolean | 建议是 | 一般执行前应为 `true` |
| `user_budget` | number/null | 否 | 用户预算 |
| `payment_tx_hash` | string/null | 建议是 | 用户向 Sepolia 合约付款后的交易哈希 |
| `payment_expected_price` | number/null | 建议是 | `/v1/intake` 返回的 `suggested_price` |
| `payer_address` | string/null | 建议是 | 用户钱包地址，后端会校验 `tx.from` |
| `use_llm` | boolean | 否 | 是否启用 LLM |
| `output_dir` | string/null | 否 | 后端产物输出目录 |

如果 `/v1/execute` 收到 `payment_tx_hash` 且 `payment_verified=false`，Agent 后端会再次调用链上 RPC 校验付款；校验失败会返回 `402`，不会执行 miner。

### 响应结构

```json
{
  "intake": {
    "status": "ready",
    "task_spec": {}
  },
  "execution": {
    "status": "completed | diagnosed | patched | no_patch",
    "summary": {},
    "usage": {},
    "artifacts": []
  }
}
```

### 前端重点字段

| 路径 | 用途 |
|---|---|
| `intake.task_spec.task_type` | 判断是 dataset 还是 debug |
| `execution.status` | 展示执行结果状态 |
| `execution.summary` | 展示概要卡片 |
| `execution.artifacts` | 展示下载链接或产物列表 |
| `execution.usage` | 展示 agent 运行指标 |

## 6. 人工 Miner 市场规则接口

### `POST /v1/human-market/spec`

用途：

- 只生成“人工 miner 市场”的任务定义和结算规则
- 不会执行 dataset/debug miner
- 这是付款逻辑最关键的前置接口

请求体：

```json
{
  "user_input": "发布一个人工 debug 悬赏任务：修复 GitHub 仓库测试失败，交付 patch 和验证报告。validator 评分看测试是否通过、补丁安全性和说明质量。threshold 80，前3个 miner 按 [0.5,0.3,0.2] 分钱，时间窗口 7天。",
  "spec_confirmed": false,
  "use_llm": false,
  "task_definition": null,
  "validator_criteria": null,
  "reward_rule": null
}
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `user_input` | string | 是 | 用户自然语言描述人工任务 |
| `spec_confirmed` | boolean | 否 | 用户是否确认当前规则 |
| `use_llm` | boolean | 否 | 是否启用 LLM 生成草案 |
| `task_definition` | object/null | 否 | 前端覆盖任务定义 |
| `validator_criteria` | object/null | 否 | 前端覆盖 validator 规则 |
| `reward_rule` | object/null | 否 | 前端覆盖奖励规则 |

### 可能返回状态

#### `status = "needs_confirmation"`

说明：奖励参数不完整或不合法。

前端重点看：

- `missing_fields`
- `validation_errors`

#### `status = "awaiting_spec_confirmation"`

说明：规则草案已生成，等待用户确认。

前端重点看：

- `draft_human_market_spec`

#### `status = "ready"`

说明：可以进入链上建奖池流程。

前端重点看：

- `human_market_task_spec`

### `human_market_task_spec.reward_rule` 关键字段

```json
{
  "threshold_score": 80,
  "winner_count": 3,
  "settlement_window_hours": 168,
  "winner_shares": [0.5, 0.3, 0.2],
  "settlement_policy": {
    "eligible_condition": "final_score >= 80",
    "winner_selection": "top 3 eligible miners by final_score, then earlier submission time",
    "payout_rule": [
      { "rank": 1, "share": 0.5 },
      { "rank": 2, "share": 0.3 },
      { "rank": 3, "share": 0.2 }
    ],
    "user_can_settle_when": "3 eligible miners are available",
    "auto_refund_condition": "after 168 hours, if eligible miner count < 3, refund the reward pool to task creator",
    "full_refund_if_eligible_winners_lt_y": true
  }
}
```

## 7. 平台 Agent 注册接口

### `POST /v1/platform-agents`

用途：

- 给有权限的公司提交平台 agent 信息
- 前端只传固定的 6 个字段
- 后端自动补齐 `agent_id`、`status`、`routing`、`execution` 等内部字段

请求体：

```json
{
  "agent_name": "Smart Contract Audit Agent",
  "company_name": "ABC Security",
  "description": "用于接收审计需求并返回结构化审计结果",
  "api_url": "https://api.abc.com/v1/agent/run",
  "input_schema": {
    "fields": [
      { "key": "goal", "type": "string", "required": true }
    ]
  },
  "output_schema": {
    "type": "json",
    "result_path": "data.result"
  }
}
```

成功响应示例：

```json
{
  "agent_id": "platform_agent_1",
  "schema_version": "platform-agent/v1",
  "status": "draft",
  "review_status": "pending",
  "enabled": false,
  "slug": "abc_security_smart_contract_audit_agent",
  "agent_name": "Smart Contract Audit Agent",
  "company_name": "ABC Security",
  "description": "用于接收审计需求并返回结构化审计结果",
  "api_url": "https://api.abc.com/v1/agent/run",
  "input_schema": {
    "fields": [
      { "key": "goal", "type": "string", "required": true }
    ]
  },
  "output_schema": {
    "type": "json",
    "result_path": "data.result"
  },
  "routing": {
    "assigned_agent": "abc_security_smart_contract_audit_agent"
  },
  "execution": {
    "type": "external_api",
    "invocation_url": "https://api.abc.com/v1/agent/run"
  }
}
```

### `GET /v1/platform-agents`

响应示例：

```json
{
  "agents": [
    {
      "agent_id": "platform_agent_1",
      "agent_name": "Smart Contract Audit Agent"
    }
  ]
}
```

### `GET /v1/platform-agents/{agent_id}`

响应：返回单个 agent 完整记录。

### `POST /v1/payment/verify`

用途：

- 根据 txHash 校验用户是否真的向 Sepolia 合约付款
- 校验 `to == ComputeOutsourcePlatform`
- 校验 `from == payer_address`
- 校验 `value >= expected_price`
- 校验 receipt 成功

请求体：

```json
{
  "tx_hash": "0x...",
  "expected_price": 0.021,
  "payer_address": "0x0000000000000000000000000000000000001001"
}
```

响应：

```json
{
  "payment_verified": true,
  "tx_hash": "0x...",
  "reason": "Payment verified.",
  "chain_id": 11155111,
  "contract_address": "0xD64381BF72758857da7151B7d197BFcF23b97339",
  "payer_address": "0x0000000000000000000000000000000000001001",
  "paid_amount_eth": 0.021,
  "expected_amount_eth": 0.021,
  "confirmations": 1,
  "receipt_status": 1
}
```

## 8. 付款 / 结算逻辑要保留的字段

前端做付款逻辑时，不要只保存文案，至少要稳定保留下面这些结构化字段。

### 8.1 人工市场任务建奖池前必须保留

来源：`/v1/human-market/spec` 的 `human_market_task_spec`

必须保留：

| 字段 | 用途 |
|---|---|
| `task_id` | 前端本地任务标识 |
| `task_definition` | 生成 `taskURI` / 订单详情 |
| `validator_criteria` | 生成验收标准文档和 `criteriaHash` |
| `reward_rule.threshold_score` | 过线门槛 |
| `reward_rule.winner_count` | 获胜 miner 数量 |
| `reward_rule.winner_shares` | 分账比例 |
| `reward_rule.settlement_window_hours` | 自动退款/截止窗口 |
| `reward_rule.settlement_policy` | 结算文案和策略展示 |
| `metadata.requires_market_reward_pool` | 标记这类任务必须建奖池 |

### 8.2 调链 `createTask` 时需要的字段

当前合约 `createTask(...)` 需要：

```solidity
createTask(
    string taskURI,
    string orderURI,
    bytes32 criteriaHash,
    uint256 deadline
)
```

加上 `msg.value` 作为奖池金额。

所以前端/后端在付款页至少要准备：

| 字段 | 说明 |
|---|---|
| `taskURI` | 任务需求文件地址 |
| `orderURI` | 订单详情/补充规则文件地址 |
| `criteriaHash` | validator criteria 的 hash |
| `deadline` | 任务截止时间 |
| `rewardPoolEth` | 建奖池金额 |

### 8.3 后续结算页必须能回看

结算阶段至少要能拿到：

| 字段 | 说明 |
|---|---|
| `taskId` | 链上 task id |
| `rewardPool` | 当前奖池 |
| `winner_count` | 应结算多少名 miner |
| `winner_shares` | 每名 miner 占比 |
| `validator address` | 若 validator 也参与分账，需要单独记录 |
| `final recipients[]` | 最终收款地址列表 |
| `bpsShares[]` | 最终结算 BPS 列表，传给 `finalizeTask` |

## 9. 前端付款逻辑建议顺序

### 人工 Miner 市场

```text
1. 调 /v1/human-market/spec 拿到 ready 的 human_market_task_spec
2. 把 task_definition / validator_criteria / reward_rule 落库存或生成文件
3. 生成 taskURI / orderURI / criteriaHash
4. 前端让用户输入 rewardPool 金额和 deadline
5. 调链上 createTask(taskURI, orderURI, criteriaHash, deadline) 并附带 ETH
6. 保存链上 taskId、rewardPool、deadline、winner_shares
7. 等结果出来后，由 resultOracle 提交 submitResult / finalizeTask
```

### 平台 Dataset / Debug Agent

```text
1. 调 /v1/intake
2. 展示 suggested_price / pricing.components
3. 用户确认预算并用钱包向 Sepolia 合约付款
4. 调 /v1/payment/verify 校验 txHash
5. payment_verified=true 后调 /v1/execute
6. /v1/execute 也可带 payment_tx_hash 做二次校验
```

## 10. 当前注意事项

- `/v1/platform-agents` 现在是内存存储，服务重启后会丢
- `/v1/execute` 是执行型接口，前端不要在每次输入变化时自动调用
- `/v1/human-market/spec` 才是付款逻辑最关键的前置接口
- 当前合约不负责算排名和分配比例，`winner_shares` 和最终 `bpsShares` 仍由链下逻辑决定
