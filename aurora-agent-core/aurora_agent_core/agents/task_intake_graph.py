from __future__ import annotations

import json
import re
from typing import Any, Literal, Optional, TypedDict

from langgraph.graph import END, START, StateGraph

from aurora_agent_core.core.trace import append_trace, new_run_id
from aurora_agent_core.llm.zai_client import call_zai_chat_with_usage
from aurora_agent_core.pricing import estimate_debug_price
from aurora_agent_core.registry import get_registry_entry, load_miner_registry
from aurora_agent_core.schemas.task_spec import get_missing_fields, normalize_task_spec


class TaskIntakeState(TypedDict, total=False):
    run_id: str
    user_input: str
    draft_task: dict[str, Any]
    feasibility: dict[str, Any]
    missing_fields: list[str]
    suggested_price: Optional[float]
    pricing: dict[str, Any]
    user_budget: Optional[float]
    price_confirmed: bool
    use_llm: bool
    llm_error: str
    llm_usage: dict[str, Any]
    ready: bool
    response_status: str
    response: dict[str, Any]
    trace: list[dict[str, Any]]


CONFIRM_WORDS = ["确认", "接受", "同意", "ok", "yes", "可以", "按这个", "预算"]


class TaskIntakeGraph:
    def __init__(self) -> None:
        self.graph = self._build_graph()

    def run(self, user_input: str | dict[str, Any]) -> dict[str, Any]:
        initial_state: TaskIntakeState
        if isinstance(user_input, dict):
            initial_state = {
                "run_id": user_input.get("run_id") or new_run_id("intake"),
                "user_input": user_input.get("user_input", ""),
                "price_confirmed": bool(user_input.get("price_confirmed", False)),
                "user_budget": user_input.get("user_budget"),
                "use_llm": bool(user_input.get("use_llm", False)),
                "trace": [],
            }
        else:
            initial_state = {
                "run_id": new_run_id("intake"),
                "user_input": user_input,
                "price_confirmed": False,
                "use_llm": False,
                "trace": [],
            }
        final_state = self.graph.invoke(initial_state)
        return final_state["response"]

    def _build_graph(self):
        builder = StateGraph(TaskIntakeState)
        builder.add_node("feasibility_check", feasibility_check)
        builder.add_node("reject_task", reject_task)
        builder.add_node("decompose_task", decompose_task)
        builder.add_node("missing_info_detector", missing_info_detector)
        builder.add_node("price_estimator", price_estimator)
        builder.add_node("confirmation_gate", confirmation_gate)
        builder.add_node("normalize_task", normalize_task)

        builder.add_edge(START, "feasibility_check")
        builder.add_conditional_edges(
            "feasibility_check",
            route_after_feasibility,
            {
                "reject": "reject_task",
                "continue": "decompose_task",
            },
        )
        builder.add_edge("reject_task", END)
        builder.add_edge("decompose_task", "missing_info_detector")
        builder.add_edge("missing_info_detector", "price_estimator")
        builder.add_edge("price_estimator", "confirmation_gate")
        builder.add_edge("confirmation_gate", "normalize_task")
        builder.add_edge("normalize_task", END)
        return builder.compile()


def feasibility_check(state: TaskIntakeState) -> TaskIntakeState:
    user_input = normalize_text(state.get("user_input"))
    inferred_task_type = infer_task_type_from_registry(user_input)

    if not user_input:
        feasibility = {"supported": False, "reason": "用户输入为空。"}
    elif not inferred_task_type:
        feasibility = {"supported": False, "reason": "当前没有匹配到已注册 Miner 支持的任务类型。"}
    else:
        feasibility = {
            "supported": True,
            "inferred_task_type": inferred_task_type,
            "reason": "任务匹配到已注册 Miner。",
        }

    return {
        "feasibility": feasibility,
        "trace": append_trace(state, "feasibility_check", "completed", feasibility),
    }


def route_after_feasibility(state: TaskIntakeState) -> Literal["reject", "continue"]:
    return "continue" if state["feasibility"]["supported"] else "reject"


def reject_task(state: TaskIntakeState) -> TaskIntakeState:
    response = {
        "status": "rejected",
        "agent_message": state["feasibility"]["reason"],
        "draft_task": None,
        "missing_fields": [],
        "suggested_price": None,
        "ready": False,
        "trace": {"run_id": state["run_id"], "events": append_trace(state, "reject_task", "completed")},
    }
    return {"response": response}


def decompose_task(state: TaskIntakeState) -> TaskIntakeState:
    text = normalize_text(state.get("user_input"))
    task_type = state["feasibility"]["inferred_task_type"]

    if state.get("use_llm"):
        try:
            draft_task, llm_usage = llm_decompose_task(text, task_type)
            return {
                "draft_task": draft_task,
                "llm_usage": llm_usage,
                "trace": append_trace(
                    state,
                    "decompose_task",
                    "completed",
                    {"task_type": task_type, "method": "llm", "llm_usage": llm_usage},
                ),
            }
        except Exception as error:
            state = {
                **state,
                "trace": append_trace(
                    state,
                    "decompose_task",
                    "fallback",
                    {"task_type": task_type, "method": "llm", "error": str(error)[:240]},
                ),
            }

    draft_task = rule_decompose_task(text, task_type)
    return {
        "draft_task": draft_task,
        "trace": append_trace(state, "decompose_task", "completed", {"task_type": task_type, "method": "rules"}),
    }


def rule_decompose_task(text: str, task_type: str) -> dict[str, Any]:
    if task_type == "code_debug":
        debug = build_debug_payload_from_text(text)
        return {
            "task_type": "code_debug",
            "title": "代码 Debug 任务",
            "goal": text or "定位并修复代码问题",
            "bug_description": debug["bug_description"],
            "code_source": debug["code_source"],
            "reproduction": debug["reproduction"],
            "execution_policy": debug["execution_policy"],
            "debug": debug,
            "repo_path": debug["code_source"].get("repo_url"),
            "requirements": extract_requirements(text),
            "constraints": extract_constraints(text),
            "output_format": "debug_report",
            "source_scope": ["repo"],
        }

    return {
        "task_type": "dataset_generation",
        "title": infer_dataset_title(text),
        "goal": text or "构建一个可复用的数据集",
        "requirements": extract_requirements(text),
        "constraints": extract_constraints(text),
        "output_format": extract_output_format(text),
        "target_size": extract_target_size(text),
        "source_scope": extract_source_scope(text),
        "source_config": extract_source_config(text),
    }


def llm_decompose_task(text: str, task_type: str) -> tuple[dict[str, Any], dict[str, Any]]:
    schema_hint = {
        "task_type": task_type,
        "title": "短标题",
        "goal": "用户目标",
        "requirements": ["要求1"],
        "constraints": ["约束1"],
        "output_format": "jsonl 或 json 或 csv 或 debug_report",
        "target_size": 100,
        "source_scope": ["osv", "github", "blogs", "papers", "docs", "public_web"],
        "source_config": {
            "osv_packages": [
                {"ecosystem": "Go", "name": "github.com/ethereum/go-ethereum"},
                {"ecosystem": "npm", "name": "@openzeppelin/contracts"}
            ]
        },
        "debug": {
            "debug_mode": "full_repo",
            "code_source": {
                "type": "git",
                "repo_url": "仅 code_debug 任务需要，可为 null",
                "branch": "main",
                "commit": None,
                "public_only": True,
            },
            "bug_description": "仅 code_debug 任务需要，可为 null",
            "expected_behavior": "可为 null",
            "actual_behavior": "可为 null",
            "reproduction": {
                "test_command": "可为 null",
                "logs": "可为 null",
                "entrypoint": "可为 null",
            },
            "execution_policy": {
                "allow_patch": False,
                "allow_commands": [],
                "timeout_seconds": 600,
                "cleanup_repo": True,
            },
        },
    }
    completion = call_zai_chat_with_usage(
        [
            {
                "role": "system",
                "content": (
                    "你是任务受理与拆解 Agent。只输出合法 JSON，不要 Markdown。"
                    "你需要把用户自然语言拆成 TaskSpec 草稿。"
                    "requirements、constraints、source_scope 必须是字符串数组。"
                    "target_size 必须是整数或 null。"
                ),
            },
            {
                "role": "user",
                "content": (
                    f"任务类型：{task_type}\n"
                    f"JSON 模板：{json.dumps(schema_hint, ensure_ascii=False)}\n"
                    f"用户输入：{text}"
                ),
            },
        ]
    )
    parsed = parse_json_object(completion.content)
    parsed["task_type"] = task_type
    parsed["goal"] = parsed.get("goal") or text
    parsed["title"] = parsed.get("title") or infer_dataset_title(text)
    parsed["requirements"] = ensure_string_list(parsed.get("requirements")) or extract_requirements(text)
    parsed["constraints"] = ensure_string_list(parsed.get("constraints")) or extract_constraints(text)
    parsed_dataset = parsed.get("dataset") if isinstance(parsed.get("dataset"), dict) else {}
    parsed["source_scope"] = normalize_source_scope(
        ensure_string_list(parsed.get("source_scope") or parsed_dataset.get("source_scope")) or extract_source_scope(text)
    )
    parsed["source_config"] = (
        ensure_source_config(parsed.get("source_config") or parsed_dataset.get("source_config")) or extract_source_config(text)
    )
    parsed["output_format"] = (
        parsed.get("output_format")
        or parsed_dataset.get("output_format")
        or ("debug_report" if task_type == "code_debug" else extract_output_format(text))
    )
    target_size = parsed.get("target_size") if isinstance(parsed.get("target_size"), int) else parsed_dataset.get("target_size")
    parsed["target_size"] = target_size if isinstance(target_size, int) else extract_target_size(text)
    if task_type == "dataset_generation":
        parsed["dataset"] = {
            "output_format": parsed["output_format"],
            "target_size": parsed["target_size"],
            "source_scope": parsed["source_scope"],
            "source_config": parsed["source_config"],
        }

    if task_type == "code_debug":
        fallback_debug = build_debug_payload_from_text(text)
        parsed_debug = parsed.get("debug") if isinstance(parsed.get("debug"), dict) else {}
        parsed["bug_description"] = parsed_debug.get("bug_description") or parsed.get("bug_description") or text
        parsed["code_source"] = parsed_debug.get("code_source") or parsed.get("code_source") or fallback_debug["code_source"]
        parsed["reproduction"] = parsed_debug.get("reproduction") or parsed.get("reproduction") or fallback_debug["reproduction"]
        parsed_policy = parsed_debug.get("execution_policy") or parsed.get("execution_policy") or {}
        parsed["execution_policy"] = merge_debug_execution_policy(fallback_debug["execution_policy"], parsed_policy)
        parsed["debug"] = {
            **fallback_debug,
            **parsed_debug,
            "bug_description": parsed["bug_description"],
            "code_source": parsed["code_source"],
            "reproduction": parsed["reproduction"],
            "execution_policy": parsed["execution_policy"],
        }
        parsed["repo_path"] = parsed["code_source"].get("repo_url")

    allowed_keys = {
        "task_type",
        "title",
        "goal",
        "requirements",
        "constraints",
        "output_format",
        "target_size",
        "source_scope",
        "source_config",
        "dataset",
    }
    if task_type == "code_debug":
        allowed_keys.update(
            {
                "repo_path",
                "bug_description",
                "code_source",
                "reproduction",
                "execution_policy",
                "debug",
            }
        )
    return {key: value for key, value in parsed.items() if key in allowed_keys}, completion.usage


def merge_debug_execution_policy(fallback_policy: dict[str, Any], parsed_policy: dict[str, Any]) -> dict[str, Any]:
    merged = {**fallback_policy, **parsed_policy}
    if fallback_policy.get("allow_patch"):
        merged["allow_patch"] = True
        merged["cleanup_repo"] = False
    if fallback_policy.get("allow_commands") and not merged.get("allow_commands"):
        merged["allow_commands"] = fallback_policy["allow_commands"]
    return merged


def normalize_source_scope(values: list[str]) -> list[str]:
    aliases = {
        "blog": "blogs",
        "博客": "blogs",
        "paper": "papers",
        "论文": "papers",
        "arxiv": "papers",
        "doc": "docs",
        "文档": "docs",
        "public": "public_web",
        "公开": "public_web",
    }
    allowed = {"osv", "github", "blogs", "papers", "docs", "public_web"}
    normalized: list[str] = []
    seen: set[str] = set()
    for value in values:
        key = aliases.get(str(value).strip().lower(), str(value).strip().lower())
        if key not in allowed or key in seen:
            continue
        seen.add(key)
        normalized.append(key)
    return normalized


def missing_info_detector(state: TaskIntakeState) -> TaskIntakeState:
    missing_fields = get_missing_fields(state["draft_task"])
    return {
        "missing_fields": missing_fields,
        "trace": append_trace(state, "missing_info_detector", "completed", {"missing_fields": missing_fields}),
    }


def price_estimator(state: TaskIntakeState) -> TaskIntakeState:
    if state.get("missing_fields"):
        price = None
    elif state["draft_task"]["task_type"] == "code_debug":
        pricing = estimate_debug_price(state["draft_task"])
        price = float(pricing["suggested_price"])
    else:
        entry = get_registry_entry("dataset_generation") or {}
        base_price = float((entry.get("pricing") or {}).get("base", 0.04))
        size = int(state["draft_task"].get("target_size") or 0)
        source_count = max(1, len(state["draft_task"].get("source_scope", [])))
        source_multiplier = max(1, source_count * 0.18)
        price = round(base_price + min(size, 1000) * 0.0007 * source_multiplier, 3)
        pricing = {
            "suggested_price": price,
            "currency": "ETH",
            "components": [
                {"name": "base", "amount": base_price},
                {"name": "target_size", "amount": round(price - base_price, 3)},
            ],
        }

    return {
        "suggested_price": price,
        "pricing": pricing if not state.get("missing_fields") else {},
        "trace": append_trace(state, "price_estimator", "completed", {"suggested_price": price, "pricing": pricing if not state.get("missing_fields") else {}}),
    }


def confirmation_gate(state: TaskIntakeState) -> TaskIntakeState:
    if state.get("missing_fields"):
        status = "needs_confirmation"
        ready = False
        user_budget = None
    else:
        text = normalize_text(state.get("user_input"))
        explicit_budget = extract_budget(text)
        user_budget = explicit_budget if explicit_budget is not None else state.get("user_budget")
        confirmed = bool(state.get("price_confirmed") or includes_any(text, CONFIRM_WORDS) or user_budget is not None)
        status = "ready" if confirmed else "awaiting_price_confirmation"
        ready = confirmed
        if ready and user_budget is None:
            user_budget = state.get("suggested_price")

    return {
        "response_status": status,
        "ready": ready,
        "user_budget": user_budget,
        "trace": append_trace(state, "confirmation_gate", "completed", {"status": status, "ready": ready}),
    }


def normalize_task(state: TaskIntakeState) -> TaskIntakeState:
    response = {
        "status": state["response_status"],
        "agent_message": build_agent_message(state),
        "draft_task": state["draft_task"],
        "missing_fields": state.get("missing_fields", []),
        "suggested_price": state.get("suggested_price"),
        "pricing": state.get("pricing", {}),
        "user_budget": state.get("user_budget"),
        "ready": state.get("ready", False),
        "usage": build_intake_usage(state),
    }
    if state.get("ready"):
        metadata = {}
        metadata["use_llm"] = bool(state.get("use_llm", False))
        if state.get("llm_usage"):
            metadata["llm_usage"] = state["llm_usage"]
        response["task_spec"] = normalize_task_spec(
            state["draft_task"],
            {
                "suggested_price": state.get("suggested_price"),
                "user_budget": state.get("user_budget"),
                "pricing": state.get("pricing", {}),
                "metadata": metadata,
            },
        )
    response["trace"] = {"run_id": state["run_id"], "events": append_trace(state, "normalize_task", "completed")}
    return {"response": response}


def build_agent_message(state: TaskIntakeState) -> str:
    status = state["response_status"]
    if status == "needs_confirmation":
        return f"我已经理解任务方向，但还需要补充：{'、'.join(state.get('missing_fields', []))}。"
    if status == "awaiting_price_confirmation":
        return f"任务已经足够清晰，建议价格为 {state.get('suggested_price')} ETH。请确认或修改预算。"
    if status == "ready":
        return "任务和预算都已经确认，可以进入执行阶段。"
    return "任务已处理。"


def build_intake_usage(state: TaskIntakeState) -> dict[str, Any]:
    usage: dict[str, Any] = {
        "agent": "task_intake",
        "llm": state.get("llm_usage"),
        "pricing": {
            "suggested_price": state.get("suggested_price"),
            "user_budget": state.get("user_budget"),
            "currency": "ETH",
            "breakdown": state.get("pricing", {}),
        },
    }
    return usage


def normalize_text(value: Any) -> str:
    return str(value or "").strip()


def includes_any(text: str, words: list[str]) -> bool:
    lowered = text.lower()
    return any(word.lower() in lowered for word in words)


def infer_task_type_from_registry(text: str) -> str | None:
    lowered = text.lower()
    best_task_type: str | None = None
    best_score = 0
    for task_type, entry in load_miner_registry().items():
        keywords = (entry.get("intent") or {}).get("keywords") or []
        score = sum(1 for keyword in keywords if str(keyword).lower() in lowered)
        if score > best_score:
            best_task_type = task_type
            best_score = score
    return best_task_type


def infer_dataset_title(text: str) -> str:
    if "漏洞" in text:
        return "漏洞数据集生成"
    if "web3" in text.lower():
        return "Web3 数据集生成"
    return "数据集生成任务"


def extract_requirements(text: str) -> list[str]:
    candidates = [
        ("重入", "覆盖重入漏洞"),
        ("权限", "覆盖权限控制问题"),
        ("价格操纵", "覆盖价格操纵问题"),
        ("推理", "包含推理过程"),
        ("标准答案", "包含标准答案"),
        ("去重", "需要去重"),
        ("高质量", "需要质量检查"),
    ]
    result = [value for keyword, value in candidates if keyword in text]
    return result or ["按用户目标产出可交付结果"]


def extract_constraints(text: str) -> list[str]:
    constraints: list[str] = []
    lower = text.lower()
    if "公开" in text or "public" in lower:
        constraints.append("仅使用公开来源")
    if "不要登录" in text or "无需登录" in text:
        constraints.append("不使用登录后数据")
    if "中文" in text:
        constraints.append("输出中文字段或中文说明")
    if "英文" in text:
        constraints.append("输出英文内容")
    return constraints or ["MVP 阶段限制在公开、有限来源内"]


def extract_output_format(text: str) -> str | None:
    lower = text.lower()
    if "jsonl" in lower:
        return "jsonl"
    if "csv" in lower:
        return "csv"
    if "json" in lower:
        return "json"
    return None


def extract_target_size(text: str) -> int | None:
    match = re.search(r"(?<![A-Za-z0-9])(\d{1,6})(?![A-Za-z0-9])\s*(条|个|records?|samples?|样本)?", text, flags=re.I)
    return int(match.group(1)) if match else None


def extract_source_scope(text: str) -> list[str]:
    lower = text.lower()
    scope: list[str] = []
    if "github" in lower:
        scope.append("github")
    if "osv" in lower:
        scope.append("osv")
    if "论文" in text or "paper" in lower or "arxiv" in lower:
        scope.append("papers")
    if "博客" in text or "blog" in lower:
        scope.append("blogs")
    if "文档" in text or "docs" in lower:
        scope.append("docs")
    if "公开" in text or "public" in lower:
        scope.append("public_web")
    return scope


def extract_source_config(text: str) -> dict[str, Any]:
    packages = extract_osv_packages(text)
    return {"osv_packages": packages} if packages else {}


def extract_osv_packages(text: str) -> list[dict[str, str]]:
    packages: list[dict[str, str]] = []
    patterns = [
        r"(?:npm|NPM)[:：]\s*([@A-Za-z0-9._/\-]+)",
        r"(?:go|Go|Golang)[:：]\s*([A-Za-z0-9._/\-]+)",
        r"(?:pypi|PyPI)[:：]\s*([A-Za-z0-9._/\-]+)",
    ]
    ecosystem_by_pattern = ["npm", "Go", "PyPI"]
    for pattern, ecosystem in zip(patterns, ecosystem_by_pattern):
        for match in re.finditer(pattern, text):
            packages.append({"ecosystem": ecosystem, "name": match.group(1)})

    known_packages = {
        "go-ethereum": {"ecosystem": "Go", "name": "github.com/ethereum/go-ethereum"},
        "geth": {"ecosystem": "Go", "name": "github.com/ethereum/go-ethereum"},
        "openzeppelin": {"ecosystem": "npm", "name": "@openzeppelin/contracts"},
        "@openzeppelin/contracts": {"ecosystem": "npm", "name": "@openzeppelin/contracts"},
        "hardhat": {"ecosystem": "npm", "name": "hardhat"},
        "solc": {"ecosystem": "npm", "name": "solc"},
    }
    lowered = text.lower()
    for keyword, package in known_packages.items():
        if keyword.lower() in lowered:
            packages.append(package)

    deduped: list[dict[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for package in packages:
        key = (package["ecosystem"].lower(), package["name"].lower())
        if key not in seen:
            seen.add(key)
            deduped.append(package)
    return deduped


def extract_repo_path(text: str) -> str | None:
    git_url = extract_git_repo_url(text)
    if git_url:
        return git_url
    match = re.search(r"(?:repo|仓库|路径)[:： ]+([^\s，,]+)", text, flags=re.I)
    return match.group(1) if match else None


def build_debug_payload_from_text(text: str) -> dict[str, Any]:
    test_command = extract_test_command(text)
    allow_patch = includes_any(text, ["修复", "patch", "改代码", "提交补丁", "修改后的代码", "保留仓库"])
    allow_commands = [test_command] if test_command else []
    return {
        "debug_mode": "full_repo",
        "code_source": {
            "type": "git",
            "repo_url": extract_git_repo_url(text) or extract_repo_path_without_git_fallback(text),
            "branch": extract_branch(text),
            "commit": extract_commit(text),
            "public_only": True,
        },
        "bug_description": text or "定位代码问题",
        "expected_behavior": extract_expected_behavior(text),
        "actual_behavior": extract_actual_behavior(text),
        "reproduction": {
            "test_command": test_command,
            "logs": extract_logs(text),
            "entrypoint": extract_entrypoint(text),
        },
        "execution_policy": {
            "allow_patch": allow_patch,
            "allow_commands": allow_commands,
            "timeout_seconds": extract_timeout_seconds(text) or 600,
            "cleanup_repo": not allow_patch,
        },
    }


def extract_git_repo_url(text: str) -> str | None:
    patterns = [
        r"https?://(?:www\.)?github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+(?:\.git)?",
        r"git@github\.com:[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+(?:\.git)?",
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(0).rstrip("，,。.;；)")
    return None


def extract_repo_path_without_git_fallback(text: str) -> str | None:
    match = re.search(r"(?:repo|仓库|路径)[:： ]+([^\s，,]+)", text, flags=re.I)
    return match.group(1).rstrip("，,。.;；)") if match else None


def extract_branch(text: str) -> str | None:
    match = re.search(r"(?:branch|分支)[:： ]+([A-Za-z0-9._/\-]+)", text, flags=re.I)
    return match.group(1) if match else None


def extract_commit(text: str) -> str | None:
    match = re.search(r"(?:commit|sha)[:： ]+([A-Fa-f0-9]{7,40})", text, flags=re.I)
    return match.group(1) if match else None


def extract_test_command(text: str) -> str | None:
    patterns = [
        r"(?:测试命令|复现命令|运行命令|test command|command)[:： ]+([^\n]+)",
        r"`([^`]*(?:test|pytest|pnpm|npm|yarn|uv|go test|cargo test)[^`]*)`",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.I)
        if match:
            return split_field_tail(match.group(1)).strip().rstrip("，,。.;；")
    return None


def extract_logs(text: str) -> str | None:
    match = re.search(r"(?:错误日志|报错信息|错误信息|日志|logs?)[:： ]+(.+)", text, flags=re.I | re.S)
    return truncate_for_field(match.group(1), 1200) if match else None


def extract_expected_behavior(text: str) -> str | None:
    match = re.search(r"(?:期望|应该|expected)[:： ]+([^\n。；;，,]+)", text, flags=re.I)
    return match.group(1).strip() if match else None


def extract_actual_behavior(text: str) -> str | None:
    match = re.search(r"(?:实际|现在|actual)[:： ]+([^\n。；;，,]+)", text, flags=re.I)
    return match.group(1).strip() if match else None


def extract_entrypoint(text: str) -> str | None:
    match = re.search(r"(?:入口|entrypoint)[:： ]+([^\s，,。；;]+)", text, flags=re.I)
    return match.group(1) if match else None


def extract_timeout_seconds(text: str) -> int | None:
    match = re.search(r"(?:timeout|超时)[:： ]*(\d{1,4})\s*(?:s|秒)?", text, flags=re.I)
    return int(match.group(1)) if match else None


def truncate_for_field(value: str, limit: int) -> str:
    cleaned = str(value or "").strip()
    if len(cleaned) <= limit:
        return cleaned
    return cleaned[: limit - 3] + "..."


def split_field_tail(value: str) -> str:
    markers = [
        "，期望",
        ",期望",
        "，实际",
        ",实际",
        "，expected",
        ",expected",
        "，actual",
        ",actual",
        "，保留",
        ",保留",
        "，我要",
        ",我要",
    ]
    end = len(value)
    lowered = value.lower()
    for marker in markers:
        index = lowered.find(marker.lower())
        if index != -1:
            end = min(end, index)
    return value[:end]


def extract_budget(text: str) -> float | None:
    match = re.search(r"(?:预算|budget|价格|price)[^\d]*(\d+(?:\.\d+)?)", text, flags=re.I)
    return float(match.group(1)) if match else None


def parse_json_object(text: str) -> dict[str, Any]:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?", "", cleaned).strip()
        cleaned = re.sub(r"```$", "", cleaned).strip()
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("LLM did not return a JSON object.")
    value = json.loads(cleaned[start : end + 1])
    if not isinstance(value, dict):
        raise ValueError("LLM JSON output is not an object.")
    return value


def ensure_string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    result = []
    for item in value:
        text = str(item).strip()
        if text:
            result.append(text)
    return result


def ensure_source_config(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        return {}
    packages = value.get("osv_packages")
    if not isinstance(packages, list):
        return {}
    normalized = []
    for package in packages:
        if not isinstance(package, dict):
            continue
        ecosystem = str(package.get("ecosystem") or "").strip()
        name = str(package.get("name") or "").strip()
        if ecosystem and name:
            normalized.append({"ecosystem": ecosystem, "name": name})
    return {"osv_packages": normalized} if normalized else {}
