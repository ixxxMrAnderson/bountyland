from __future__ import annotations

from pathlib import Path

from aurora_agent_core.agents.task_intake_graph import TaskIntakeGraph
from aurora_agent_core.llm.zai_client import ZaiChatResult
from aurora_agent_core.miners.debug_miner_graph import DebugMinerGraph, extract_referenced_paths


def test_rejects_unsupported_task() -> None:
    result = TaskIntakeGraph().run({"user_input": "帮我查询一下今天的天气"})
    assert result["status"] == "rejected"
    assert result["ready"] is False


def test_debug_miner_diagnoses_reproduction_failure(monkeypatch, tmp_path) -> None:
    def fake_clone(repo_url, repo_path, branch, timeout_seconds):
        Path(repo_path).mkdir(parents=True)
        (Path(repo_path) / "pyproject.toml").write_text("[project]\nname='demo'\n", encoding="utf-8")
        (Path(repo_path) / "demo.py").write_text("def broken():\n    return False\n", encoding="utf-8")
        return {"returncode": 0, "stdout": "", "stderr": "", "combined_output": "", "timed_out": False}

    def fake_run(command, cwd, timeout_seconds):
        return {
            "returncode": 1,
            "stdout": "",
            "stderr": 'FAILED tests/test_demo.py::test_demo\nFile "demo.py", line 1\nAssertionError: boom',
            "combined_output": 'FAILED tests/test_demo.py::test_demo\nFile "demo.py", line 1\nAssertionError: boom',
            "timed_out": False,
        }

    monkeypatch.setattr("aurora_agent_core.miners.debug_miner_graph.clone_repository", fake_clone)
    monkeypatch.setattr("aurora_agent_core.miners.debug_miner_graph.run_command", fake_run)

    result = DebugMinerGraph().run(
        {
            "task_id": "task_debug_001",
            "task_type": "code_debug",
            "goal": "定位测试失败",
            "debug": {
                "code_source": {"type": "git", "repo_url": "https://github.com/example/project", "branch": "main"},
                "bug_description": "测试失败",
                "expected_behavior": "测试通过",
                "actual_behavior": "测试失败",
                "reproduction": {"test_command": "python -m pytest"},
                "execution_policy": {"timeout_seconds": 30, "allow_patch": False},
            },
        },
        output_dir=tmp_path / "debug",
    )

    assert result["status"] == "diagnosed"
    assert result["summary"]["reproduced"] is True
    assert result["summary"]["candidate_files"] >= 1
    assert result["usage"]["miner"] == "debug_miner"
    assert result["usage"]["commands_run"] == 1
    assert (tmp_path / "debug" / "debug_report.md").exists()
    assert (tmp_path / "debug" / "runtime.json").exists()


def test_debug_miner_resolves_relative_output_dir(monkeypatch, tmp_path) -> None:
    seen = {}

    def fake_clone(repo_url, repo_path, branch, timeout_seconds):
        seen["repo_path_is_absolute"] = Path(repo_path).is_absolute()
        Path(repo_path).mkdir(parents=True)
        return {"returncode": 0, "stdout": "", "stderr": "", "combined_output": "", "timed_out": False}

    def fake_run(command, cwd, timeout_seconds):
        return {
            "returncode": 0,
            "stdout": "ok",
            "stderr": "",
            "combined_output": "ok",
            "timed_out": False,
        }

    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr("aurora_agent_core.miners.debug_miner_graph.clone_repository", fake_clone)
    monkeypatch.setattr("aurora_agent_core.miners.debug_miner_graph.run_command", fake_run)

    result = DebugMinerGraph().run(
        {
            "task_id": "task_debug_relative",
            "task_type": "code_debug",
            "debug": {
                "code_source": {"type": "git", "repo_url": "https://github.com/example/project"},
                "bug_description": "测试相对路径",
                "reproduction": {"test_command": "echo ok"},
            },
        },
        output_dir="relative_debug_output",
    )

    assert seen["repo_path_is_absolute"] is True
    assert result["status"] == "no_repro"
    assert (tmp_path / "relative_debug_output" / "debug_report.md").exists()


def test_debug_miner_extracts_pytest_error_paths() -> None:
    output = """
    ERROR collecting artifacts/debug_wrong/workspace/repo/ch2/tasks_proj/tests/func/test_add.py
    ImportError while importing test module '/tmp/workspace/repo/ch2/tasks_proj/tests/func/test_add.py'.
    ch2/tasks_proj/tests/func/test_add.py:4: in <module>
        import tasks
    E   ModuleNotFoundError: No module named 'tasks'
    """
    refs = extract_referenced_paths(output)
    assert "artifacts/debug_wrong/workspace/repo/ch2/tasks_proj/tests/func/test_add.py" in refs
    assert "ch2/tasks_proj/tests/func/test_add.py" in refs


def test_debug_miner_generates_patch_and_keeps_modified_repo(monkeypatch, tmp_path) -> None:
    def fake_clone(repo_url, repo_path, branch, timeout_seconds):
        repo = Path(repo_path)
        (repo / "src" / "tasks").mkdir(parents=True)
        (repo / "src" / "tasks" / "__init__.py").write_text("", encoding="utf-8")
        return {"returncode": 0, "stdout": "", "stderr": "", "combined_output": "", "timed_out": False}

    def fake_run(command, cwd, timeout_seconds):
        conftest = Path(cwd) / "conftest.py"
        if conftest.exists():
            return {"returncode": 0, "stdout": "1 passed", "stderr": "", "combined_output": "1 passed", "timed_out": False}
        return {
            "returncode": 2,
            "stdout": "",
            "stderr": "E   ModuleNotFoundError: No module named 'tasks'",
            "combined_output": "E   ModuleNotFoundError: No module named 'tasks'",
            "timed_out": False,
        }

    monkeypatch.setattr("aurora_agent_core.miners.debug_miner_graph.clone_repository", fake_clone)
    monkeypatch.setattr("aurora_agent_core.miners.debug_miner_graph.run_command", fake_run)

    result = DebugMinerGraph().run(
        {
            "task_id": "task_debug_patch",
            "task_type": "code_debug",
            "debug": {
                "code_source": {"type": "git", "repo_url": "https://github.com/example/project"},
                "bug_description": "修复缺失模块",
                "reproduction": {"test_command": "python -m pytest"},
                "execution_policy": {"allow_patch": True, "cleanup_repo": False},
            },
        },
        output_dir=tmp_path / "debug_patch",
    )

    artifact_types = {artifact["type"] for artifact in result["artifacts"]}
    assert result["summary"]["patch_generated"] is True
    assert result["summary"]["verification_returncode"] == 0
    assert "patch" in artifact_types
    assert "modified_repo" in artifact_types
    assert (tmp_path / "debug_patch" / "workspace" / "repo" / "conftest.py").exists()
    assert (tmp_path / "debug_patch" / "patch.diff").exists()


def test_debug_miner_patch_loop_handles_second_missing_module(monkeypatch, tmp_path) -> None:
    def fake_clone(repo_url, repo_path, branch, timeout_seconds):
        repo = Path(repo_path)
        (repo / "src" / "tasks").mkdir(parents=True)
        (repo / "src" / "tasks" / "__init__.py").write_text("", encoding="utf-8")
        return {"returncode": 0, "stdout": "", "stderr": "", "combined_output": "", "timed_out": False}

    def fake_run(command, cwd, timeout_seconds):
        repo = Path(cwd)
        if not (repo / "conftest.py").exists():
            output = "E   ModuleNotFoundError: No module named 'tasks'"
            return {"returncode": 2, "stdout": "", "stderr": output, "combined_output": output, "timed_out": False}
        if not (repo / "six.py").exists():
            output = "E   ModuleNotFoundError: No module named 'six'"
            return {"returncode": 2, "stdout": "", "stderr": output, "combined_output": output, "timed_out": False}
        return {"returncode": 0, "stdout": "1 passed", "stderr": "", "combined_output": "1 passed", "timed_out": False}

    monkeypatch.setattr("aurora_agent_core.miners.debug_miner_graph.clone_repository", fake_clone)
    monkeypatch.setattr("aurora_agent_core.miners.debug_miner_graph.run_command", fake_run)

    result = DebugMinerGraph().run(
        {
            "task_id": "task_debug_patch_loop",
            "task_type": "code_debug",
            "debug": {
                "code_source": {"type": "git", "repo_url": "https://github.com/example/project"},
                "bug_description": "修复多层缺失模块",
                "reproduction": {"test_command": "python -m pytest"},
                "execution_policy": {"allow_patch": True, "cleanup_repo": False},
            },
        },
        output_dir=tmp_path / "debug_patch_loop",
    )

    assert result["summary"]["patch_generated"] is True
    assert result["summary"]["verification_returncode"] == 0
    assert result["summary"]["patch_iterations"] == 2
    assert (tmp_path / "debug_patch_loop" / "workspace" / "repo" / "conftest.py").exists()
    assert (tmp_path / "debug_patch_loop" / "workspace" / "repo" / "six.py").exists()


def test_debug_miner_patch_loop_uses_llm_when_heuristics_stop(monkeypatch, tmp_path) -> None:
    def fake_clone(repo_url, repo_path, branch, timeout_seconds):
        repo = Path(repo_path)
        (repo / "src" / "tasks").mkdir(parents=True)
        (repo / "src" / "tasks" / "__init__.py").write_text("", encoding="utf-8")
        return {"returncode": 0, "stdout": "", "stderr": "", "combined_output": "", "timed_out": False}

    def fake_run(command, cwd, timeout_seconds):
        repo = Path(cwd)
        if not (repo / "conftest.py").exists():
            output = "E   ModuleNotFoundError: No module named 'tasks'"
            return {"returncode": 2, "stdout": "", "stderr": output, "combined_output": output, "timed_out": False}
        if not (repo / "six.py").exists():
            output = "E   ModuleNotFoundError: No module named 'six'"
            return {"returncode": 2, "stdout": "", "stderr": output, "combined_output": output, "timed_out": False}
        if not (repo / "func.py").exists():
            output = "E   ModuleNotFoundError: No module named 'func.test_unique_id'"
            return {"returncode": 2, "stdout": "", "stderr": output, "combined_output": output, "timed_out": False}
        return {"returncode": 0, "stdout": "1 passed", "stderr": "", "combined_output": "1 passed", "timed_out": False}

    def fake_llm(*args, **kwargs):
        return ZaiChatResult(
            content='{"action":"create_file","path":"func.py","content":"# generated by llm patch\\n","reason":"Provide missing func module namespace."}',
            usage={
                "provider": "zai",
                "model": "glm-test",
                "base_url": "https://example.test",
                "prompt_tokens": 200,
                "completion_tokens": 80,
                "total_tokens": 280,
            },
        )

    monkeypatch.setattr("aurora_agent_core.miners.debug_miner_graph.clone_repository", fake_clone)
    monkeypatch.setattr("aurora_agent_core.miners.debug_miner_graph.run_command", fake_run)
    monkeypatch.setattr("aurora_agent_core.miners.debug_miner_graph.call_zai_chat_with_usage", fake_llm)

    result = DebugMinerGraph().run(
        {
            "task_id": "task_debug_patch_loop_llm",
            "task_type": "code_debug",
            "metadata": {"use_llm": True},
            "debug": {
                "code_source": {"type": "git", "repo_url": "https://github.com/example/project"},
                "bug_description": "修复多层缺失模块",
                "reproduction": {"test_command": "python -m pytest"},
                "execution_policy": {"allow_patch": True, "cleanup_repo": False, "use_llm": True},
            },
        },
        output_dir=tmp_path / "debug_patch_loop_llm",
    )

    assert result["summary"]["patch_generated"] is True
    assert result["summary"]["verification_returncode"] == 0
    assert result["summary"]["patch_iterations"] == 3
    assert result["usage"]["llm"]["calls"] == 4
    assert result["usage"]["llm_total_tokens"] == 1120
    assert (tmp_path / "debug_patch_loop_llm" / "workspace" / "repo" / "func.py").exists()


def test_debug_miner_loop_reads_nested_llm_metadata(monkeypatch, tmp_path) -> None:
    def fake_clone(repo_url, repo_path, branch, timeout_seconds):
        repo = Path(repo_path)
        repo.mkdir(parents=True, exist_ok=True)
        return {"returncode": 0, "stdout": "", "stderr": "", "combined_output": "", "timed_out": False}

    def fake_run(command, cwd, timeout_seconds):
        repo = Path(cwd)
        if not (repo / "fix.py").exists():
            output = "AssertionError: expected 1 got 0"
            return {"returncode": 1, "stdout": output, "stderr": "", "combined_output": output, "timed_out": False}
        return {"returncode": 0, "stdout": "1 passed", "stderr": "", "combined_output": "1 passed", "timed_out": False}

    def fake_llm(*args, **kwargs):
        return ZaiChatResult(
            content='{"action":"create_file","path":"fix.py","content":"VALUE = 1\\n","reason":"Create a minimal fix file."}',
            usage={
                "provider": "zai",
                "model": "glm-test",
                "base_url": "https://example.test",
                "prompt_tokens": 100,
                "completion_tokens": 40,
                "total_tokens": 140,
            },
        )

    monkeypatch.setattr("aurora_agent_core.miners.debug_miner_graph.clone_repository", fake_clone)
    monkeypatch.setattr("aurora_agent_core.miners.debug_miner_graph.run_command", fake_run)
    monkeypatch.setattr("aurora_agent_core.miners.debug_miner_graph.call_zai_chat_with_usage", fake_llm)

    result = DebugMinerGraph().run(
        {
            "task_id": "task_debug_nested_llm",
            "task_type": "code_debug",
            "metadata": {"llm": {"enabled": True}},
            "debug": {
                "code_source": {"type": "git", "repo_url": "https://github.com/example/project"},
                "bug_description": "修复断言错误",
                "reproduction": {"test_command": "python -m pytest"},
                "execution_policy": {"allow_patch": True, "cleanup_repo": False},
            },
        },
        output_dir=tmp_path / "debug_nested_llm",
    )

    assert result["summary"]["patch_generated"] is True
    assert result["summary"]["verification_returncode"] == 0
    assert result["usage"]["llm"]["calls"] == 2
    assert result["usage"]["llm_total_tokens"] == 280
    assert (tmp_path / "debug_nested_llm" / "workspace" / "repo" / "fix.py").exists()


def test_truncate_output_preserves_tail_failure_signal() -> None:
    from aurora_agent_core.miners.debug_miner_graph import extract_missing_modules, truncate_output

    output = "progress\n" * 1000 + "ModuleNotFoundError: No module named 'six'\n"
    truncated = truncate_output(output, 1000)

    assert "aurora output truncated" in truncated
    assert "ModuleNotFoundError: No module named 'six'" in truncated
    assert extract_missing_modules(truncated) == ["six"]
