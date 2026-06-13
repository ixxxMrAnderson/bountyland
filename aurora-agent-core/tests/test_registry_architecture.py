from __future__ import annotations

from aurora_agent_core.agents.task_intake_graph import TaskIntakeGraph
from aurora_agent_core.core.router import route_task
from aurora_agent_core.registry import check_required_fields, get_registry_entry, load_miner_registry
from aurora_agent_core.runner import load_miner
from aurora_agent_core.schemas.task_spec import get_missing_fields, normalize_task_spec


def test_registry_loads_dataset_and_debug_miners() -> None:
    registry = load_miner_registry()
    assert registry["dataset_generation"]["miner_id"] == "dataset_miner"
    assert registry["code_debug"]["execution"]["entrypoint"].endswith(":DebugMinerGraph")


def test_dataset_missing_fields_use_registry_defaults() -> None:
    missing = get_missing_fields(
        {
            "task_type": "dataset_generation",
            "goal": "构建公开漏洞数据集",
        }
    )
    assert missing == ["dataset.target_size"]


def test_web3_is_not_parsed_as_dataset_target_size() -> None:
    result = TaskIntakeGraph().run({"user_input": "帮我构建 Web3 漏洞数据集，输出 jsonl，来源 osv"})
    assert result["status"] == "needs_confirmation"
    assert result["missing_fields"] == ["dataset.target_size"]


def test_debug_contract_requires_repo_and_reproduction_evidence() -> None:
    entry = get_registry_entry("code_debug")
    missing = check_required_fields(
        {
            "task_type": "code_debug",
            "goal": "定位问题",
            "debug": {
                "code_source": {"type": "git"},
                "bug_description": "列表不刷新",
                "reproduction": {},
            },
        },
        entry,
    )
    assert "debug.code_source.repo_url" in missing
    assert "reproduction_evidence" in missing


def test_normalized_dataset_tasks_keep_compat_fields_and_typed_payload() -> None:
    task_spec = normalize_task_spec(
        {
            "task_type": "dataset_generation",
            "goal": "构建 5 条公开数据集",
            "target_size": 5,
        }
    )
    assert task_spec["metadata"]["schema_version"] == "0.2.0"
    assert task_spec["dataset"]["target_size"] == 5
    assert task_spec["dataset"]["output_format"] == "jsonl"
    assert task_spec["output_format"] == "jsonl"
    assert task_spec["assigned_agent"] == "dataset_miner"


def test_router_and_runner_use_registry_entrypoint() -> None:
    route = route_task({"task_type": "code_debug"})
    assert route["assigned_agent"] == "debug_miner"
    miner = load_miner(route["entrypoint"])
    assert miner.__class__.__name__ == "DebugMinerGraph"


def test_debug_b_plan_intake_builds_git_payload() -> None:
    result = TaskIntakeGraph().run(
        {
            "user_input": (
                "帮我 debug 这个仓库 https://github.com/example/project，"
                "创建任务后列表不刷新，测试命令 npm test"
            )
        }
    )
    assert result["status"] == "awaiting_price_confirmation"
    assert result["missing_fields"] == []
    debug = result["draft_task"]["debug"]
    assert debug["code_source"]["type"] == "git"
    assert debug["code_source"]["repo_url"] == "https://github.com/example/project"
    assert debug["reproduction"]["test_command"] == "npm test"
    assert result["suggested_price"] == 0.016
    assert result["pricing"]["components"][0]["name"] == "base"


def test_debug_dynamic_pricing_uses_patch_test_and_repo_size(monkeypatch) -> None:
    monkeypatch.setattr(
        "aurora_agent_core.pricing.fetch_github_repo_size",
        lambda repo_url: {"status": "ok", "size_kb": 300_000, "repo_url": repo_url},
    )
    result = TaskIntakeGraph().run(
        {
            "user_input": (
                "帮我修复这个公开 GitHub 仓库 https://github.com/sympy/sympy\n"
                "测试命令: python -m pytest\n"
                "期望：测试通过\n"
                "实际：失败\n"
                "保留仓库"
            )
        }
    )

    assert result["suggested_price"] == 0.044
    assert result["pricing"]["cap"] == 0.05
    assert result["pricing"]["repo_size"]["size_kb"] == 300_000


def test_debug_parser_splits_command_expected_and_actual_fields() -> None:
    result = TaskIntakeGraph().run(
        {
            "user_input": (
                "帮我 debug 这个公开 GitHub 仓库 https://github.com/psf/requests，"
                "测试命令 python -m pytest tests，期望：测试全部通过，实际：测试失败"
            )
        }
    )
    debug = result["draft_task"]["debug"]
    assert debug["reproduction"]["test_command"] == "python -m pytest tests"
    assert debug["expected_behavior"] == "测试全部通过"
    assert debug["actual_behavior"] == "测试失败"


def test_debug_parser_keeps_shell_semicolon_inside_command() -> None:
    result = TaskIntakeGraph().run(
        {
            "user_input": (
                "帮我修复这个公开 GitHub 仓库 https://github.com/sympy/sympy\n"
                "测试命令: bash -lc \"python -m pytest && python -S -c 'import six; print(six.string_types)'\"\n"
                "期望：测试全部通过\n"
                "实际：No module named six"
            )
        }
    )
    command = result["draft_task"]["debug"]["reproduction"]["test_command"]

    assert "import six; print(six.string_types)" in command
    assert command.endswith('"')


def test_debug_intake_enables_patch_mode_when_user_asks_for_fixed_code() -> None:
    result = TaskIntakeGraph().run(
        {
            "user_input": (
                "帮我修复这个公开 GitHub 仓库 https://github.com/example/project，"
                "测试命令 python -m pytest，保留仓库，我要看修改后的代码"
            )
        }
    )
    policy = result["draft_task"]["debug"]["execution_policy"]
    assert policy["allow_patch"] is True
    assert policy["cleanup_repo"] is False
