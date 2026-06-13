from __future__ import annotations

import re
from typing import Any

import requests


DEBUG_PRICE_CAP_ETH = 0.05
DEBUG_PRICE_BASE_ETH = 0.005
DEBUG_ALLOW_PATCH_FEE_ETH = 0.008
DEBUG_TEST_COMMAND_FEE_ETH = 0.006
DEBUG_REPO_SIZE_UNKNOWN_FEE_ETH = 0.005


def estimate_debug_price(draft_task: dict[str, Any]) -> dict[str, Any]:
    debug = draft_task.get("debug") if isinstance(draft_task.get("debug"), dict) else {}
    code_source = debug.get("code_source") if isinstance(debug.get("code_source"), dict) else {}
    reproduction = debug.get("reproduction") if isinstance(debug.get("reproduction"), dict) else {}
    execution_policy = debug.get("execution_policy") if isinstance(debug.get("execution_policy"), dict) else {}

    allow_patch = bool(execution_policy.get("allow_patch"))
    has_test_command = bool(reproduction.get("test_command"))
    repo_url = code_source.get("repo_url")
    repo_size = fetch_github_repo_size(repo_url) if repo_url else {"status": "missing", "size_kb": None}
    repo_size_fee = repo_size_fee_eth(repo_size.get("size_kb"))

    components = [
        {"name": "base", "amount": DEBUG_PRICE_BASE_ETH, "reason": "Platform Debug Miner base price."},
        {
            "name": "allow_patch",
            "amount": DEBUG_ALLOW_PATCH_FEE_ETH if allow_patch else 0.0,
            "reason": "User requested code modification / retained patched repo." if allow_patch else "Patch mode not requested.",
        },
        {
            "name": "test_command",
            "amount": DEBUG_TEST_COMMAND_FEE_ETH if has_test_command else 0.0,
            "reason": "Executable reproduction command supplied." if has_test_command else "No executable test command supplied.",
        },
        {
            "name": "repo_size",
            "amount": repo_size_fee,
            "reason": repo_size_fee_reason(repo_size.get("size_kb")),
            "metadata": repo_size,
        },
    ]
    raw_price = sum(float(component["amount"]) for component in components)
    suggested_price = min(DEBUG_PRICE_CAP_ETH, raw_price)
    return {
        "suggested_price": round(suggested_price, 3),
        "currency": "ETH",
        "cap": DEBUG_PRICE_CAP_ETH,
        "components": components,
        "repo_size": repo_size,
        "formula": "min(0.05, 0.005 + allow_patch + test_command + repo_size_fee)",
    }


def fetch_github_repo_size(repo_url: str | None) -> dict[str, Any]:
    parsed = parse_github_repo(repo_url)
    if not parsed:
        return {"status": "unsupported", "size_kb": None, "repo_url": repo_url}
    owner, repo = parsed
    api_url = f"https://api.github.com/repos/{owner}/{repo}"
    try:
        response = requests.get(
            api_url,
            headers={"Accept": "application/vnd.github+json", "User-Agent": "aurora-agent-core"},
            timeout=3,
        )
        if response.status_code != 200:
            return {
                "status": "unavailable",
                "size_kb": None,
                "repo_url": repo_url,
                "api_url": api_url,
                "http_status": response.status_code,
            }
        payload = response.json()
        return {
            "status": "ok",
            "size_kb": int(payload.get("size") or 0),
            "repo_url": repo_url,
            "api_url": api_url,
            "full_name": payload.get("full_name") or f"{owner}/{repo}",
        }
    except Exception as error:
        return {
            "status": "error",
            "size_kb": None,
            "repo_url": repo_url,
            "api_url": api_url,
            "error": str(error)[:200],
        }


def parse_github_repo(repo_url: str | None) -> tuple[str, str] | None:
    if not repo_url:
        return None
    patterns = [
        r"https?://(?:www\.)?github\.com/([^/\s]+)/([^/\s]+?)(?:\.git)?/?$",
        r"git@github\.com:([^/\s]+)/([^/\s]+?)(?:\.git)?$",
    ]
    for pattern in patterns:
        match = re.match(pattern, repo_url.strip(), flags=re.I)
        if match:
            owner = match.group(1)
            repo = match.group(2).removesuffix(".git")
            return owner, repo
    return None


def repo_size_fee_eth(size_kb: int | None) -> float:
    if size_kb is None:
        return DEBUG_REPO_SIZE_UNKNOWN_FEE_ETH
    if size_kb <= 1024:
        return 0.002
    if size_kb <= 10 * 1024:
        return 0.005
    if size_kb <= 50 * 1024:
        return 0.010
    if size_kb <= 200 * 1024:
        return 0.018
    return 0.025


def repo_size_fee_reason(size_kb: int | None) -> str:
    if size_kb is None:
        return "Repository size unavailable; fallback middle-small fee."
    if size_kb <= 1024:
        return "Repository size <= 1 MB."
    if size_kb <= 10 * 1024:
        return "Repository size <= 10 MB."
    if size_kb <= 50 * 1024:
        return "Repository size <= 50 MB."
    if size_kb <= 200 * 1024:
        return "Repository size <= 200 MB."
    return "Repository size > 200 MB."
