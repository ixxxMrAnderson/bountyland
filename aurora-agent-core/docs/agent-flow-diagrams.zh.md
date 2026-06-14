# Aurora Agent Flow Diagrams

本文只画当前代码中已经实现的逻辑。当前已实现平台自营 Dataset/Debug Agent、人工市场 Task Spec Agent、平台 Agent 注册接口、Sepolia txHash 支付验证；不包含人工 Miner 接单执行市场本身。

代码入口：

- `TaskIntakeGraph`: `aurora_agent_core/agents/task_intake_graph.py`
- `DatasetMinerGraph`: `aurora_agent_core/miners/dataset_miner_graph.py`
- `DebugMinerGraph`: `aurora_agent_core/miners/debug_miner_graph.py`
- `HumanMarketTaskSpecGraph`: `aurora_agent_core/agents/human_market_task_spec_graph.py`
- `Payment Verification`: `aurora_agent_core/payment.py`
- `Platform Agent Registry`: `aurora_agent_core/platform_agent_registry.py`

## 1. Platform Task Intake Agent

对应接口：

```text
POST /v1/intake
POST /v1/execute
POST /v1/payment/verify
```

真实 LangGraph 节点：

```mermaid
flowchart TD
    START([START]) --> FEAS["feasibility_check"]

    FEAS --> ROUTE{"route_after_feasibility"}
    ROUTE -->|"reject"| REJECT["reject_task"]
    ROUTE -->|"continue"| DECOMP["decompose_task"]

    REJECT --> END1([END])

    DECOMP --> MISS["missing_info_detector"]
    MISS --> PRICE["price_estimator"]
    PRICE --> CONFIRM["confirmation_gate"]
    CONFIRM --> NORMALIZE["normalize_task"]
    NORMALIZE --> END2([END])
```

节点含义：

```mermaid
flowchart TD
    INPUT["user_input + price_confirmed + user_budget + use_llm"] --> FEAS["feasibility_check<br/>用 registry intent keywords 判断任务类型"]

    FEAS -->|"不支持"| REJECT["rejected<br/>不生成 TaskSpec"]
    FEAS -->|"dataset_generation 或 code_debug"| DECOMP["decompose_task"]

    DECOMP -->|"use_llm=true"| LLM["Z.ai 拆解草案<br/>失败则 fallback"]
    DECOMP -->|"use_llm=false 或 LLM 失败"| RULES["规则拆解草案"]

    LLM --> DRAFT["draft_task"]
    RULES --> DRAFT

    DRAFT --> MISS["missing_info_detector<br/>按 registry input_contract 查缺字段"]
    MISS -->|"缺字段"| NEED["needs_confirmation"]
    MISS -->|"字段完整"| PRICE["price_estimator<br/>dataset/debug 动态估价"]

    PRICE --> CONFIRM["confirmation_gate<br/>检查 price_confirmed / user_budget / 确认词"]
    CONFIRM -->|"未确认价格"| WAIT["awaiting_price_confirmation"]
    CONFIRM -->|"已确认"| SPEC["normalize_task<br/>生成 TaskSpec"]

    SPEC --> READY["ready=true<br/>可进入 Router 和 Miner"]
```

Debug 动态估价：

```mermaid
flowchart TD
    DEBUG["draft_task.debug"] --> BASE["base = 0.005 ETH"]
    DEBUG --> PATCH{"allow_patch?"}
    DEBUG --> TEST{"有 test_command?"}
    DEBUG --> SIZE["GitHub repo size<br/>GET api.github.com/repos/owner/repo"]

    PATCH -->|"true"| PATCHFEE["+0.008"]
    PATCH -->|"false"| PATCHZERO["+0"]
    TEST -->|"true"| TESTFEE["+0.006"]
    TEST -->|"false"| TESTZERO["+0"]

    SIZE --> BUCKET{"size_kb bucket"}
    BUCKET -->|"unknown"| UNKNOWN["+0.005"]
    BUCKET -->|"<=1MB"| S1["+0.002"]
    BUCKET -->|"<=10MB"| S10["+0.005"]
    BUCKET -->|"<=50MB"| S50["+0.010"]
    BUCKET -->|"<=200MB"| S200["+0.018"]
    BUCKET -->|">200MB"| SBIG["+0.025"]

    BASE --> SUM["sum components"]
    PATCHFEE --> SUM
    PATCHZERO --> SUM
    TESTFEE --> SUM
    TESTZERO --> SUM
    UNKNOWN --> SUM
    S1 --> SUM
    S10 --> SUM
    S50 --> SUM
    S200 --> SUM
    SBIG --> SUM

    SUM --> CAP["suggested_price = min(sum, 0.05 ETH)"]
```

平台执行链路：

```mermaid
flowchart TD
    EXEC["POST /v1/execute"] --> PAYHASH{"payment_tx_hash provided<br/>and payment_verified=false?"}
    PAYHASH -->|"yes"| PAYVERIFY["verify_payment_tx<br/>二次校验链上付款"]
    PAYVERIFY --> PAYOK{"payment_verified?"}
    PAYOK -->|"false"| BLOCK["HTTP 402<br/>不执行 miner"]
    PAYOK -->|"true"| INTAKE["TaskIntakeGraph.run"]
    PAYHASH -->|"no"| INTAKE

    INTAKE --> READY{"intake.ready?"}
    READY -->|"false"| STOP["返回 intake<br/>execution=null"]
    READY -->|"true"| ROUTER["route_task<br/>按 task_type 查 registry"]

    ROUTER -->|"dataset_generation"| DS["DatasetMinerGraph"]
    ROUTER -->|"code_debug"| DB["DebugMinerGraph"]
    ROUTER -->|"unsupported"| UNSUPPORTED["execution rejected"]

    DS --> RESULT["返回 intake + execution"]
    DB --> RESULT
    UNSUPPORTED --> RESULT
```

## 2. Dataset Miner Agent

对应执行入口：

```text
TaskSpec.task_type = dataset_generation
```

真实 LangGraph 节点：

```mermaid
flowchart TD
    START([START]) --> PLAN["dataset_planner"]
    PLAN --> SOURCES["source_finder"]
    SOURCES --> EXTRACT["extractor"]
    EXTRACT --> CLEAN["cleaner"]
    CLEAN --> PACKAGE["packager"]
    PACKAGE --> END([END])
```

当前已实现逻辑：

```mermaid
flowchart TD
    SPEC["TaskSpec.dataset"] --> PLAN["dataset_planner<br/>确定 target_size/output_format/fields/quality_rules"]

    PLAN --> SOURCES["source_finder<br/>按 source_scope 生成 sources"]
    SOURCES --> OSV{"sources 中是否有 OSV?"}

    OSV -->|"yes"| OSVAPI["collect_osv_records<br/>调用 OSV public API"]
    OSV -->|"no + use_llm=true"| ZAIROWS["generate_llm_dataset_records<br/>Z.ai 生成 synthetic records"]
    OSV -->|"no + use_llm=false<br/>或 Z.ai 失败"| TEMPLATE["synthetic_template<br/>规则模板生成"]

    OSVAPI --> RAW["raw_records"]
    ZAIROWS --> RAW
    TEMPLATE --> RAW

    RAW --> CLEAN["cleaner<br/>校验必填字段/去重/统计真实与 synthetic"]
    CLEAN --> REPORT{"use_llm=true?"}
    REPORT -->|"yes"| ZAIREPORT["Z.ai 生成 Dataset report"]
    REPORT -->|"no 或失败"| RULEREPORT["规则模板 report"]

    ZAIREPORT --> PACKAGE["packager"]
    RULEREPORT --> PACKAGE

    PACKAGE --> ARTIFACTS["输出 artifacts:<br/>dataset.jsonl/csv/json<br/>sources.json<br/>stats.json<br/>report.md<br/>trace.json<br/>result.json"]
    PACKAGE --> USAGE["execution.usage:<br/>records/source_api_calls/extraction_method<br/>llm calls/token/errors"]
```

关键点：

```mermaid
flowchart LR
    OSV["OSV records"] --> REAL["synthetic_mvp=false<br/>真实公开 API 数据"]
    ZAI["Z.ai synthetic records"] --> SYN["synthetic_mvp=true<br/>model_generated=true"]
    TEMPLATE["Template records"] --> SYN2["synthetic_mvp=true"]
```

## 3. Debug Miner Agent

对应执行入口：

```text
TaskSpec.task_type = code_debug
```

真实 LangGraph 节点：

```mermaid
flowchart TD
    START([START]) --> ISSUE["issue_interpreter"]
    ISSUE --> WORKSPACE["workspace_preparer"]
    WORKSPACE --> INSPECT["repo_context_inspector"]
    INSPECT --> ORACLE["reproduction_oracle_builder"]
    ORACLE --> RUNTIME["runtime_state_collector"]
    RUNTIME --> DIVERGE["state_divergence_analyzer"]
    DIVERGE --> LOCALIZE["root_cause_localizer"]
    LOCALIZE --> PLAN["fix_planner"]
    PLAN --> PATCH["patch_generator"]
    PATCH --> PACKAGE["debug_packager"]
    PACKAGE --> END([END])
```

当前已实现逻辑：

```mermaid
flowchart TD
    SPEC["TaskSpec.debug"] --> ISSUE["issue_interpreter<br/>提取 repo_url/test_command/logs/allow_patch/use_llm"]

    ISSUE --> VALID{"repo_url 且 test_command/logs 足够?"}
    VALID -->|"no"| FAILED["status=failed<br/>后续节点跳过或打包失败原因"]
    VALID -->|"yes"| CLONE["workspace_preparer<br/>git clone public repo 到 output_dir/workspace/repo"]

    CLONE --> INSPECT["repo_context_inspector<br/>扫描 top_level/project_files/extension_counts"]
    INSPECT --> ORACLE["reproduction_oracle_builder<br/>构建复现 oracle"]
    ORACLE --> RUN["runtime_state_collector<br/>运行 test_command"]

    RUN --> ANALYZE["state_divergence_analyzer<br/>提取 failure_signals/referenced_paths"]
    ANALYZE --> LOCALIZE["root_cause_localizer<br/>rank_candidate_files"]
    LOCALIZE --> FIXPLAN["fix_planner<br/>生成 recommended_steps"]

    FIXPLAN --> PATCHMODE{"allow_patch?"}
    PATCHMODE -->|"false"| NOPATCH["patch_result=patch_disabled"]
    PATCHMODE -->|"true"| LOOP["run_patch_loop<br/>最多 10 轮"]

    LOOP --> EACH["每轮:<br/>Z.ai patch plan 优先<br/>失败/none 时启发式兜底<br/>写 patch 后重新运行 test_command <= 120s"]
    EACH --> VERIFY{"verification returncode == 0<br/>或达到 max_iterations?"}
    VERIFY -->|"继续失败且未满 10 轮"| EACH
    VERIFY -->|"通过或结束"| PATCHRESULT["patch_result<br/>iterations/files_modified/diff/verification/llm_usage"]

    NOPATCH --> PACKAGE["debug_packager"]
    PATCHRESULT --> REPORT{"use_llm=true?"}
    REPORT -->|"yes"| ZAIREPORT["Z.ai 生成 debug_report"]
    REPORT -->|"no 或失败"| RULEREPORT["规则模板 debug_report"]
    ZAIREPORT --> PACKAGE
    RULEREPORT --> PACKAGE

    PACKAGE --> ARTIFACTS["输出 artifacts:<br/>debug_report.md<br/>repo_context.json<br/>runtime.json<br/>trace.json<br/>patch.diff<br/>modified_repo"]
    PACKAGE --> USAGE["execution.usage:<br/>commands_run/patch_iterations/files_modified<br/>llm calls/token"]
```

Debug patch loop 真实策略：

```mermaid
flowchart TD
    OUTPUT["当前失败输出 current_output"] --> LLMON{"issue.use_llm?"}

    LLMON -->|"yes"| ZAIPLAN["apply_llm_patch<br/>调用 Z.ai 返回 JSON patch plan"]
    ZAIPLAN --> ZAIOK{"patch_generated?"}
    ZAIOK -->|"yes"| APPLY["应用 Z.ai patch"]
    ZAIOK -->|"no/异常/none"| HEUR["apply_patch_heuristics"]

    LLMON -->|"no"| HEUR

    HEUR --> H1{"No module named X?"}
    H1 -->|"仓库内能找到模块 roots"| CONFTST["create_pytest_path_patch<br/>生成 conftest.py 注入 sys.path"]
    H1 -->|"safe stub module 如 six"| STUB["create_stub_module_patch<br/>生成本地 shim"]
    H1 -->|"无匹配"| STOP["no_patch"]

    APPLY --> VERIFY["run_command(test_command)"]
    CONFTST --> VERIFY
    STUB --> VERIFY

    VERIFY --> DONE{"通过或 10 轮结束?"}
    DONE -->|"未通过且还有轮次"| OUTPUT
    DONE -->|"结束"| RESULT["patch_result"]
```

## 4. Human Market Task Spec Agent

对应接口：

```text
POST /v1/human-market/spec
```

这个 agent 不执行平台 Dataset/Debug Miner。它只负责人工 Miner 市场的任务条款草案和最终确认。

真实 LangGraph 节点：

```mermaid
flowchart TD
    START([START]) --> DRAFT["draft_spec"]
    DRAFT --> VALIDATE["validate_market_rule"]
    VALIDATE --> CONFIRM["confirmation_gate"]
    CONFIRM --> NORMALIZE["normalize_response"]
    NORMALIZE --> END([END])
```

当前已实现逻辑：

```mermaid
flowchart TD
    INPUT["user_input + spec_confirmed + use_llm + overrides"] --> DRAFT["draft_spec"]

    DRAFT --> LLM{"use_llm=true?"}
    LLM -->|"yes"| ZAIDRAFT["Z.ai 生成 task_definition<br/>validator_criteria<br/>reward_rule"]
    LLM -->|"no 或失败"| RULEDRAFT["规则解析草案"]

    ZAIDRAFT --> OVERRIDE["apply_overrides<br/>允许前端覆盖 task_definition/validator_criteria/reward_rule"]
    RULEDRAFT --> OVERRIDE

    OVERRIDE --> NORMALIZE["normalize_reward_rule<br/>转数字、规范 shares"]
    NORMALIZE --> VALIDATE["validate_market_rule"]

    VALIDATE --> CHECKS{"检查 x/y/z/[a]"}
    CHECKS -->|"缺字段或错误"| NEED["needs_confirmation<br/>返回 missing_fields / validation_errors"]
    CHECKS -->|"合法"| GATE["confirmation_gate"]

    GATE -->|"spec_confirmed=false"| WAIT["awaiting_spec_confirmation<br/>返回 draft_human_market_spec"]
    GATE -->|"spec_confirmed=true"| READY["ready<br/>返回 human_market_task_spec"]
```

奖励规则校验：

```mermaid
flowchart TD
    RULE["reward_rule"] --> X["x = threshold_score<br/>0 <= x <= 100"]
    RULE --> Y["y = winner_count"]
    RULE --> Z["z = settlement_window_hours<br/>z > 0"]
    RULE --> A["[a1..ay] = winner_shares"]

    Y --> LEN{"len([a]) == y?"}
    A --> SUM{"sum([a]) == 1?"}
    X --> OK{"全部合法?"}
    Z --> OK
    LEN --> OK
    SUM --> OK

    OK -->|"yes"| POLICY["生成 settlement_policy:<br/>final_score >= x 才可拿钱<br/>前 y 名按 [a] 分钱<br/>y 个齐后用户可结算<br/>z 后不足 y 个自动退款"]
    OK -->|"no"| ERR["needs_confirmation"]
```

## 5. Payment Verification Module

对应接口：

```text
POST /v1/payment/verify
```

这不是 LangGraph agent，而是 Agent 后端的支付闸门。前端钱包付款后，把 `tx_hash` 发给这里；验证通过后才继续执行平台 Dataset/Debug Miner。

```mermaid
flowchart TD
    REQ["tx_hash + expected_price + payer_address"] --> LOAD["PaymentConfig.from_env<br/>SEPOLIA_RPC_URL<br/>CONTRACT_ADDRESS<br/>chain_id=11155111"]
    LOAD --> HASH["normalize_tx_hash<br/>0x + 32 bytes"]
    HASH --> CHAIN["eth_chainId"]
    CHAIN --> CHAINOK{"chainId == 11155111?"}
    CHAINOK -->|"no"| FAIL["payment_verified=false"]
    CHAINOK -->|"yes"| TX["eth_getTransactionByHash"]

    TX --> TXOK{"tx exists?"}
    TXOK -->|"no"| FAIL
    TXOK -->|"yes"| RECEIPT["eth_getTransactionReceipt"]

    RECEIPT --> RCPTOK{"receipt exists<br/>status == 1?"}
    RCPTOK -->|"no"| FAIL
    RCPTOK -->|"yes"| CHECKS["校验:<br/>tx.to == ComputeOutsourcePlatform<br/>tx.from == payer_address<br/>tx.value >= expected_price"]

    CHECKS --> OK{"全部通过?"}
    OK -->|"yes"| PASS["payment_verified=true<br/>返回 paid_amount/confirmations"]
    OK -->|"no"| FAIL
```

前端推荐链路：

```mermaid
flowchart LR
    A["/v1/intake<br/>拿 suggested_price"] --> B["钱包付款<br/>Sepolia tx"]
    B --> C["/v1/payment/verify<br/>校验 txHash"]
    C -->|"true"| D["/v1/execute<br/>带 payment_tx_hash 二次校验"]
    C -->|"false"| E["提示用户付款失败/金额不足"]
```

## 6. Platform Agent Registry

对应接口：

```text
POST /v1/platform-agents
GET /v1/platform-agents
GET /v1/platform-agents/{agent_id}
```

这不是 LangGraph agent，而是“新增平台 miner/agent”的注册入口。目前是内存存储，服务重启后会丢。

```mermaid
flowchart TD
    CREATE["POST /v1/platform-agents"] --> VALID["Pydantic 校验:<br/>agent_name/company_name/api_url/input_schema/output_schema"]
    VALID --> SLUG["slugify(company + agent)<br/>生成 agent_id"]
    SLUG --> RECORD["生成 registry record:<br/>input_schema/output_schema<br/>routing.assigned_agent<br/>execution.invocation_url"]
    RECORD --> STORE["内存 store"]
    STORE --> RESP["返回 status=draft<br/>review_status=pending"]

    LIST["GET /v1/platform-agents"] --> STORE
    DETAIL["GET /v1/platform-agents/{agent_id}"] --> STORE
```

## 对外讲法

如果只讲三个核心模块，建议这样讲：

```mermaid
flowchart LR
    A["Platform Task Intake Agent<br/>平台自营任务规格化与报价"] --> B["Platform Miner Agents<br/>Dataset Miner / Debug Miner 自动执行"]
    C["Human Market Task Spec Agent<br/>人工市场任务条款与奖励规则 finalize"] --> D["Human Miner Market<br/>人工接单/Validator 审核/链上结算"]
    E["Payment Verification<br/>Sepolia txHash 闸门"] --> B
```

当前代码已实现：

```text
Platform Task Intake Agent: 已实现
Dataset Miner Agent: 已实现
Debug Miner Agent: 已实现
Human Market Task Spec Agent: 已实现
Payment Verification: 已实现
Platform Agent Registry: 已实现
Human Miner Market 接单执行和 Validator 市场页面: 不在 aurora-agent-core 内
```
