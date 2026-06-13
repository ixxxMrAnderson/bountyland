# Aurora Agent Core

Aurora 是当前项目的独立 Python + LangGraph Agent Backend MVP，只放在根目录下的 `aurora-agent-core` 文件夹中，不修改现有 `apps`、`contracts`、`docs`、`packages` 等目录。

组员接入和真实调用示例见 [docs/agent-usage-guide.zh.md](/Users/root1/Desktop/hackathon/bittenssor-pro/aurora-agent-core/docs/agent-usage-guide.zh.md)。

前端联调接口文档见 [docs/frontend-agent-api.zh.md](/Users/root1/Desktop/hackathon/bittenssor-pro/aurora-agent-core/docs/frontend-agent-api.zh.md)。

它按照 `AGENT_ARCHITECTURE_PLAN_ZH.md` 落地为：

- LangGraph 任务受理与拆解 Agent
- LangGraph 任务类型路由执行入口
- LangGraph Dataset Miner
- Debug Miner 的公开 Git 仓库诊断 MVP 与 VulDebugger 论文映射设计
- 统一 `TaskSpec`
- 可追踪 workflow trace
- 执行型 Miner 输出 artifact

## Conda 环境

推荐使用独立 conda 环境：

```bash
cd aurora-agent-core
conda env create -f environment.yml
conda activate aurora-agent-core
```

## 快速运行

```bash
python -m compileall aurora_agent_core examples
python examples/run_intake.py
python examples/run_dataset.py
python -m aurora_agent_core.cli --demo
```

`examples/run_intake.py` 是交互式示例：当任务信息足够但预算未确认时，会在终端提示你确认建议价格或输入新预算。

如果你的 shell 里 `python3` 仍然指向系统 Python，可以直接用：

```bash
conda run -n aurora-agent-core python examples/run_intake.py
conda run -n aurora-agent-core python examples/run_dataset.py
```

## 正经测试

自动化测试入口：

```bash
pytest -q
```

接口服务入口：

```bash
aurora-agent-api
# 或
python -m aurora_agent_core.api
```

默认地址：

```text
http://127.0.0.1:8791
```

核心接口：

```text
GET  /health
POST /v1/intake
POST /v1/execute
```

### 任务拆解接口

```bash
curl -s http://127.0.0.1:8791/v1/intake \
  -H 'Content-Type: application/json' \
  -d '{"user_input":"帮我构建 10 条 Web3 漏洞数据集，覆盖重入和权限控制，仅公开来源，输出 jsonl，来源包括 github 和博客"}'
```

使用 Z.ai 做任务拆解：

```bash
curl -s http://127.0.0.1:8791/v1/intake \
  -H 'Content-Type: application/json' \
  -d '{"user_input":"帮我构建 10 条 Web3 漏洞数据集，覆盖重入和权限控制，仅公开来源，输出 jsonl，来源包括 github 和博客","use_llm":true}'
```

如果返回 `awaiting_price_confirmation`，再确认价格：

```bash
curl -s http://127.0.0.1:8791/v1/intake \
  -H 'Content-Type: application/json' \
  -d '{"user_input":"帮我构建 10 条 Web3 漏洞数据集，覆盖重入和权限控制，仅公开来源，输出 jsonl，来源包括 github 和博客","price_confirmed":true,"user_budget":0.2}'
```

### 执行接口

```bash
curl -s http://127.0.0.1:8791/v1/execute \
  -H 'Content-Type: application/json' \
  -d '{"user_input":"帮我构建 10 条 Web3 漏洞数据集，覆盖重入和权限控制，仅公开来源，输出 jsonl，来源包括 github 和博客","price_confirmed":true}'
```

使用 OSV 真实公开漏洞数据源：

```bash
curl -s http://127.0.0.1:8791/v1/execute \
  -H 'Content-Type: application/json' \
  -d '{"user_input":"确认，帮我构建 10 条 Web3 漏洞数据集，仅公开来源，输出 jsonl，来源包括 OSV","price_confirmed":true}'
```

指定 OSV 包：

```bash
curl -s http://127.0.0.1:8791/v1/execute \
  -H 'Content-Type: application/json' \
  -d '{"user_input":"确认，帮我构建 3 条 OpenZeppelin 漏洞数据集，仅公开来源，输出 jsonl，来源包括 OSV，npm:@openzeppelin/contracts","price_confirmed":true}'
```

## Z.ai 模型配置

Z.ai 提供 OpenAI-compatible API。复制配置模板：

```bash
cp .env.example .env
```

然后填入：

```bash
ZAI_API_KEY=你的_zai_key
AURORA_MODEL=glm-5.1
AURORA_BASE_URL=https://api.z.ai/api/coding/paas/v4
```

测试模型连通性：

```bash
aurora-agent-zai-smoke "用一句话介绍你自己"
```

临时换模型测试：

```bash
aurora-agent-zai-smoke --model glm-5.1 "用一句话介绍你自己"
aurora-agent-zai-smoke --model glm-5 "请回复：测试成功"
```

当前默认使用官方 GLM-5.1 Coding Plan endpoint：

```bash
AURORA_BASE_URL=https://api.z.ai/api/coding/paas/v4
```

`run_dataset.py` 会在 `aurora-agent-core/artifacts/example_dataset_langgraph` 下生成：

- `dataset.jsonl`
- `sources.json`
- `report.md`
- `trace.json`
- `result.json`

## 当前边界

已实现：

- `StateGraph` 任务拆解和缺失信息检测
- 价格建议与确认状态机
- dataset generation/debug 两类路由
- 数据集任务的规划、来源发现、样本抽取、清洗、打包
- Z.ai OpenAI-compatible LLM 接入，可用于 Task Intake 拆解、Dataset synthetic 记录/报告生成、Debug 每轮 patch plan 和错误报告生成
- Debug Miner 公开 Git 仓库 clone、仓库检查、复现命令运行、失败信号分析、候选文件定位、patch loop 和报告打包

暂不实现：

- 大规模网络爬取
- Debug Miner 的断点调试和直接提交用户 GitHub 仓库
- AI 打分、Validator 审计、声誉系统

## 目录

```text
aurora-agent-core/
  aurora_agent_core/
    agents/task_intake_graph.py
    core/router.py
    core/trace.py
    miners/dataset_miner_graph.py
    miners/debug_miner_graph.py
    schemas/task_spec.py
    utils/files.py
    runner.py
    cli.py
  docs/
    architecture.zh.md
    vuldebugger-debug-agent-logic.zh.md
  examples/
    run_intake.py
    run_dataset.py
  pyproject.toml
```

## LangGraph 图

### Task Intake Graph

```text
START
  -> feasibility_check
  -> reject_task | decompose_task
  -> missing_info_detector
  -> price_estimator
  -> confirmation_gate
  -> normalize_task
  -> END
```

### Dataset Miner Graph

```text
START
  -> dataset_planner
  -> source_finder
  -> extractor
  -> cleaner
  -> packager
  -> END
```

### Debug Miner Graph

```text
START
  -> issue_interpreter
  -> workspace_preparer
  -> repo_context_inspector
  -> reproduction_oracle_builder
  -> runtime_state_collector
  -> state_divergence_analyzer
  -> root_cause_localizer
  -> fix_planner
  -> patch_generator
  -> debug_packager
  -> END
```

当前 Debug Miner 默认诊断、不改仓库；用户明确要求修复或保留修改后代码时，会开启 patch loop，输出 `patch.diff` 和 `workspace/repo` 修改后仓库。`use_llm=true` 时每轮 patch 都先调用 Z.ai 生成受限 patch plan，模型失败或拒绝时才用安全启发式兜底。完整论文映射设计见 [docs/vuldebugger-debug-agent-logic.zh.md](/Users/root1/Desktop/hackathon/bittenssor-pro/aurora-agent-core/docs/vuldebugger-debug-agent-logic.zh.md)。
