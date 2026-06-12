from __future__ import annotations

import json
import re
from typing import Any, Optional, TypedDict

from langgraph.graph import END, START, StateGraph

from aurora_agent_core.core.trace import append_trace, new_run_id
from aurora_agent_core.llm.zai_client import call_zai_chat_with_usage
from aurora_agent_core.schemas.task_spec import create_task_id


class HumanMarketSpecState(TypedDict, total=False):
    run_id: str
    user_input: str
    spec_confirmed: bool
    use_llm: bool
    overrides: dict[str, Any]
    draft_spec: dict[str, Any]
    missing_fields: list[str]
    validation_errors: list[str]
    llm_usage: dict[str, Any]
    llm_error: str
    ready: bool
    response_status: str
    response: dict[str, Any]
    trace: list[dict[str, Any]]


CONFIRM_WORDS = ["确认", "接受", "同意", "ok", "yes", "可以", "按这个", "finalize"]


class HumanMarketTaskSpecGraph:
    """Finalize task and reward rules for the open human-miner marketplace."""

    def __init__(self) -> None:
        self.graph = self._build_graph()

    def run(self, user_input: str | dict[str, Any]) -> dict[str, Any]:
        if isinstance(user_input, dict):
            initial_state: HumanMarketSpecState = {
                "run_id": user_input.get("run_id") or new_run_id("human_market_spec"),
                "user_input": user_input.get("user_input", ""),
                "spec_confirmed": bool(user_input.get("spec_confirmed", False)),
                "use_llm": bool(user_input.get("use_llm", False)),
                "overrides": {
                    "task_definition": user_input.get("task_definition") or {},
                    "validator_criteria": user_input.get("validator_criteria") or {},
                    "reward_rule": user_input.get("reward_rule") or {},
                },
                "trace": [],
            }
        else:
            initial_state = {
                "run_id": new_run_id("human_market_spec"),
                "user_input": user_input,
                "spec_confirmed": False,
                "use_llm": False,
                "overrides": {},
                "trace": [],
            }
        final_state = self.graph.invoke(initial_state)
        return final_state["response"]

    def _build_graph(self):
        builder = StateGraph(HumanMarketSpecState)
        builder.add_node("draft_spec", draft_spec)
        builder.add_node("validate_market_rule", validate_market_rule)
        builder.add_node("confirmation_gate", confirmation_gate)
        builder.add_node("normalize_response", normalize_response)

        builder.add_edge(START, "draft_spec")
        builder.add_edge("draft_spec", "validate_market_rule")
        builder.add_edge("validate_market_rule", "confirmation_gate")
        builder.add_edge("confirmation_gate", "normalize_response")
        builder.add_edge("normalize_response", END)
        return builder.compile()


def draft_spec(state: HumanMarketSpecState) -> HumanMarketSpecState:
    text = normalize_text(state.get("user_input"))
    draft = rule_draft_spec(text)
    llm_usage = None

    if state.get("use_llm"):
        try:
            draft, llm_usage = llm_draft_spec(text, draft)
        except Exception as error:
            state = {
                **state,
                "llm_error": str(error)[:500],
                "trace": append_trace(state, "draft_spec", "fallback", {"error": str(error)[:240]}),
            }

    draft = apply_overrides(draft, state.get("overrides") or {})
    return {
        "draft_spec": normalize_reward_rule(draft),
        "llm_usage": llm_usage,
        "trace": append_trace(
            state,
            "draft_spec",
            "completed",
            {"method": "llm" if llm_usage else "rules", "llm_usage": llm_usage},
        ),
    }


def rule_draft_spec(text: str) -> dict[str, Any]:
    reward_rule = {
        "threshold_score": extract_threshold_score(text),
        "winner_count": extract_winner_count(text),
        "settlement_window_hours": extract_settlement_window_hours(text),
        "winner_shares": extract_winner_shares(text),
    }
    if not reward_rule["winner_count"] and reward_rule["winner_shares"]:
        reward_rule["winner_count"] = len(reward_rule["winner_shares"])

    return {
        "market_mode": "human_miner_market",
        "task_definition": {
            "title": infer_title(text),
            "goal": text,
            "deliverables": infer_deliverables(text),
            "output_format": infer_output_format(text),
        },
        "validator_criteria": {
            "summary": "Validator must score only against the finalized task definition and deliverables.",
            "scoring_dimensions": infer_scoring_dimensions(text),
            "checklist": infer_validator_checklist(text),
            "pass_condition": build_pass_condition(reward_rule["threshold_score"]),
        },
        "reward_rule": reward_rule,
    }


def llm_draft_spec(text: str, fallback: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    schema = {
        "market_mode": "human_miner_market",
        "task_definition": {
            "title": "任务短标题",
            "goal": "任务具体定义",
            "deliverables": ["交付物1"],
            "output_format": "markdown|jsonl|zip|patch|repo",
        },
        "validator_criteria": {
            "summary": "评分总则",
            "scoring_dimensions": [{"name": "维度名", "weight": 40}],
            "checklist": ["检查项1"],
        },
        "reward_rule": {
            "threshold_score": 75,
            "winner_count": 3,
            "settlement_window_hours": 168,
            "winner_shares": [0.5, 0.3, 0.2],
        },
    }
    completion = call_zai_chat_with_usage(
        [
            {
                "role": "system",
                "content": (
                    "你是 Human Market Task Spec Agent。只输出合法 JSON，不要 Markdown。"
                    "你要把人工矿工市场任务转成可确认的任务定义、validator 评分细则、奖励规则。"
                    "奖励规则必须显式包含 threshold_score x、winner_count y、settlement_window_hours z、winner_shares [a1..ay]。"
                    "winner_shares 必须是 0 到 1 的小数列表。"
                ),
            },
            {
                "role": "user",
                "content": (
                    f"JSON 模板：{json.dumps(schema, ensure_ascii=False)}\n"
                    f"规则回退草案：{json.dumps(fallback, ensure_ascii=False)}\n"
                    f"用户输入：{text}"
                ),
            },
        ]
    )
    parsed = parse_json_object(completion.content)
    return merge_spec(fallback, parsed), completion.usage


def validate_market_rule(state: HumanMarketSpecState) -> HumanMarketSpecState:
    spec = state["draft_spec"]
    missing: list[str] = []
    errors: list[str] = []
    task_definition = spec.get("task_definition") or {}
    criteria = spec.get("validator_criteria") or {}
    reward_rule = spec.get("reward_rule") or {}

    if not task_definition.get("goal"):
        missing.append("task_definition.goal")
    if not criteria.get("scoring_dimensions"):
        missing.append("validator_criteria.scoring_dimensions")
    if reward_rule.get("threshold_score") is None:
        missing.append("reward_rule.threshold_score_x")
    if reward_rule.get("winner_count") is None:
        missing.append("reward_rule.winner_count_y")
    if reward_rule.get("settlement_window_hours") is None:
        missing.append("reward_rule.settlement_window_z")
    if not reward_rule.get("winner_shares"):
        missing.append("reward_rule.winner_shares_[a1..ay]")

    threshold = reward_rule.get("threshold_score")
    if threshold is not None and not 0 <= float(threshold) <= 100:
        errors.append("reward_rule.threshold_score must be between 0 and 100.")

    winner_count = reward_rule.get("winner_count")
    shares = reward_rule.get("winner_shares") or []
    if winner_count is not None and shares and int(winner_count) != len(shares):
        errors.append("reward_rule.winner_count must equal len(winner_shares).")
    if shares and abs(sum(float(value) for value in shares) - 1.0) > 0.001:
        errors.append("sum(reward_rule.winner_shares) must equal 1.")

    window = reward_rule.get("settlement_window_hours")
    if window is not None and int(window) <= 0:
        errors.append("reward_rule.settlement_window_hours must be positive.")

    return {
        "missing_fields": missing,
        "validation_errors": errors,
        "trace": append_trace(
            state,
            "validate_market_rule",
            "completed",
            {"missing_fields": missing, "validation_errors": errors},
        ),
    }


def confirmation_gate(state: HumanMarketSpecState) -> HumanMarketSpecState:
    text = normalize_text(state.get("user_input"))
    if state.get("missing_fields") or state.get("validation_errors"):
        status = "needs_confirmation"
        ready = False
    else:
        confirmed = bool(state.get("spec_confirmed") or includes_any(text, CONFIRM_WORDS))
        status = "ready" if confirmed else "awaiting_spec_confirmation"
        ready = confirmed
    return {
        "response_status": status,
        "ready": ready,
        "trace": append_trace(state, "confirmation_gate", "completed", {"status": status, "ready": ready}),
    }


def normalize_response(state: HumanMarketSpecState) -> HumanMarketSpecState:
    draft = attach_settlement_policy(state["draft_spec"])
    response: dict[str, Any] = {
        "status": state["response_status"],
        "agent_message": build_agent_message(state),
        "draft_human_market_spec": draft,
        "missing_fields": state.get("missing_fields", []),
        "validation_errors": state.get("validation_errors", []),
        "ready": state.get("ready", False),
        "usage": {
            "agent": "human_market_task_spec",
            "llm": state.get("llm_usage"),
        },
    }
    if state.get("ready"):
        response["human_market_task_spec"] = {
            **draft,
            "task_id": create_task_id("human_market_task"),
            "metadata": {
                "created_by": "human_market_task_spec_graph",
                "schema_version": "0.1.0",
                "requires_market_reward_pool": True,
            },
        }
    response["trace"] = {"run_id": state["run_id"], "events": append_trace(state, "normalize_response", "completed")}
    return {"response": response}


def build_agent_message(state: HumanMarketSpecState) -> str:
    if state["response_status"] == "needs_confirmation":
        missing = state.get("missing_fields", [])
        errors = state.get("validation_errors", [])
        details = missing + errors
        return f"人工市场任务规则还不能 finalize，需要补充或修正：{'、'.join(details)}。"
    if state["response_status"] == "awaiting_spec_confirmation":
        rule = (state.get("draft_spec") or {}).get("reward_rule") or {}
        return (
            "人工市场任务定义、validator 评分细则和奖励规则已生成。"
            f"当前规则：分数超过 {rule.get('threshold_score')} 的前 {rule.get('winner_count')} 个 miner "
            f"按 {rule.get('winner_shares')} 分配奖池，窗口 {rule.get('settlement_window_hours')} 小时。请确认或修改。"
        )
    if state["response_status"] == "ready":
        return "人工市场 Task Spec 已 finalize，可以进入 createTask 建奖池和人工 Miner 市场发布流程。"
    return "人工市场任务规则已处理。"


def attach_settlement_policy(spec: dict[str, Any]) -> dict[str, Any]:
    reward_rule = dict(spec.get("reward_rule") or {})
    threshold = reward_rule.get("threshold_score")
    winner_count = reward_rule.get("winner_count")
    window = reward_rule.get("settlement_window_hours")
    shares = reward_rule.get("winner_shares") or []
    reward_rule["settlement_policy"] = {
        "eligible_condition": f"final_score >= {threshold}",
        "winner_selection": f"top {winner_count} eligible miners by final_score, then earlier submission time",
        "payout_rule": [
            {"rank": index + 1, "share": share}
            for index, share in enumerate(shares)
        ],
        "user_can_settle_when": f"{winner_count} eligible miners are available",
        "auto_refund_condition": (
            f"after {window} hours, if eligible miner count < {winner_count}, refund the reward pool to task creator"
        ),
        "full_refund_if_eligible_winners_lt_y": True,
    }
    return {**spec, "reward_rule": reward_rule}


def apply_overrides(spec: dict[str, Any], overrides: dict[str, Any]) -> dict[str, Any]:
    result = dict(spec)
    for key in ("task_definition", "validator_criteria", "reward_rule"):
        override = overrides.get(key)
        if isinstance(override, dict):
            result[key] = merge_spec(result.get(key, {}), override)
    return result


def merge_spec(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    result = dict(base)
    for key, value in (override or {}).items():
        if isinstance(value, dict) and isinstance(result.get(key), dict):
            result[key] = merge_spec(result[key], value)
        elif value not in (None, "", []):
            result[key] = value
    return result


def normalize_reward_rule(spec: dict[str, Any]) -> dict[str, Any]:
    reward_rule = dict(spec.get("reward_rule") or {})
    reward_rule["threshold_score"] = coerce_float(reward_rule.get("threshold_score"))
    reward_rule["winner_count"] = coerce_int(reward_rule.get("winner_count"))
    reward_rule["settlement_window_hours"] = coerce_int(reward_rule.get("settlement_window_hours"))
    reward_rule["winner_shares"] = normalize_shares(reward_rule.get("winner_shares"))
    return {**spec, "reward_rule": reward_rule}


def infer_title(text: str) -> str:
    if "debug" in text.lower() or "修复" in text:
        return "人工 Debug 悬赏任务"
    if "数据集" in text or "dataset" in text.lower():
        return "人工数据集悬赏任务"
    if "审计" in text or "audit" in text.lower():
        return "人工审计悬赏任务"
    return "人工 Miner 市场任务"


def infer_deliverables(text: str) -> list[str]:
    lower = text.lower()
    if "debug" in lower or "修复" in text:
        return ["修改后的代码或 patch.diff", "复现与验证说明", "关键风险说明"]
    if "数据集" in text or "dataset" in lower:
        return ["数据集文件", "schema 说明", "来源与质量报告"]
    if "审计" in text or "audit" in lower:
        return ["审计报告", "漏洞列表与严重度", "PoC 或修复建议"]
    return ["任务交付物", "执行说明", "验证证据"]


def infer_output_format(text: str) -> str:
    lower = text.lower()
    if "jsonl" in lower:
        return "jsonl"
    if "zip" in lower:
        return "zip"
    if "patch" in lower:
        return "patch"
    if "repo" in lower or "仓库" in text:
        return "repo"
    return "markdown"


def infer_scoring_dimensions(text: str) -> list[dict[str, Any]]:
    if "debug" in text.lower() or "修复" in text:
        return [
            {"name": "reproduction_fix_success", "weight": 45},
            {"name": "patch_minimality_and_safety", "weight": 30},
            {"name": "explanation_and_handoff_quality", "weight": 25},
        ]
    if "数据集" in text or "dataset" in text.lower():
        return [
            {"name": "schema_completeness", "weight": 35},
            {"name": "record_quality_and_correctness", "weight": 40},
            {"name": "diversity_and_provenance", "weight": 25},
        ]
    return [
        {"name": "task_completion", "weight": 50},
        {"name": "technical_quality", "weight": 30},
        {"name": "format_and_evidence", "weight": 20},
    ]


def infer_validator_checklist(text: str) -> list[str]:
    if "debug" in text.lower() or "修复" in text:
        return [
            "Run or inspect the provided reproduction command.",
            "Check that the patch does not delete tests or hide failures.",
            "Confirm the explanation matches the observed bug and fix.",
        ]
    return [
        "Check that every required deliverable is present.",
        "Score only against the finalized task definition.",
        "Flag fabricated evidence, missing files, or unsupported claims.",
    ]


def build_pass_condition(threshold: float | None) -> str:
    if threshold is None:
        return "Only miners with final_score >= x are eligible for payout."
    return f"Only miners with final_score >= {threshold:g} are eligible for payout."


def extract_threshold_score(text: str) -> float | None:
    patterns = [
        r"(?:threshold|阈值|门槛|超过|大于|评分超过|分数超过|x\s*=)\s*[:：]?\s*(\d{1,3}(?:\.\d+)?)",
        r"(\d{1,3}(?:\.\d+)?)\s*分以上",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.I)
        if match:
            return float(match.group(1))
    return None


def extract_winner_count(text: str) -> int | None:
    patterns = [
        r"(?:前|top\s*|y\s*=)\s*(\d{1,3})\s*(?:个|名|miners?|矿工)?",
        r"(\d{1,3})\s*(?:个|名)\s*miner",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.I)
        if match:
            return int(match.group(1))
    return None


def extract_settlement_window_hours(text: str) -> int | None:
    patterns = [
        (r"(?:窗口|时间窗口|z\s*=|deadline|截止|发布过了)\s*[:：]?\s*(\d{1,4})\s*(小时|hour|hours|h)", 1),
        (r"(?:窗口|时间窗口|z\s*=|deadline|截止|发布过了)\s*[:：]?\s*(\d{1,4})\s*(天|day|days|d)", 24),
        (r"(\d{1,4})\s*(小时|hour|hours|h)\s*(?:后|内|窗口|截止|自动结算|自动退款)", 1),
        (r"(\d{1,4})\s*(天|day|days|d)\s*(?:后|内|窗口|截止|自动结算|自动退款)", 24),
    ]
    for pattern, multiplier in patterns:
        match = re.search(pattern, text, flags=re.I)
        if match:
            return int(match.group(1)) * multiplier
    return None


def extract_winner_shares(text: str) -> list[float]:
    bracket_match = re.search(r"\[([0-9.,\s%/：:，]+)\]", text)
    if bracket_match:
        return normalize_shares(split_number_list(bracket_match.group(1)))

    percent_values = [float(value) / 100 for value in re.findall(r"(\d{1,3}(?:\.\d+)?)\s*%", text)]
    if len(percent_values) >= 2:
        return normalize_shares(percent_values)

    ratio_match = re.search(r"(\d+(?:\.\d+)?(?:\s*[/：:，,]\s*\d+(?:\.\d+)?){1,8})", text)
    if ratio_match:
        return normalize_shares(split_number_list(ratio_match.group(1)))
    return []


def split_number_list(value: str) -> list[float]:
    parts = re.split(r"[/：:，,\s]+", value.strip())
    return [float(part.strip().rstrip("%")) for part in parts if part.strip()]


def normalize_shares(value: Any) -> list[float]:
    if not value:
        return []
    values = [float(item) for item in value if item is not None]
    if not values:
        return []
    if any(item > 1 for item in values):
        total = sum(values)
        if total <= 100 and any("%" in str(item) for item in value):
            values = [item / 100 for item in values]
        elif total > 0:
            values = [item / total for item in values]
    return [round(item, 6) for item in values]


def parse_json_object(content: str) -> dict[str, Any]:
    cleaned = content.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?", "", cleaned).strip()
        cleaned = re.sub(r"```$", "", cleaned).strip()
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("LLM response did not contain a JSON object.")
    parsed = json.loads(cleaned[start : end + 1])
    if not isinstance(parsed, dict):
        raise ValueError("LLM response must be a JSON object.")
    return parsed


def normalize_text(value: Any) -> str:
    return str(value or "").strip()


def includes_any(text: str, words: list[str]) -> bool:
    lowered = text.lower()
    return any(word.lower() in lowered for word in words)


def coerce_int(value: Any) -> int | None:
    try:
        if value is None or value == "":
            return None
        return int(value)
    except (TypeError, ValueError):
        return None


def coerce_float(value: Any) -> float | None:
    try:
        if value is None or value == "":
            return None
        return float(value)
    except (TypeError, ValueError):
        return None
