from __future__ import annotations

from fastapi.testclient import TestClient

from aurora_agent_core.api import app
from aurora_agent_core.platform_agent_registry import reset_platform_agent_store


client = TestClient(app)


DATASET_REQUEST = "帮我构建 10 条 Web3 漏洞数据集，覆盖重入和权限控制，仅公开来源，输出 jsonl，来源包括 github 和博客"


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_intake_waits_for_price_confirmation() -> None:
    response = client.post("/v1/intake", json={"user_input": DATASET_REQUEST})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "awaiting_price_confirmation"
    assert data["ready"] is False
    assert data["suggested_price"] is not None
    assert "task_spec" not in data


def test_intake_confirms_budget() -> None:
    response = client.post(
        "/v1/intake",
        json={"user_input": DATASET_REQUEST, "price_confirmed": True, "user_budget": 0.2},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert data["ready"] is True
    assert data["task_spec"]["assigned_agent"] == "dataset_miner"
    assert data["task_spec"]["user_budget"] == 0.2


def test_execute_dataset(tmp_path) -> None:
    response = client.post(
        "/v1/execute",
        json={
            "user_input": DATASET_REQUEST,
            "price_confirmed": True,
            "output_dir": str(tmp_path / "dataset"),
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["intake"]["status"] == "ready"
    assert data["execution"]["status"] == "completed"
    assert data["execution"]["summary"]["records"] == 10
    assert data["execution"]["usage"]["miner"] == "dataset_miner"
    assert data["execution"]["usage"]["records_output"] == 10
    assert (tmp_path / "dataset" / "dataset.jsonl").exists()


def test_payment_verify_endpoint(monkeypatch) -> None:
    def fake_verify_payment_tx(tx_hash, expected_price_eth, payer_address=None):
        return {
            "payment_verified": True,
            "tx_hash": tx_hash,
            "expected_amount_eth": expected_price_eth,
            "payer_address": payer_address,
        }

    monkeypatch.setattr("aurora_agent_core.api.verify_payment_tx", fake_verify_payment_tx)
    response = client.post(
        "/v1/payment/verify",
        json={
            "tx_hash": "0x" + "2" * 64,
            "expected_price": 0.016,
            "payer_address": "0x0000000000000000000000000000000000001001",
        },
    )

    assert response.status_code == 200
    assert response.json()["payment_verified"] is True
    assert response.json()["expected_amount_eth"] == 0.016


def test_execute_verifies_payment_hash_before_running(monkeypatch, tmp_path) -> None:
    def fake_verify_payment_tx(tx_hash, expected_price_eth, payer_address=None):
        return {
            "payment_verified": True,
            "tx_hash": tx_hash,
            "expected_amount_eth": expected_price_eth,
            "payer_address": payer_address,
        }

    def fake_run_aurora_task(payload, output_dir=None):
        return {
            "intake": {"status": "ready"},
            "execution": {"status": "completed"},
            "payload_payment_verified": payload.get("payment_verified"),
        }

    monkeypatch.setattr("aurora_agent_core.api.verify_payment_tx", fake_verify_payment_tx)
    monkeypatch.setattr("aurora_agent_core.api.run_aurora_task", fake_run_aurora_task)
    response = client.post(
        "/v1/execute",
        json={
            "user_input": DATASET_REQUEST,
            "price_confirmed": True,
            "user_budget": 0.016,
            "payment_tx_hash": "0x" + "3" * 64,
            "payer_address": "0x0000000000000000000000000000000000001001",
            "output_dir": str(tmp_path / "paid"),
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["payment"]["payment_verified"] is True
    assert data["payload_payment_verified"] is True


def test_intake_accepts_use_llm_flag_with_rule_fallback(monkeypatch) -> None:
    def fail_llm(*args, **kwargs):
        raise RuntimeError("mock llm failure")

    monkeypatch.setattr("aurora_agent_core.agents.task_intake_graph.call_zai_chat_with_usage", fail_llm)
    response = client.post("/v1/intake", json={"user_input": DATASET_REQUEST, "use_llm": True})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "awaiting_price_confirmation"
    decompose_events = [event for event in data["trace"]["events"] if event["stage"] == "decompose_task"]
    assert any(event["status"] == "fallback" for event in decompose_events)


def test_register_platform_agent() -> None:
    reset_platform_agent_store()
    response = client.post(
        "/v1/platform-agents",
        json={
            "agent_name": "Smart Contract Audit Agent",
            "company_name": "ABC Security",
            "description": "用于接收审计需求并返回结构化审计结果",
            "api_url": "https://api.abc.com/v1/agent/run",
            "input_schema": {
                "fields": [
                    {"key": "goal", "type": "string", "required": True},
                ]
            },
            "output_schema": {
                "type": "json",
                "result_path": "data.result",
            },
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["agent_id"] == "platform_agent_1"
    assert data["agent_name"] == "Smart Contract Audit Agent"
    assert data["routing"]["assigned_agent"] == "abc_security_smart_contract_audit_agent"
    assert data["execution"]["invocation_url"] == "https://api.abc.com/v1/agent/run"
    assert data["status"] == "draft"
    assert data["review_status"] == "pending"


def test_list_platform_agents() -> None:
    reset_platform_agent_store()
    client.post(
        "/v1/platform-agents",
        json={
            "agent_name": "Dataset Agent",
            "company_name": "Data Corp",
            "description": "生成结构化数据任务定义",
            "api_url": "https://api.data.example/run",
            "input_schema": {
                "fields": [
                    {"key": "goal", "type": "string", "required": True},
                ]
            },
            "output_schema": {
                "type": "json",
                "result_path": "data.result",
            },
        },
    )
    response = client.get("/v1/platform-agents")
    assert response.status_code == 200
    data = response.json()
    assert len(data["agents"]) == 1
    assert data["agents"][0]["agent_id"] == "platform_agent_1"
