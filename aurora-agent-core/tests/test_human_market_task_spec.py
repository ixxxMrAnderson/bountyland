from __future__ import annotations

from fastapi.testclient import TestClient

from aurora_agent_core.agents.human_market_task_spec_graph import HumanMarketTaskSpecGraph
from aurora_agent_core.api import app
from aurora_agent_core.llm.zai_client import ZaiChatResult


READY_REQUEST = (
    "发布一个人工 debug 悬赏任务：修复 GitHub 仓库测试失败，交付 patch 和验证报告。"
    "validator 评分看测试是否通过、补丁安全性和说明质量。"
    "threshold 80，前3个 miner 按 [0.5,0.3,0.2] 分钱，时间窗口 7天。"
)


def test_human_market_spec_waits_for_final_confirmation() -> None:
    result = HumanMarketTaskSpecGraph().run({"user_input": READY_REQUEST})

    assert result["status"] == "awaiting_spec_confirmation"
    assert result["ready"] is False
    rule = result["draft_human_market_spec"]["reward_rule"]
    assert rule["threshold_score"] == 80
    assert rule["winner_count"] == 3
    assert rule["settlement_window_hours"] == 168
    assert rule["winner_shares"] == [0.5, 0.3, 0.2]
    assert rule["settlement_policy"]["full_refund_if_eligible_winners_lt_y"] is True


def test_human_market_spec_ready_after_confirmation() -> None:
    result = HumanMarketTaskSpecGraph().run({"user_input": READY_REQUEST, "spec_confirmed": True})

    assert result["status"] == "ready"
    assert result["ready"] is True
    spec = result["human_market_task_spec"]
    assert spec["market_mode"] == "human_miner_market"
    assert spec["task_id"].startswith("human_market_task_")
    assert spec["metadata"]["requires_market_reward_pool"] is True


def test_human_market_spec_requires_reward_parameters() -> None:
    result = HumanMarketTaskSpecGraph().run({"user_input": "发布一个人工数据集任务，要求矿工提交 jsonl 数据。"})

    assert result["status"] == "needs_confirmation"
    assert "reward_rule.threshold_score_x" in result["missing_fields"]
    assert "reward_rule.winner_count_y" in result["missing_fields"]
    assert "reward_rule.settlement_window_z" in result["missing_fields"]
    assert "reward_rule.winner_shares_[a1..ay]" in result["missing_fields"]


def test_human_market_spec_validates_share_sum_and_count() -> None:
    result = HumanMarketTaskSpecGraph().run(
        {
            "user_input": "发布人工审计任务，threshold 75，前3个 miner，时间窗口 48小时，比例 [0.5,0.3]",
            "spec_confirmed": True,
        }
    )

    assert result["status"] == "needs_confirmation"
    assert "reward_rule.winner_count must equal len(winner_shares)." in result["validation_errors"]
    assert "sum(reward_rule.winner_shares) must equal 1." in result["validation_errors"]


def test_human_market_spec_uses_llm_and_overrides(monkeypatch) -> None:
    def fake_llm(*args, **kwargs):
        return ZaiChatResult(
            content="""
            {
              "market_mode": "human_miner_market",
              "task_definition": {
                "title": "人工漏洞数据集任务",
                "goal": "构建人工审核的漏洞数据集",
                "deliverables": ["jsonl 数据集", "质量报告"],
                "output_format": "jsonl"
              },
              "validator_criteria": {
                "summary": "按 schema、正确性、来源评分",
                "scoring_dimensions": [{"name":"schema", "weight":40}, {"name":"quality", "weight":60}],
                "checklist": ["检查 schema", "检查重复"]
              },
              "reward_rule": {
                "threshold_score": 78,
                "winner_count": 2,
                "settlement_window_hours": 72,
                "winner_shares": [0.7, 0.3]
              }
            }
            """,
            usage={"provider": "zai", "model": "glm-test", "total_tokens": 321},
        )

    monkeypatch.setattr("aurora_agent_core.agents.human_market_task_spec_graph.call_zai_chat_with_usage", fake_llm)
    result = HumanMarketTaskSpecGraph().run(
        {
            "user_input": "帮我发布一个人工 miner 数据集任务",
            "use_llm": True,
            "spec_confirmed": True,
            "reward_rule": {"threshold_score": 80},
        }
    )

    assert result["status"] == "ready"
    assert result["usage"]["llm"]["total_tokens"] == 321
    rule = result["human_market_task_spec"]["reward_rule"]
    assert rule["threshold_score"] == 80
    assert rule["winner_count"] == 2
    assert rule["winner_shares"] == [0.7, 0.3]


def test_human_market_spec_api_endpoint() -> None:
    client = TestClient(app)
    response = client.post(
        "/v1/human-market/spec",
        json={"user_input": READY_REQUEST, "spec_confirmed": True},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert data["human_market_task_spec"]["reward_rule"]["threshold_score"] == 80
