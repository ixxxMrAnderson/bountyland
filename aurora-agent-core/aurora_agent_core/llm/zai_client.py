from __future__ import annotations

import argparse
import json
import os
from dataclasses import dataclass
from typing import Any

from dotenv import load_dotenv
from openai import OpenAI


DEFAULT_ZAI_BASE_URL = "https://api.z.ai/api/coding/paas/v4"
DEFAULT_ZAI_MODEL = "glm-5.1"


@dataclass(frozen=True)
class ZaiChatConfig:
    api_key: str
    model: str = DEFAULT_ZAI_MODEL
    base_url: str = DEFAULT_ZAI_BASE_URL
    temperature: float = 0.2
    max_tokens: int = 1200

    @classmethod
    def from_env(cls) -> "ZaiChatConfig":
        load_dotenv(".env")
        load_dotenv(".env.example")
        api_key = os.getenv("ZAI_API_KEY")
        if not api_key:
            raise RuntimeError("Missing ZAI_API_KEY. Put it in .env or export it in your shell.")
        return cls(
            api_key=api_key,
            model=os.getenv("AURORA_MODEL", DEFAULT_ZAI_MODEL),
            base_url=os.getenv("AURORA_BASE_URL", DEFAULT_ZAI_BASE_URL),
            temperature=float(os.getenv("AURORA_TEMPERATURE", "0.2")),
            max_tokens=int(os.getenv("AURORA_MAX_TOKENS", "1200")),
        )


@dataclass(frozen=True)
class ZaiChatResult:
    content: str
    usage: dict[str, Any]


def create_zai_client(config: ZaiChatConfig | None = None) -> OpenAI:
    config = config or ZaiChatConfig.from_env()
    return OpenAI(api_key=config.api_key, base_url=config.base_url)


def call_zai_chat(
    messages: list[dict[str, Any]],
    config: ZaiChatConfig | None = None,
    response_format: dict[str, Any] | None = None,
) -> str:
    return call_zai_chat_with_usage(messages, config=config, response_format=response_format).content


def call_zai_chat_with_usage(
    messages: list[dict[str, Any]],
    config: ZaiChatConfig | None = None,
    response_format: dict[str, Any] | None = None,
) -> ZaiChatResult:
    config = config or ZaiChatConfig.from_env()
    client = create_zai_client(config)
    kwargs: dict[str, Any] = {
        "model": config.model,
        "messages": messages,
        "temperature": config.temperature,
        "max_tokens": config.max_tokens,
    }
    if response_format:
        kwargs["response_format"] = response_format
    response = client.chat.completions.create(**kwargs)
    return ZaiChatResult(
        content=response.choices[0].message.content or "",
        usage=extract_usage(response, config),
    )


def extract_usage(response: Any, config: ZaiChatConfig) -> dict[str, Any]:
    usage = getattr(response, "usage", None)
    prompt_tokens = get_usage_value(usage, "prompt_tokens")
    completion_tokens = get_usage_value(usage, "completion_tokens")
    total_tokens = get_usage_value(usage, "total_tokens")
    if total_tokens is None and (prompt_tokens is not None or completion_tokens is not None):
        total_tokens = int(prompt_tokens or 0) + int(completion_tokens or 0)
    return {
        "provider": "zai",
        "model": getattr(response, "model", None) or config.model,
        "base_url": config.base_url,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "total_tokens": total_tokens,
        "max_tokens": config.max_tokens,
    }


def get_usage_value(usage: Any, key: str) -> int | None:
    if usage is None:
        return None
    if isinstance(usage, dict):
        value = usage.get(key)
    else:
        value = getattr(usage, key, None)
    return int(value) if value is not None else None


def main() -> None:
    parser = argparse.ArgumentParser(description="Smoke test Z.ai OpenAI-compatible chat completion.")
    parser.add_argument("--model", default=None, help="Z.ai model name, for example glm-5.1 or glm-5.")
    parser.add_argument("prompt", nargs="*", default=["用一句话介绍你自己。"])
    args = parser.parse_args()
    config = ZaiChatConfig.from_env()
    if args.model:
        config = ZaiChatConfig(
            api_key=config.api_key,
            model=args.model,
            base_url=config.base_url,
            temperature=config.temperature,
            max_tokens=config.max_tokens,
        )
    text = call_zai_chat(
        [
            {"role": "system", "content": "You are a concise assistant."},
            {"role": "user", "content": " ".join(args.prompt)},
        ],
        config=config,
    )
    print(json.dumps({"model": config.model, "model_reply": text}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
