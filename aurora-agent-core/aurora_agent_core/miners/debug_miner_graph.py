from __future__ import annotations

import json
import re
import shutil
import subprocess
import os
import sys
import time
from pathlib import Path
from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph

from aurora_agent_core.core.trace import append_trace, new_run_id
from aurora_agent_core.llm.zai_client import call_zai_chat_with_usage
from aurora_agent_core.schemas.task_spec import create_task_id
from aurora_agent_core.utils.files import write_json, write_text


class DebugMinerState(TypedDict, total=False):
    run_id: str
    task_spec: dict[str, Any]
    output_dir: str
    status: str
    issue: dict[str, Any]
    repo_path: str
    clone_result: dict[str, Any]
    repo_context: dict[str, Any]
    reproduction: dict[str, Any]
    divergence: dict[str, Any]
    localization: dict[str, Any]
    fix_plan: dict[str, Any]
    patch_result: dict[str, Any]
    patch_iterations: list[dict[str, Any]]
    llm_usage: dict[str, Any]
    result: dict[str, Any]
    trace: list[dict[str, Any]]


DEBUG_NODES = [
    "issue_interpreter",
    "workspace_preparer",
    "repo_context_inspector",
    "reproduction_oracle_builder",
    "runtime_state_collector",
    "state_divergence_analyzer",
    "root_cause_localizer",
    "fix_planner",
    "patch_generator",
    "debug_packager",
]


class DebugMinerGraph:
    """Practical MVP debug miner for public Git repositories.

    The miner diagnoses by default. When the task explicitly allows patching,
    it keeps the cloned workspace, applies conservative local fixes, writes a
    patch diff, and returns the modified repository path as an artifact.
    """

    def __init__(self) -> None:
        self.graph = self._build_graph()

    def run(self, task_spec: dict[str, Any], output_dir: str | Path | None = None) -> dict[str, Any]:
        if task_spec.get("task_type") != "code_debug":
            raise ValueError("DebugMinerGraph only accepts task_type=code_debug.")
        task_id = task_spec.get("task_id") or create_task_id()
        resolved_output_dir = Path(output_dir).resolve() if output_dir else (Path.cwd() / "artifacts" / task_id).resolve()
        final_state = self.graph.invoke(
            {
                "run_id": new_run_id("debug"),
                "task_spec": {**task_spec, "task_id": task_id},
                "output_dir": str(resolved_output_dir),
                "trace": [],
            }
        )
        return final_state["result"]

    def _build_graph(self):
        builder = StateGraph(DebugMinerState)
        builder.add_node("issue_interpreter", issue_interpreter)
        builder.add_node("workspace_preparer", workspace_preparer)
        builder.add_node("repo_context_inspector", repo_context_inspector)
        builder.add_node("reproduction_oracle_builder", reproduction_oracle_builder)
        builder.add_node("runtime_state_collector", runtime_state_collector)
        builder.add_node("state_divergence_analyzer", state_divergence_analyzer)
        builder.add_node("root_cause_localizer", root_cause_localizer)
        builder.add_node("fix_planner", fix_planner)
        builder.add_node("patch_generator", patch_generator)
        builder.add_node("debug_packager", debug_packager)

        builder.add_edge(START, "issue_interpreter")
        builder.add_edge("issue_interpreter", "workspace_preparer")
        builder.add_edge("workspace_preparer", "repo_context_inspector")
        builder.add_edge("repo_context_inspector", "reproduction_oracle_builder")
        builder.add_edge("reproduction_oracle_builder", "runtime_state_collector")
        builder.add_edge("runtime_state_collector", "state_divergence_analyzer")
        builder.add_edge("state_divergence_analyzer", "root_cause_localizer")
        builder.add_edge("root_cause_localizer", "fix_planner")
        builder.add_edge("fix_planner", "patch_generator")
        builder.add_edge("patch_generator", "debug_packager")
        builder.add_edge("debug_packager", END)
        return builder.compile()


def issue_interpreter(state: DebugMinerState) -> DebugMinerState:
    spec = state["task_spec"]
    debug = debug_payload(spec)
    code_source = debug.get("code_source") or {}
    reproduction = debug.get("reproduction") or {}
    execution_policy = debug.get("execution_policy") or {}
    repo_url = code_source.get("repo_url")
    test_command = reproduction.get("test_command")
    logs = reproduction.get("logs")

    missing = []
    if not repo_url:
        missing.append("debug.code_source.repo_url")
    if not test_command and not logs:
        missing.append("reproduction_evidence")

    issue = {
        "task_id": spec["task_id"],
        "repo_url": repo_url,
        "branch": code_source.get("branch") or "main",
        "commit": code_source.get("commit"),
        "public_only": code_source.get("public_only", True),
        "bug_description": debug.get("bug_description") or spec.get("goal", ""),
        "expected_behavior": debug.get("expected_behavior"),
        "actual_behavior": debug.get("actual_behavior"),
        "test_command": test_command,
        "logs": logs,
        "allow_patch": bool(execution_policy.get("allow_patch", False)),
        "timeout_seconds": int(execution_policy.get("timeout_seconds") or 600),
        "cleanup_repo": bool(execution_policy.get("cleanup_repo", not execution_policy.get("allow_patch", False))),
        "use_llm": debug_use_llm_enabled(spec, execution_policy),
        "missing_fields": missing,
    }
    status = "failed" if missing else "interpreted"
    return {
        "issue": issue,
        "status": status,
        "trace": append_trace(state, "issue_interpreter", status, {"missing_fields": missing}),
    }


def debug_use_llm_enabled(spec: dict[str, Any], execution_policy: dict[str, Any]) -> bool:
    if "use_llm" in execution_policy:
        return bool(execution_policy.get("use_llm"))
    metadata = spec.get("metadata") or {}
    if "use_llm" in metadata:
        return bool(metadata.get("use_llm"))
    llm = metadata.get("llm")
    if isinstance(llm, dict) and "enabled" in llm:
        return bool(llm.get("enabled"))
    return False


def workspace_preparer(state: DebugMinerState) -> DebugMinerState:
    if state.get("status") == "failed":
        return {"trace": append_trace(state, "workspace_preparer", "skipped", {"reason": "invalid_issue"})}

    output_dir = Path(state["output_dir"])
    workspace = output_dir / "workspace"
    repo_path = workspace / "repo"
    workspace.mkdir(parents=True, exist_ok=True)
    if repo_path.exists():
        shutil.rmtree(repo_path)

    issue = state["issue"]
    start = time.time()
    clone_result = clone_repository(issue["repo_url"], repo_path, issue.get("branch"), issue.get("timeout_seconds", 600))
    clone_result["elapsed_seconds"] = round(time.time() - start, 3)
    status = "cloned" if clone_result["returncode"] == 0 else "failed"
    detail = {
        "repo_url": issue["repo_url"],
        "returncode": clone_result["returncode"],
        "elapsed_seconds": clone_result["elapsed_seconds"],
    }
    return {
        "repo_path": str(repo_path),
        "clone_result": clone_result,
        "status": status if status == "failed" else state.get("status", "interpreted"),
        "trace": append_trace(state, "workspace_preparer", status, detail),
    }


def repo_context_inspector(state: DebugMinerState) -> DebugMinerState:
    if state.get("status") == "failed":
        return {"trace": append_trace(state, "repo_context_inspector", "skipped", {"reason": "workspace_failed"})}

    repo_path = Path(state["repo_path"])
    context = inspect_repo(repo_path)
    return {
        "repo_context": context,
        "trace": append_trace(
            state,
            "repo_context_inspector",
            "completed",
            {"files_scanned": context["files_scanned"], "project_files": context["project_files"]},
        ),
    }


def reproduction_oracle_builder(state: DebugMinerState) -> DebugMinerState:
    issue = state["issue"]
    reproduction = {
        "test_command": issue.get("test_command"),
        "expected_behavior": issue.get("expected_behavior"),
        "actual_behavior": issue.get("actual_behavior"),
        "provided_logs": issue.get("logs"),
        "oracle": build_oracle(issue),
    }
    return {
        "reproduction": reproduction,
        "trace": append_trace(state, "reproduction_oracle_builder", "completed", {"has_command": bool(issue.get("test_command"))}),
    }


def runtime_state_collector(state: DebugMinerState) -> DebugMinerState:
    if state.get("status") == "failed":
        return {"trace": append_trace(state, "runtime_state_collector", "skipped", {"reason": "workspace_failed"})}

    issue = state["issue"]
    command = issue.get("test_command")
    if not command:
        runtime = {
            "returncode": None,
            "status": "logs_only",
            "stdout": "",
            "stderr": issue.get("logs") or "",
            "combined_output": issue.get("logs") or "",
            "elapsed_seconds": 0,
        }
        return {
            "reproduction": {**state.get("reproduction", {}), "runtime": runtime},
            "trace": append_trace(state, "runtime_state_collector", "logs_only", {"has_logs": bool(issue.get("logs"))}),
        }

    start = time.time()
    runtime = run_command(command, Path(state["repo_path"]), issue.get("timeout_seconds", 600))
    runtime["elapsed_seconds"] = round(time.time() - start, 3)
    status = "passed" if runtime["returncode"] == 0 else "failed"
    return {
        "reproduction": {**state.get("reproduction", {}), "runtime": runtime},
        "trace": append_trace(
            state,
            "runtime_state_collector",
            status,
            {"returncode": runtime["returncode"], "elapsed_seconds": runtime["elapsed_seconds"]},
        ),
    }


def state_divergence_analyzer(state: DebugMinerState) -> DebugMinerState:
    runtime = (state.get("reproduction") or {}).get("runtime") or {}
    combined_output = runtime.get("combined_output") or ""
    returncode = runtime.get("returncode")
    divergence = {
        "reproduced": returncode not in (0, None) or bool((state.get("issue") or {}).get("logs")),
        "returncode": returncode,
        "expected_behavior": (state.get("issue") or {}).get("expected_behavior"),
        "actual_behavior": (state.get("issue") or {}).get("actual_behavior"),
        "failure_signals": extract_failure_signals(combined_output),
        "referenced_paths": extract_referenced_paths(combined_output),
    }
    if returncode == 0:
        status = "no_repro"
    elif returncode is None:
        status = "logs_analyzed"
    else:
        status = "reproduced"
    return {
        "divergence": divergence,
        "trace": append_trace(state, "state_divergence_analyzer", status, {"signals": len(divergence["failure_signals"])}),
    }


def root_cause_localizer(state: DebugMinerState) -> DebugMinerState:
    repo_path = Path(state.get("repo_path") or ".")
    referenced_paths = (state.get("divergence") or {}).get("referenced_paths") or []
    candidates = rank_candidate_files(repo_path, referenced_paths, state.get("repo_context") or {})
    localization = {
        "confidence": infer_confidence(candidates, state.get("divergence") or {}),
        "candidate_files": candidates,
        "notes": build_localization_notes(candidates, state.get("divergence") or {}),
    }
    return {
        "localization": localization,
        "trace": append_trace(state, "root_cause_localizer", "completed", {"candidates": len(candidates)}),
    }


def fix_planner(state: DebugMinerState) -> DebugMinerState:
    issue = state.get("issue") or {}
    localization = state.get("localization") or {}
    allow_patch = bool(issue.get("allow_patch", False))
    steps = [
        "Review the top candidate files and match them against the failing stack trace or assertion.",
        "Add or narrow a failing test around the reproduced behavior before changing production code.",
        "Make the smallest code change that aligns actual behavior with the expected behavior.",
        "Re-run the captured reproduction command and any adjacent tests.",
    ]
    if not allow_patch:
        steps.append("Patch generation is disabled for this run; use this report as the handoff artifact.")

    fix_plan = {
        "allow_patch": allow_patch,
        "patch_generated": False,
        "candidate_files": localization.get("candidate_files", []),
        "recommended_steps": steps,
        "verification_command": issue.get("test_command"),
    }
    return {"fix_plan": fix_plan, "trace": append_trace(state, "fix_planner", "completed", {"allow_patch": allow_patch})}


def patch_generator(state: DebugMinerState) -> DebugMinerState:
    issue = state.get("issue") or {}
    if state.get("status") == "failed":
        return {
            "patch_result": {"patch_generated": False, "reason": "workspace_failed"},
            "trace": append_trace(state, "patch_generator", "skipped", {"reason": "workspace_failed"}),
        }
    if not issue.get("allow_patch", False):
        return {
            "patch_result": {"patch_generated": False, "reason": "patch_disabled"},
            "trace": append_trace(state, "patch_generator", "skipped", {"reason": "patch_disabled"}),
        }

    repo_path = Path(state["repo_path"])
    patch_result = run_patch_loop(repo_path, state, max_iterations=10)
    status = "patched" if patch_result.get("patch_generated") else "no_patch"
    return {
        "patch_result": patch_result,
        "patch_iterations": patch_result.get("iterations", []),
        "trace": append_trace(
            state,
            "patch_generator",
            status,
            {
                "iterations": len(patch_result.get("iterations", [])),
                "final_verification_returncode": (patch_result.get("verification") or {}).get("returncode"),
                "files_modified": patch_result.get("files_modified", []),
            },
        ),
    }


def debug_packager(state: DebugMinerState) -> DebugMinerState:
    output_dir = Path(state["output_dir"])
    report_path = output_dir / "debug_report.md"
    context_path = output_dir / "repo_context.json"
    runtime_path = output_dir / "runtime.json"
    patch_path = output_dir / "patch.diff"
    result_path = output_dir / "result.json"
    trace_path = output_dir / "trace.json"

    runtime = (state.get("reproduction") or {}).get("runtime") or {}
    patch_result = state.get("patch_result") or {"patch_generated": False}
    trace = {"run_id": state["run_id"], "events": append_trace(state, "debug_packager", "completed")}
    status = infer_result_status(state)
    report_text, report_usage, report_error = build_debug_report_artifact(state, status)
    if report_usage or report_error:
        patch_result = {**patch_result}
        if report_usage:
            patch_result["report_llm_usage"] = report_usage
            patch_result["llm_usage"] = aggregate_llm_usage(
                [usage for usage in [patch_result.get("llm_usage"), report_usage] if usage]
            )
        if report_error:
            patch_result["report_llm_error"] = report_error
    report_text = append_debug_usage_accounting(report_text, patch_result)
    artifacts = [
        {"type": "debug_report", "path": str(report_path)},
        {"type": "repo_context", "path": str(context_path)},
        {"type": "runtime", "path": str(runtime_path)},
        {"type": "trace", "path": str(trace_path)},
    ]
    if patch_result.get("patch_generated"):
        artifacts.append({"type": "patch", "path": str(patch_path)})
        artifacts.append({"type": "modified_repo", "path": state.get("repo_path")})

    result = {
        "task_id": state["task_spec"]["task_id"],
        "status": status,
        "summary": {
            "repo_url": (state.get("issue") or {}).get("repo_url"),
            "test_command": (state.get("issue") or {}).get("test_command"),
            "reproduced": (state.get("divergence") or {}).get("reproduced", False),
            "returncode": runtime.get("returncode"),
            "candidate_files": len((state.get("localization") or {}).get("candidate_files", [])),
            "patch_generated": patch_result.get("patch_generated", False),
            "verification_returncode": (patch_result.get("verification") or {}).get("returncode"),
            "patch_iterations": len(patch_result.get("iterations", [])),
            "cleanup_repo": (state.get("issue") or {}).get("cleanup_repo", True),
        },
        "debug": {
            "issue": state.get("issue", {}),
            "repo_context": state.get("repo_context", {}),
            "reproduction": state.get("reproduction", {}),
            "divergence": state.get("divergence", {}),
            "localization": state.get("localization", {}),
            "fix_plan": state.get("fix_plan", {}),
            "patch_result": patch_result,
            "patch_iterations": state.get("patch_iterations", []),
        },
        "artifacts": artifacts,
        "usage": build_debug_usage(state, patch_result, runtime),
        "trace": trace,
    }

    write_text(report_path, report_text)
    write_json(context_path, state.get("repo_context", {}))
    write_json(runtime_path, runtime)
    if patch_result.get("patch_generated"):
        write_text(patch_path, patch_result.get("diff", ""))
    write_json(trace_path, trace)
    write_json(result_path, result)
    cleanup_workspace(state)
    return {"result": result, "trace": trace["events"]}


def debug_payload(spec: dict[str, Any]) -> dict[str, Any]:
    payload = spec.get("debug") if isinstance(spec.get("debug"), dict) else {}
    return {
        "code_source": payload.get("code_source") or spec.get("code_source") or {},
        "bug_description": payload.get("bug_description") or spec.get("bug_description") or spec.get("goal"),
        "expected_behavior": payload.get("expected_behavior") or spec.get("expected_behavior"),
        "actual_behavior": payload.get("actual_behavior") or spec.get("actual_behavior"),
        "reproduction": payload.get("reproduction") or spec.get("reproduction") or {},
        "execution_policy": payload.get("execution_policy") or spec.get("execution_policy") or {},
    }


def build_debug_usage(state: DebugMinerState, patch_result: dict[str, Any], runtime: dict[str, Any]) -> dict[str, Any]:
    iterations = patch_result.get("iterations") or []
    verification_runs = sum(1 for iteration in iterations if iteration.get("verification_returncode") is not None)
    files_modified = patch_result.get("files_modified") or []
    llm_usage = patch_result.get("llm_usage")
    return {
        "miner": "debug_miner",
        "repo_cloned": bool(state.get("clone_result", {}).get("returncode") == 0),
        "commands_run": 1 + verification_runs if runtime else verification_runs,
        "initial_returncode": runtime.get("returncode"),
        "patch_iterations": len(iterations),
        "patch_generated": bool(patch_result.get("patch_generated", False)),
        "files_modified": len(files_modified),
        "verification_returncode": (patch_result.get("verification") or {}).get("returncode"),
        "cleanup_repo": (state.get("issue") or {}).get("cleanup_repo", True),
        "llm": llm_usage,
        "llm_total_tokens": (llm_usage or {}).get("total_tokens"),
    }


def clone_repository(repo_url: str, repo_path: Path, branch: str | None, timeout_seconds: int) -> dict[str, Any]:
    base_command = ["git", "clone", "--depth", "1"]
    if branch:
        command = [*base_command, "--branch", branch, repo_url, str(repo_path)]
        result = run_process(command, cwd=repo_path.parent, timeout_seconds=timeout_seconds)
        if result["returncode"] == 0:
            result["command"] = redact_command(command)
            return result
        if "Remote branch" not in result.get("combined_output", ""):
            result["command"] = redact_command(command)
            return result
        if repo_path.exists():
            shutil.rmtree(repo_path)
    command = [*base_command, repo_url, str(repo_path)]
    result = run_process(command, cwd=repo_path.parent, timeout_seconds=timeout_seconds)
    result["command"] = redact_command(command)
    return result


def run_command(command: str, cwd: Path, timeout_seconds: int) -> dict[str, Any]:
    return run_process(command, cwd=cwd, timeout_seconds=timeout_seconds, shell=True)


def run_process(command: list[str] | str, cwd: Path, timeout_seconds: int, shell: bool = False) -> dict[str, Any]:
    try:
        completed = subprocess.run(
            command,
            cwd=str(cwd),
            shell=shell,
            text=True,
            capture_output=True,
            timeout=timeout_seconds,
            env=debug_subprocess_env(),
        )
        stdout = truncate_output(completed.stdout)
        stderr = truncate_output(completed.stderr)
        return {
            "returncode": completed.returncode,
            "stdout": stdout,
            "stderr": stderr,
            "combined_output": truncate_output(f"{stdout}\n{stderr}".strip()),
            "timed_out": False,
        }
    except subprocess.TimeoutExpired as error:
        stdout = truncate_output(error.stdout or "")
        stderr = truncate_output(error.stderr or "")
        return {
            "returncode": 124,
            "stdout": stdout,
            "stderr": stderr,
            "combined_output": truncate_output(f"{stdout}\n{stderr}\nCommand timed out after {timeout_seconds}s".strip()),
            "timed_out": True,
        }
    except Exception as error:
        return {
            "returncode": 1,
            "stdout": "",
            "stderr": str(error),
            "combined_output": str(error),
            "timed_out": False,
        }


def inspect_repo(repo_path: Path) -> dict[str, Any]:
    project_files = []
    interesting_names = {
        "pyproject.toml",
        "package.json",
        "pnpm-lock.yaml",
        "yarn.lock",
        "requirements.txt",
        "pytest.ini",
        "go.mod",
        "Cargo.toml",
        "foundry.toml",
        "hardhat.config.js",
        "hardhat.config.ts",
    }
    files_scanned = 0
    extension_counts: dict[str, int] = {}
    top_level = []

    for child in sorted(repo_path.iterdir()) if repo_path.exists() else []:
        if child.name.startswith(".git"):
            continue
        top_level.append(child.name)

    for path in repo_path.rglob("*") if repo_path.exists() else []:
        if ".git" in path.parts or not path.is_file():
            continue
        files_scanned += 1
        suffix = path.suffix or "[no_ext]"
        extension_counts[suffix] = extension_counts.get(suffix, 0) + 1
        if path.name in interesting_names:
            project_files.append(str(path.relative_to(repo_path)))
        if files_scanned >= 2000:
            break

    return {
        "repo_path": str(repo_path),
        "top_level": top_level[:80],
        "project_files": project_files,
        "files_scanned": files_scanned,
        "extension_counts": dict(sorted(extension_counts.items(), key=lambda item: item[1], reverse=True)[:20]),
    }


def build_oracle(issue: dict[str, Any]) -> str:
    expected = issue.get("expected_behavior")
    actual = issue.get("actual_behavior")
    if expected and actual:
        return f"Expected: {expected}; Actual: {actual}"
    if expected:
        return f"Expected: {expected}"
    if actual:
        return f"Actual failure: {actual}"
    return "Use the reproduction command or supplied logs as the failure oracle."


def extract_failure_signals(output: str) -> list[str]:
    signals: list[str] = []
    patterns = [
        r"(?m)^E\s+.+",
        r"(?m)^FAILED\s+.+",
        r"(?m)^ERROR\s+.+",
        r"(?m).*(AssertionError|Traceback|Exception|Error):.*",
        r"(?m).*No module named .+",
        r"(?m).*ModuleNotFoundError:.*",
    ]
    for pattern in patterns:
        for match in re.finditer(pattern, output or ""):
            text = " ".join(match.group(0).split())
            if text and text not in signals:
                signals.append(text[:500])
            if len(signals) >= 20:
                return signals
    return signals


def extract_referenced_paths(output: str) -> list[str]:
    candidates: list[str] = []
    patterns = [
        r'File "([^"]+)", line \d+',
        r"([A-Za-z0-9_./\-]*workspace/repo/[A-Za-z0-9_./\-]+\.(?:py|js|ts|tsx|jsx|go|rs|sol|java|rb|php))(?::\d+)?",
        r"([A-Za-z0-9_./\-]+\.(?:py|js|ts|tsx|jsx|go|rs|sol|java|rb|php))(?::\d+)?",
    ]
    for pattern in patterns:
        for match in re.finditer(pattern, output or ""):
            value = match.group(1).strip()
            if value and value not in candidates and "site-packages" not in value:
                candidates.append(value)
            if len(candidates) >= 30:
                return candidates
    return candidates


def rank_candidate_files(repo_path: Path, referenced_paths: list[str], repo_context: dict[str, Any]) -> list[dict[str, Any]]:
    candidates: list[dict[str, Any]] = []
    seen: set[str] = set()
    for raw_path in referenced_paths:
        normalized = raw_path
        if repo_path.name in Path(raw_path).parts:
            parts = Path(raw_path).parts
            index = parts.index(repo_path.name)
            normalized = str(Path(*parts[index + 1 :]))
        path = repo_path / normalized
        if path.exists() and path.is_file() and normalized not in seen:
            seen.add(normalized)
            candidates.append({"path": normalized, "reason": "Referenced by runtime output.", "score": 0.9})

    for project_file in repo_context.get("project_files", []):
        if project_file not in seen:
            seen.add(project_file)
            candidates.append({"path": project_file, "reason": "Project configuration may affect reproduction.", "score": 0.35})
        if len(candidates) >= 12:
            break
    return candidates[:12]


def run_patch_loop(repo_path: Path, state: DebugMinerState, max_iterations: int) -> dict[str, Any]:
    issue = state.get("issue") or {}
    current_output = ((state.get("reproduction") or {}).get("runtime") or {}).get("combined_output") or ""
    verification_timeout_seconds = min(int(issue.get("timeout_seconds") or 600), 120)
    iterations: list[dict[str, Any]] = []
    files_modified: list[str] = []
    diffs: list[str] = []
    llm_usages: list[dict[str, Any]] = []
    final_verification: dict[str, Any] | None = None

    for index in range(1, max_iterations + 1):
        if issue.get("use_llm"):
            llm_patch = apply_llm_patch(repo_path, state, current_output, index)
            patch = llm_patch
            if llm_patch.get("llm_usage"):
                llm_usages.append(llm_patch["llm_usage"])
            if not patch.get("patch_generated"):
                heuristic_patch = apply_patch_heuristics(repo_path, current_output)
                if heuristic_patch.get("patch_generated"):
                    patch = {
                        **heuristic_patch,
                        "strategy": f"{heuristic_patch.get('strategy')}_after_llm",
                        "llm_usage": llm_patch.get("llm_usage"),
                        "llm_error": llm_patch.get("llm_error"),
                        "llm_plan": llm_patch.get("llm_plan"),
                        "llm_reason": llm_patch.get("reason"),
                    }
                else:
                    patch = {
                        **patch,
                        "missing_modules": heuristic_patch.get("missing_modules", patch.get("missing_modules", [])),
                    }
        else:
            patch = apply_patch_heuristics(repo_path, current_output)
        iteration = {
            "iteration": index,
            "strategy": patch.get("strategy"),
            "patch_generated": patch.get("patch_generated", False),
            "reason": patch.get("reason"),
            "files_modified": patch.get("files_modified", []),
            "missing_modules": patch.get("missing_modules", []),
            "llm_usage": patch.get("llm_usage"),
            "llm_error": patch.get("llm_error"),
            "llm_plan": patch.get("llm_plan"),
        }
        if not patch.get("patch_generated"):
            iterations.append(iteration)
            break

        files_modified.extend(path for path in patch.get("files_modified", []) if path not in files_modified)
        if patch.get("diff"):
            diffs.append(patch["diff"])

        if issue.get("test_command"):
            start = time.time()
            verification = run_command(issue["test_command"], repo_path, verification_timeout_seconds)
            verification["elapsed_seconds"] = round(time.time() - start, 3)
            verification["timeout_seconds"] = verification_timeout_seconds
        else:
            verification = {"returncode": None, "combined_output": "", "stdout": "", "stderr": "", "timed_out": False}
        final_verification = verification
        iteration["verification_returncode"] = verification.get("returncode")
        iteration["verification_signals"] = extract_failure_signals(verification.get("combined_output") or "")[:12]
        iterations.append(iteration)

        if verification.get("returncode") == 0:
            break
        current_output = verification.get("combined_output") or ""

    return {
        "patch_generated": bool(files_modified),
        "strategy": "multi_round_heuristic",
        "iterations": iterations,
        "files_modified": files_modified,
        "diff": "\n".join(diffs),
        "verification": final_verification,
        "llm_usage": aggregate_llm_usage(llm_usages),
    }


def apply_patch_heuristics(repo_path: Path, output: str) -> dict[str, Any]:
    missing_modules = extract_missing_modules(output)
    for module_name in missing_modules:
        module_paths = find_python_module_roots(repo_path, module_name)
        if module_paths:
            return create_pytest_path_patch(repo_path, module_name, module_paths)
        if is_safe_stub_module(module_name):
            return create_stub_module_patch(repo_path, module_name)
    return {
        "patch_generated": False,
        "strategy": "no_matching_heuristic",
        "reason": "No safe patch heuristic matched the observed failure.",
        "missing_modules": missing_modules,
        "files_modified": [],
    }


def apply_llm_patch(repo_path: Path, state: DebugMinerState, output: str, iteration: int) -> dict[str, Any]:
    plan_result = None
    try:
        plan_result = call_zai_chat_with_usage(build_llm_patch_messages(repo_path, state, output, iteration))
        plan = parse_llm_patch_plan(plan_result.content)
        patch = apply_llm_patch_plan(repo_path, plan)
        return {
            **patch,
            "strategy": f"llm_{patch.get('strategy', 'patch_plan')}",
            "reason": patch.get("reason") or plan.get("reason") or "Applied Z.ai patch plan.",
            "llm_usage": plan_result.usage,
            "llm_plan": sanitize_llm_plan_for_result(plan),
        }
    except Exception as error:
        return {
            "patch_generated": False,
            "strategy": "llm_patch_plan",
            "reason": "Z.ai patch plan failed.",
            "llm_error": str(error)[:500],
            "llm_usage": plan_result.usage if plan_result else None,
            "files_modified": [],
        }


def build_llm_patch_messages(repo_path: Path, state: DebugMinerState, output: str, iteration: int) -> list[dict[str, str]]:
    issue = state.get("issue") or {}
    localization = state.get("localization") or {}
    repo_context = state.get("repo_context") or {}
    file_snippets = collect_candidate_file_snippets(repo_path, localization.get("candidate_files", []))
    schema = {
        "action": "create_file | replace_file | append_file | none",
        "path": "relative/path/in/repo.py",
        "content": "complete file content or appended content",
        "reason": "why this patch is safe",
    }
    return [
        {
            "role": "system",
            "content": (
                "You are Aurora Debug Miner patch planner. Return only valid JSON. "
                "Create conservative patches for a cloned public repository. "
                "Do not suggest shell commands, dependency installation, network access, secrets, or changes outside the repo. "
                "Prefer small Python/text patches. If unsafe, return action='none'."
            ),
        },
        {
            "role": "user",
            "content": json.dumps(
                {
                    "iteration": iteration,
                    "schema": schema,
                    "bug_description": issue.get("bug_description"),
                    "expected_behavior": issue.get("expected_behavior"),
                    "actual_behavior": issue.get("actual_behavior"),
                    "test_command": issue.get("test_command"),
                    "repo_context": {
                        "top_level": repo_context.get("top_level", [])[:40],
                        "project_files": repo_context.get("project_files", [])[:40],
                        "extension_counts": repo_context.get("extension_counts", {}),
                    },
                    "candidate_files": localization.get("candidate_files", [])[:12],
                    "candidate_file_snippets": file_snippets,
                    "current_failure_output": truncate_output(output, 8000),
                },
                ensure_ascii=False,
            ),
        },
    ]


def parse_llm_patch_plan(content: str) -> dict[str, Any]:
    cleaned = content.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?", "", cleaned).strip()
        cleaned = re.sub(r"```$", "", cleaned).strip()
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("LLM patch plan did not contain a JSON object.")
    plan = json.loads(cleaned[start : end + 1])
    if not isinstance(plan, dict):
        raise ValueError("LLM patch plan must be a JSON object.")
    return plan


def apply_llm_patch_plan(repo_path: Path, plan: dict[str, Any]) -> dict[str, Any]:
    action = str(plan.get("action") or "none").strip().lower()
    if action == "none":
        return {
            "patch_generated": False,
            "strategy": "patch_plan_none",
            "reason": plan.get("reason") or "LLM declined to patch.",
            "files_modified": [],
        }
    if action not in {"create_file", "replace_file", "append_file"}:
        raise ValueError(f"Unsupported LLM patch action: {action}")
    relative_path = validate_llm_patch_path(plan.get("path"))
    content = str(plan.get("content") or "")
    if not content.strip():
        raise ValueError("LLM patch content is empty.")
    path = repo_path / relative_path
    path.parent.mkdir(parents=True, exist_ok=True)
    old = path.read_text(encoding="utf-8") if path.exists() else ""
    if action == "append_file":
        new = old + ("\n" if old and not old.endswith("\n") else "") + content
    else:
        new = content
    path.write_text(new, encoding="utf-8")
    return {
        "patch_generated": old != new,
        "strategy": action,
        "reason": plan.get("reason") or "Applied LLM patch plan.",
        "files_modified": [str(relative_path)],
        "diff": build_created_or_modified_file_diff(repo_path, path, old, new),
    }


def validate_llm_patch_path(value: Any) -> Path:
    if not value:
        raise ValueError("LLM patch path is required.")
    path = Path(str(value))
    if path.is_absolute() or ".." in path.parts or ".git" in path.parts:
        raise ValueError(f"Unsafe LLM patch path: {value}")
    if path.suffix not in {".py", ".toml", ".ini", ".cfg", ".txt", ".md", ".json", ".yaml", ".yml"}:
        raise ValueError(f"Unsupported LLM patch file type: {value}")
    return path


def collect_candidate_file_snippets(repo_path: Path, candidates: list[dict[str, Any]]) -> list[dict[str, str]]:
    snippets: list[dict[str, str]] = []
    for candidate in candidates[:5]:
        relative = candidate.get("path")
        if not relative:
            continue
        path = repo_path / relative
        if not path.exists() or not path.is_file() or path.stat().st_size > 20000:
            continue
        try:
            snippets.append({"path": str(relative), "content": truncate_output(path.read_text(encoding="utf-8"), 4000)})
        except UnicodeDecodeError:
            continue
    return snippets


def sanitize_llm_plan_for_result(plan: dict[str, Any]) -> dict[str, Any]:
    return {
        "action": plan.get("action"),
        "path": plan.get("path"),
        "reason": plan.get("reason"),
        "content_chars": len(str(plan.get("content") or "")),
    }


def aggregate_llm_usage(usages: list[dict[str, Any]]) -> dict[str, Any] | None:
    if not usages:
        return None
    total_prompt = sum(int(usage.get("prompt_tokens") or 0) for usage in usages)
    total_completion = sum(int(usage.get("completion_tokens") or 0) for usage in usages)
    total = sum(int(usage.get("total_tokens") or 0) for usage in usages)
    return {
        "provider": usages[-1].get("provider"),
        "model": usages[-1].get("model"),
        "base_url": usages[-1].get("base_url"),
        "calls": sum(int(usage.get("calls") or 1) for usage in usages),
        "prompt_tokens": total_prompt,
        "completion_tokens": total_completion,
        "total_tokens": total or total_prompt + total_completion,
    }


def extract_missing_modules(output: str) -> list[str]:
    modules: list[str] = []
    patterns = [
        r"No module named ['\"]([^'\"]+)['\"]",
        r"ModuleNotFoundError:\s+No module named ['\"]([^'\"]+)['\"]",
    ]
    for pattern in patterns:
        for match in re.finditer(pattern, output or ""):
            module_name = match.group(1).split(".")[0]
            if module_name and module_name not in modules:
                modules.append(module_name)
    return modules


def find_python_module_roots(repo_path: Path, module_name: str) -> list[Path]:
    roots: list[Path] = []
    seen: set[Path] = set()
    for path in repo_path.rglob(module_name):
        if ".git" in path.parts:
            continue
        if path.is_dir() and (path / "__init__.py").exists():
            root = path.parent
        elif path.is_file() and path.name == f"{module_name}.py":
            root = path.parent
        else:
            continue
        if root not in seen:
            seen.add(root)
            roots.append(root)
        if len(roots) >= 20:
            break
    return roots


def create_pytest_path_patch(repo_path: Path, module_name: str, module_roots: list[Path]) -> dict[str, Any]:
    conftest_path = repo_path / "conftest.py"
    relative_roots = [str(path.relative_to(repo_path)) for path in module_roots]
    content = build_conftest_content(module_name, relative_roots)
    existing = conftest_path.read_text(encoding="utf-8") if conftest_path.exists() else ""
    if "AURORA DEBUG MINER PYTHONPATH PATCH" in existing:
        return {
            "patch_generated": False,
            "strategy": "pytest_pythonpath_conftest",
            "reason": "Patch marker already exists.",
            "missing_modules": [module_name],
            "files_modified": [],
        }
    conftest_path.write_text(existing + ("\n" if existing and not existing.endswith("\n") else "") + content, encoding="utf-8")
    diff = build_created_or_modified_file_diff(repo_path, conftest_path, existing, conftest_path.read_text(encoding="utf-8"))
    return {
        "patch_generated": True,
        "strategy": "pytest_pythonpath_conftest",
        "reason": f"Added pytest path bootstrap for missing module '{module_name}'.",
        "missing_modules": [module_name],
        "missing_module": module_name,
        "module_roots": relative_roots,
        "files_modified": [str(conftest_path.relative_to(repo_path))],
        "diff": diff,
    }


def is_safe_stub_module(module_name: str) -> bool:
    return module_name in {"six"}


def create_stub_module_patch(repo_path: Path, module_name: str) -> dict[str, Any]:
    if module_name == "six":
        module_path = repo_path / "six.py"
        existing = module_path.read_text(encoding="utf-8") if module_path.exists() else ""
        if existing:
            return {
                "patch_generated": False,
                "strategy": "stub_module",
                "reason": "six.py already exists.",
                "missing_modules": [module_name],
                "files_modified": [],
            }
        content = '''"""AURORA DEBUG MINER STUB MODULE.

Minimal local compatibility shim for the subset of six used by this example
project. This avoids mutating the global Python environment during debugging.
"""

string_types = (str,)
'''
        module_path.write_text(content, encoding="utf-8")
        return {
            "patch_generated": True,
            "strategy": "stub_module",
            "reason": "Added a minimal local six.py compatibility shim.",
            "missing_modules": [module_name],
            "files_modified": [str(module_path.relative_to(repo_path))],
            "diff": build_created_or_modified_file_diff(repo_path, module_path, existing, content),
        }
    return {
        "patch_generated": False,
        "strategy": "stub_module",
        "reason": f"No safe stub available for {module_name}.",
        "missing_modules": [module_name],
        "files_modified": [],
    }


def build_conftest_content(module_name: str, relative_roots: list[str]) -> str:
    roots_literal = ",\n    ".join(repr(root) for root in relative_roots)
    return f'''# AURORA DEBUG MINER PYTHONPATH PATCH
# Auto-generated to make pytest resolve the missing "{module_name}" module
# from this repository's example source trees.
from __future__ import annotations

import sys
from pathlib import Path

_AURORA_REPO_ROOT = Path(__file__).resolve().parent
_AURORA_SOURCE_ROOTS = [
    {roots_literal}
]

for _relative_root in _AURORA_SOURCE_ROOTS:
    _source_root = str(_AURORA_REPO_ROOT / _relative_root)
    if _source_root not in sys.path:
        sys.path.insert(0, _source_root)
'''


def build_created_or_modified_file_diff(repo_path: Path, path: Path, old: str, new: str) -> str:
    relative = path.relative_to(repo_path)
    old_lines = old.splitlines()
    new_lines = new.splitlines()
    if not old:
        body = "\n".join(f"+{line}" for line in new_lines)
        return f"diff --git a/{relative} b/{relative}\nnew file mode 100644\n--- /dev/null\n+++ b/{relative}\n@@ -0,0 +1,{len(new_lines)} @@\n{body}\n"
    removed = "\n".join(f"-{line}" for line in old_lines)
    added = "\n".join(f"+{line}" for line in new_lines)
    return f"diff --git a/{relative} b/{relative}\n--- a/{relative}\n+++ b/{relative}\n@@ -1,{len(old_lines)} +1,{len(new_lines)} @@\n{removed}\n{added}\n"


def infer_confidence(candidates: list[dict[str, Any]], divergence: dict[str, Any]) -> str:
    if not divergence.get("reproduced"):
        return "low"
    if any(candidate.get("score", 0) >= 0.8 for candidate in candidates):
        return "medium"
    return "low"


def build_localization_notes(candidates: list[dict[str, Any]], divergence: dict[str, Any]) -> list[str]:
    notes = []
    if not divergence.get("reproduced"):
        notes.append("The reproduction command did not fail, so localization remains tentative.")
    if not candidates:
        notes.append("No repository-local file paths were found in the runtime output.")
    else:
        notes.append("Candidate files are ranked from runtime references first, then project configuration files.")
    return notes


def infer_result_status(state: DebugMinerState) -> str:
    if state.get("status") == "failed":
        return "failed"
    runtime = (state.get("reproduction") or {}).get("runtime") or {}
    if runtime.get("returncode") == 0:
        return "no_repro"
    if runtime.get("timed_out"):
        return "reproduced_timeout"
    if (state.get("divergence") or {}).get("reproduced"):
        return "diagnosed"
    return "analyzed"


def build_debug_report(state: DebugMinerState, status: str) -> str:
    issue = state.get("issue") or {}
    runtime = (state.get("reproduction") or {}).get("runtime") or {}
    divergence = state.get("divergence") or {}
    localization = state.get("localization") or {}
    fix_plan = state.get("fix_plan") or {}
    patch_result = state.get("patch_result") or {}
    llm_usage = patch_result.get("llm_usage") or {}
    verification = patch_result.get("verification") or {}
    signals = "\n".join(f"- {signal}" for signal in divergence.get("failure_signals", [])) or "- None"
    candidates = "\n".join(
        f"- {candidate.get('path')} (score={candidate.get('score')}, {candidate.get('reason')})"
        for candidate in localization.get("candidate_files", [])
    ) or "- None"
    steps = "\n".join(f"- {step}" for step in fix_plan.get("recommended_steps", [])) or "- None"
    files_modified = "\n".join(f"- {path}" for path in patch_result.get("files_modified", [])) or "- None"
    return f"""# Debug Miner Report

## Summary

- Task ID: {(state.get('task_spec') or {}).get('task_id')}
- Status: {status}
- Repository: {issue.get('repo_url')}
- Test command: {issue.get('test_command')}
- Return code: {runtime.get('returncode')}
- Reproduced: {divergence.get('reproduced', False)}
- Patch generated: {patch_result.get('patch_generated', False)}
- Patch iterations: {len(patch_result.get('iterations', []))}
- Verification return code: {verification.get('returncode')}
- Debug LLM calls: {llm_usage.get('calls', 0)}
- Debug LLM total tokens: {llm_usage.get('total_tokens', 0)}

## Expected vs Actual

- Expected: {issue.get('expected_behavior') or 'Not provided'}
- Actual: {issue.get('actual_behavior') or 'Not provided'}

## Failure Signals

{signals}

## Candidate Files

{candidates}

## Modified Files

{files_modified}

## Recommended Next Steps

{steps}
"""


def build_debug_report_artifact(state: DebugMinerState, status: str) -> tuple[str, dict[str, Any] | None, str | None]:
    issue = state.get("issue") or {}
    fallback = build_debug_report(state, status)
    if not issue.get("use_llm"):
        return fallback, None, None
    try:
        result = call_zai_chat_with_usage(build_llm_report_messages(state, status))
        content = result.content.strip()
        if not content:
            return fallback, result.usage, "Z.ai returned an empty debug report."
        return content, result.usage, None
    except Exception as error:
        return fallback + f"\n## Report Generation Error\n\n- Z.ai report generation failed: {str(error)[:300]}\n", None, str(error)[:500]


def append_debug_usage_accounting(report: str, patch_result: dict[str, Any]) -> str:
    llm_usage = patch_result.get("llm_usage") or {}
    report_usage = patch_result.get("report_llm_usage") or {}
    if not llm_usage:
        return report
    return (
        report.rstrip()
        + "\n\n## Usage Accounting\n\n"
        + f"- Debug Miner Z.ai calls: {llm_usage.get('calls', 0)}\n"
        + f"- Debug Miner Z.ai total tokens: {llm_usage.get('total_tokens', 0)}\n"
        + f"- Report generation tokens: {report_usage.get('total_tokens', 0)}\n"
    )


def build_llm_report_messages(state: DebugMinerState, status: str) -> list[dict[str, str]]:
    issue = state.get("issue") or {}
    runtime = (state.get("reproduction") or {}).get("runtime") or {}
    divergence = state.get("divergence") or {}
    localization = state.get("localization") or {}
    patch_result = state.get("patch_result") or {}
    payload = {
        "status": status,
        "issue": {
            "repo_url": issue.get("repo_url"),
            "bug_description": issue.get("bug_description"),
            "expected_behavior": issue.get("expected_behavior"),
            "actual_behavior": issue.get("actual_behavior"),
            "test_command": issue.get("test_command"),
        },
        "runtime": {
            "returncode": runtime.get("returncode"),
            "timed_out": runtime.get("timed_out"),
            "output_tail": truncate_output(runtime.get("combined_output"), 6000),
        },
        "divergence": {
            "reproduced": divergence.get("reproduced"),
            "failure_signals": divergence.get("failure_signals", [])[:20],
        },
        "localization": {
            "confidence": localization.get("confidence"),
            "candidate_files": localization.get("candidate_files", [])[:12],
            "notes": localization.get("notes", []),
        },
        "patch_result": {
            "patch_generated": patch_result.get("patch_generated", False),
            "files_modified": patch_result.get("files_modified", []),
            "verification_returncode": (patch_result.get("verification") or {}).get("returncode"),
            "iterations": patch_result.get("iterations", []),
        },
    }
    return [
        {
            "role": "system",
            "content": (
                "You are Aurora Debug Miner report writer. Write a concise Markdown report in Chinese. "
                "Do not invent files, commands, fixes, or test results. Use only the provided JSON. "
                "Include sections: Summary, Root Cause Hypothesis, Patch Attempts, Verification, Next Steps, Token Notes."
            ),
        },
        {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
    ]


def truncate_output(value: Any, limit: int = 20000) -> str:
    text = value.decode("utf-8", errors="replace") if isinstance(value, bytes) else str(value or "")
    if len(text) <= limit:
        return text
    marker = "\n... [aurora output truncated: preserved head and tail] ...\n"
    if limit <= len(marker) + 20:
        return text[-limit:]
    head_size = max(1, (limit - len(marker)) // 2)
    tail_size = max(1, limit - len(marker) - head_size)
    return text[:head_size] + marker + text[-tail_size:]


def redact_command(command: list[str]) -> list[str]:
    return [part if "://" not in part else re.sub(r"//[^/@]+@", "//***@", part) for part in command]


def debug_subprocess_env() -> dict[str, str]:
    env = dict(os.environ)
    python_bin = str(Path(sys.executable).resolve().parent)
    env["PATH"] = python_bin + os.pathsep + env.get("PATH", "")
    env.setdefault("PYTHONUTF8", "1")
    return env


def cleanup_workspace(state: DebugMinerState) -> None:
    issue = state.get("issue") or {}
    if not issue.get("cleanup_repo", True):
        return
    workspace = Path(state["output_dir"]) / "workspace"
    if workspace.exists():
        shutil.rmtree(workspace)
