from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any


@dataclass
class PlatformAgentStore:
    next_id: int = 1

    def __post_init__(self) -> None:
        self.records: dict[str, dict[str, Any]] = {}


STORE = PlatformAgentStore()


def create_platform_agent(payload: dict[str, Any]) -> dict[str, Any]:
    agent_id = f"platform_agent_{STORE.next_id}"
    STORE.next_id += 1
    now = utc_now()
    slug = slugify(f"{payload['company_name']}-{payload['agent_name']}")

    record = {
        "agent_id": agent_id,
        "created_at": now,
        "updated_at": now,
        "schema_version": "platform-agent/v1",
        "status": "draft",
        "review_status": "pending",
        "enabled": False,
        "visibility": "private",
        "source": "aurora_agent_core_api",
        "slug": slug,
        "agent_name": payload["agent_name"],
        "company_name": payload["company_name"],
        "description": payload["description"],
        "api_url": payload["api_url"],
        "input_schema": payload["input_schema"],
        "output_schema": payload["output_schema"],
        "integration": {
            "protocol": "https_json",
            "method": "POST",
            "content_type": "application/json",
            "timeout_seconds": 30,
        },
        "routing": {
            "assigned_agent": slug,
        },
        "execution": {
            "type": "external_api",
            "invocation_url": payload["api_url"],
        },
    }
    STORE.records[agent_id] = record
    return record


def list_platform_agents() -> list[dict[str, Any]]:
    return list(STORE.records.values())


def get_platform_agent(agent_id: str) -> dict[str, Any] | None:
    return STORE.records.get(agent_id)


def reset_platform_agent_store() -> None:
    STORE.next_id = 1
    STORE.records.clear()


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def slugify(value: str) -> str:
    chars: list[str] = []
    prev_is_sep = False
    for raw in value.lower():
        if raw.isalnum():
            chars.append(raw)
            prev_is_sep = False
        elif not prev_is_sep:
            chars.append("_")
            prev_is_sep = True
    slug = "".join(chars).strip("_")
    return slug[:80] or "platform_agent"
