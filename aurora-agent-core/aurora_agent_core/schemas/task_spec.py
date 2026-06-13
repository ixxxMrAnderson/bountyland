from __future__ import annotations

from typing import Any
from uuid import uuid4

from aurora_agent_core.core.router import route_task
from aurora_agent_core.registry import apply_registry_defaults, check_required_fields


TASK_TYPES = {"dataset_generation", "code_debug"}


def create_task_id(prefix: str = "task") -> str:
    return f"{prefix}_{uuid4().hex[:12]}"


def normalize_task_spec(draft_task: dict[str, Any], extra: dict[str, Any] | None = None) -> dict[str, Any]:
    extra = extra or {}
    shaped_task = apply_registry_defaults(shape_task_spec(draft_task))
    shaped_task = {**shaped_task, **compatibility_fields(shaped_task.get("dataset"), shaped_task.get("debug"))}
    route = route_task(shaped_task)
    return {
        **shaped_task,
        "task_id": draft_task.get("task_id") or create_task_id(),
        "suggested_price": coerce_float(extra.get("suggested_price")),
        "user_budget": coerce_float(extra.get("user_budget")),
        "assigned_agent": route["assigned_agent"],
        "metadata": {
            "priority": extra.get("priority", "normal"),
            "created_by": "aurora_task_intake_graph",
            "schema_version": "0.2.0",
            **extra.get("metadata", {}),
        },
    }


def get_missing_fields(draft_task: dict[str, Any]) -> list[str]:
    shaped_task = apply_registry_defaults(shape_task_spec(draft_task))
    missing = check_required_fields(shaped_task)
    if not draft_task.get("task_type") and "task_type" not in missing:
        missing.insert(0, "task_type")
    return missing


def shape_task_spec(draft_task: dict[str, Any]) -> dict[str, Any]:
    task_type = draft_task.get("task_type") or "dataset_generation"
    dataset = build_dataset_payload(draft_task) if task_type == "dataset_generation" else None
    debug = build_debug_payload(draft_task) if task_type == "code_debug" else None
    shaped = {
        "task_type": task_type,
        "title": draft_task.get("title") or infer_title(draft_task),
        "goal": draft_task.get("goal") or "",
        "requirements": unique_strings(draft_task.get("requirements", [])),
        "constraints": unique_strings(draft_task.get("constraints", [])),
        "dataset": dataset,
        "debug": debug,
    }
    return {**shaped, **compatibility_fields(dataset, debug)}


def build_dataset_payload(draft_task: dict[str, Any]) -> dict[str, Any]:
    payload = draft_task.get("dataset") if isinstance(draft_task.get("dataset"), dict) else {}
    return {
        "output_format": payload.get("output_format") or draft_task.get("output_format"),
        "target_size": coerce_int(payload.get("target_size") if "target_size" in payload else draft_task.get("target_size")),
        "source_scope": unique_strings(payload.get("source_scope") or draft_task.get("source_scope", [])),
        "source_config": payload.get("source_config") or draft_task.get("source_config") or {},
    }


def build_debug_payload(draft_task: dict[str, Any]) -> dict[str, Any]:
    payload = draft_task.get("debug") if isinstance(draft_task.get("debug"), dict) else {}
    code_source = payload.get("code_source") if isinstance(payload.get("code_source"), dict) else {}
    reproduction = payload.get("reproduction") if isinstance(payload.get("reproduction"), dict) else {}
    execution_policy = payload.get("execution_policy") if isinstance(payload.get("execution_policy"), dict) else {}
    draft_code_source = draft_task.get("code_source") if isinstance(draft_task.get("code_source"), dict) else {}
    draft_reproduction = draft_task.get("reproduction") if isinstance(draft_task.get("reproduction"), dict) else {}

    repo_url = code_source.get("repo_url") or draft_code_source.get("repo_url") or draft_task.get("repo_url") or draft_task.get("repo_path")
    test_command = reproduction.get("test_command") or draft_reproduction.get("test_command") or draft_task.get("test_command")
    logs = reproduction.get("logs") or draft_reproduction.get("logs") or draft_task.get("logs")
    allow_commands = execution_policy.get("allow_commands")
    if not allow_commands:
        allow_commands = [test_command] if test_command else []

    return {
        "debug_mode": payload.get("debug_mode") or draft_task.get("debug_mode") or "full_repo",
        "code_source": {
            "type": code_source.get("type") or draft_code_source.get("type") or draft_task.get("code_source_type"),
            "repo_url": repo_url,
            "branch": code_source.get("branch") or draft_code_source.get("branch") or draft_task.get("branch"),
            "commit": code_source.get("commit") or draft_code_source.get("commit") or draft_task.get("commit"),
            "public_only": coerce_bool(code_source.get("public_only", draft_code_source.get("public_only", True))),
        },
        "bug_description": payload.get("bug_description") or draft_task.get("bug_description"),
        "expected_behavior": payload.get("expected_behavior") or draft_task.get("expected_behavior"),
        "actual_behavior": payload.get("actual_behavior") or draft_task.get("actual_behavior"),
        "reproduction": {
            "test_command": test_command,
            "logs": logs,
            "entrypoint": reproduction.get("entrypoint") or draft_reproduction.get("entrypoint") or draft_task.get("entrypoint"),
        },
        "execution_policy": {
            "allow_patch": coerce_bool(execution_policy.get("allow_patch", draft_task.get("allow_patch", False))),
            "allow_commands": allow_commands,
            "timeout_seconds": coerce_int(execution_policy.get("timeout_seconds") or draft_task.get("timeout_seconds")) or 600,
            "cleanup_repo": coerce_bool(execution_policy.get("cleanup_repo", draft_task.get("cleanup_repo", True))),
        },
    }


def compatibility_fields(dataset: dict[str, Any] | None, debug: dict[str, Any] | None) -> dict[str, Any]:
    if dataset is not None:
        return {
            "output_format": dataset.get("output_format"),
            "target_size": dataset.get("target_size"),
            "source_scope": dataset.get("source_scope") or [],
            "source_config": dataset.get("source_config") or {},
        }
    if debug is not None:
        return {
            "bug_description": debug.get("bug_description"),
            "code_source": debug.get("code_source") or {},
            "reproduction": debug.get("reproduction") or {},
            "execution_policy": debug.get("execution_policy") or {},
            "repo_path": (debug.get("code_source") or {}).get("repo_url"),
        }
    return {}


def infer_title(draft_task: dict[str, Any]) -> str:
    if draft_task.get("task_type") == "code_debug":
        return "代码 Debug 任务"
    return "数据集生成任务"


def unique_strings(values: list[Any] | None) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for value in values or []:
        text = str(value).strip()
        if text and text not in seen:
            seen.add(text)
            result.append(text)
    return result


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


def coerce_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "y", "ok", "可以", "是"}
    return bool(value)
