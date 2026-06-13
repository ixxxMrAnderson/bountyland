from __future__ import annotations

from aurora_agent_core.agents.task_intake_graph import TaskIntakeGraph
from aurora_agent_core.llm.zai_client import ZaiChatResult


def test_llm_decompose_path(monkeypatch) -> None:
    def fake_llm(*args, **kwargs) -> ZaiChatResult:
        return ZaiChatResult(
            content="""
        {
          "task_type": "dataset_generation",
          "title": "Web3 漏洞数据集",
          "goal": "构建 Web3 漏洞数据集",
          "requirements": ["覆盖重入漏洞", "覆盖权限控制问题"],
          "constraints": ["仅使用公开来源"],
          "output_format": "jsonl",
          "target_size": 10,
          "source_scope": ["github", "blogs"]
        }
        """,
            usage={
                "provider": "zai",
                "model": "glm-test",
                "prompt_tokens": 100,
                "completion_tokens": 50,
                "total_tokens": 150,
            },
        )

    monkeypatch.setattr("aurora_agent_core.agents.task_intake_graph.call_zai_chat_with_usage", fake_llm)
    result = TaskIntakeGraph().run(
        {
            "user_input": "帮我构建 10 条 Web3 漏洞数据集，覆盖重入和权限控制，仅公开来源，输出 jsonl，来源包括 github 和博客",
            "use_llm": True,
        }
    )
    assert result["status"] == "awaiting_price_confirmation"
    assert result["draft_task"]["title"] == "Web3 漏洞数据集"
    assert result["draft_task"]["target_size"] == 10
    assert result["usage"]["llm"]["total_tokens"] == 150
    assert any(
        event["stage"] == "decompose_task" and event["detail"].get("method") == "llm"
        for event in result["trace"]["events"]
    )


def test_llm_decompose_preserves_user_patch_intent(monkeypatch) -> None:
    def fake_llm(*args, **kwargs) -> ZaiChatResult:
        return ZaiChatResult(
            content="""
            {
              "task_type": "code_debug",
              "title": "Debug 任务",
              "goal": "修复公开仓库",
              "requirements": ["修复测试失败"],
              "constraints": [],
              "debug": {
                "code_source": {
                  "type": "git",
                  "repo_url": "https://github.com/example/project",
                  "branch": "main",
                  "commit": null,
                  "public_only": true
                },
                "bug_description": "测试失败",
                "reproduction": {
                  "test_command": "python -m pytest",
                  "logs": null,
                  "entrypoint": null
                },
                "execution_policy": {
                  "allow_patch": false,
                  "allow_commands": [],
                  "timeout_seconds": 600,
                  "cleanup_repo": true
                }
              }
            }
            """,
            usage={"provider": "zai", "model": "glm-test", "total_tokens": 123},
        )

    monkeypatch.setattr("aurora_agent_core.agents.task_intake_graph.call_zai_chat_with_usage", fake_llm)
    result = TaskIntakeGraph().run(
        {
            "user_input": (
                "帮我修复这个公开 GitHub 仓库 https://github.com/example/project，"
                "测试命令 python -m pytest，保留仓库，我要看修改后的代码"
            ),
            "use_llm": True,
        }
    )
    policy = result["draft_task"]["debug"]["execution_policy"]
    assert policy["allow_patch"] is True
    assert policy["cleanup_repo"] is False
    assert policy["allow_commands"] == ["python -m pytest"]
