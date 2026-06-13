from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv


DEFAULT_CHAIN_ID = 11155111
DEFAULT_CONFIRMATIONS = 0


@dataclass(frozen=True)
class PaymentConfig:
    rpc_url: str
    contract_address: str
    chain_id: int = DEFAULT_CHAIN_ID
    min_confirmations: int = DEFAULT_CONFIRMATIONS

    @classmethod
    def from_env(cls) -> "PaymentConfig":
        load_dotenv(".env")
        load_dotenv(".env.example")
        rpc_url = os.getenv("SEPOLIA_RPC_URL") or os.getenv("AURORA_SEPOLIA_RPC_URL")
        if not rpc_url:
            raise RuntimeError("Missing SEPOLIA_RPC_URL or AURORA_SEPOLIA_RPC_URL for payment verification.")
        return cls(
            rpc_url=rpc_url,
            contract_address=os.getenv("COMPUTE_PLATFORM_CONTRACT_ADDRESS") or default_contract_address(),
            chain_id=int(os.getenv("AURORA_PAYMENT_CHAIN_ID", str(DEFAULT_CHAIN_ID))),
            min_confirmations=int(os.getenv("AURORA_PAYMENT_MIN_CONFIRMATIONS", str(DEFAULT_CONFIRMATIONS))),
        )


def verify_payment_tx(
    tx_hash: str,
    expected_price_eth: float,
    payer_address: str | None = None,
    config: PaymentConfig | None = None,
) -> dict[str, Any]:
    config = config or PaymentConfig.from_env()
    normalized_hash = normalize_tx_hash(tx_hash)
    expected_wei = eth_to_wei(expected_price_eth)

    chain_id = int(json_rpc(config.rpc_url, "eth_chainId", []), 16)
    if chain_id != config.chain_id:
        return payment_result(False, normalized_hash, expected_wei, reason=f"Wrong chain id: {chain_id}.")

    tx = json_rpc(config.rpc_url, "eth_getTransactionByHash", [normalized_hash])
    if not tx:
        return payment_result(False, normalized_hash, expected_wei, reason="Transaction not found.")
    receipt = json_rpc(config.rpc_url, "eth_getTransactionReceipt", [normalized_hash])
    if not receipt:
        return payment_result(False, normalized_hash, expected_wei, tx=tx, reason="Transaction receipt not available yet.")

    latest_block = json_rpc(config.rpc_url, "eth_blockNumber", [])
    confirmations = calculate_confirmations(latest_block, receipt.get("blockNumber"))
    paid_wei = int(tx.get("value") or "0x0", 16)
    contract_ok = same_address(tx.get("to"), config.contract_address)
    payer_ok = True if not payer_address else same_address(tx.get("from"), payer_address)
    status_ok = int(receipt.get("status") or "0x0", 16) == 1
    amount_ok = paid_wei >= expected_wei
    confirmations_ok = confirmations >= config.min_confirmations

    verified = bool(status_ok and contract_ok and payer_ok and amount_ok and confirmations_ok)
    reasons = []
    if not status_ok:
        reasons.append("Transaction failed on-chain.")
    if not contract_ok:
        reasons.append("Transaction target contract mismatch.")
    if not payer_ok:
        reasons.append("Transaction payer mismatch.")
    if not amount_ok:
        reasons.append("Paid amount is below expected price.")
    if not confirmations_ok:
        reasons.append("Insufficient confirmations.")

    return payment_result(
        verified,
        normalized_hash,
        expected_wei,
        reason=" ".join(reasons) if reasons else "Payment verified.",
        tx=tx,
        receipt=receipt,
        chain_id=chain_id,
        confirmations=confirmations,
        contract_address=config.contract_address,
        paid_wei=paid_wei,
    )


def json_rpc(rpc_url: str, method: str, params: list[Any]) -> Any:
    response = requests.post(
        rpc_url,
        json={"jsonrpc": "2.0", "id": 1, "method": method, "params": params},
        timeout=12,
    )
    response.raise_for_status()
    payload = response.json()
    if payload.get("error"):
        raise RuntimeError(f"RPC {method} failed: {payload['error']}")
    return payload.get("result")


def payment_result(
    verified: bool,
    tx_hash: str,
    expected_wei: int,
    reason: str,
    tx: dict[str, Any] | None = None,
    receipt: dict[str, Any] | None = None,
    chain_id: int | None = None,
    confirmations: int | None = None,
    contract_address: str | None = None,
    paid_wei: int | None = None,
) -> dict[str, Any]:
    tx = tx or {}
    receipt = receipt or {}
    paid_wei = int(paid_wei if paid_wei is not None else int(tx.get("value") or "0x0", 16) if tx else 0)
    return {
        "payment_verified": verified,
        "tx_hash": tx_hash,
        "reason": reason,
        "chain_id": chain_id,
        "contract_address": contract_address,
        "payer_address": tx.get("from"),
        "paid_amount_wei": str(paid_wei),
        "paid_amount_eth": wei_to_eth(paid_wei),
        "expected_amount_wei": str(expected_wei),
        "expected_amount_eth": wei_to_eth(expected_wei),
        "confirmations": confirmations,
        "receipt_status": int(receipt.get("status") or "0x0", 16) if receipt else None,
        "block_number": int(receipt.get("blockNumber"), 16) if receipt and receipt.get("blockNumber") else None,
    }


def default_contract_address() -> str:
    config_path = Path(__file__).resolve().parents[2] / "packages/shared/src/contracts/compute-platform-sepolia.json"
    if not config_path.exists():
        return "0xD64381BF72758857da7151B7d197BFcF23b97339"
    data = json.loads(config_path.read_text(encoding="utf-8"))
    return str(data.get("address") or "0xD64381BF72758857da7151B7d197BFcF23b97339")


def normalize_tx_hash(tx_hash: str) -> str:
    value = str(tx_hash or "").strip()
    if not value.startswith("0x") or len(value) != 66:
        raise ValueError("tx_hash must be a 0x-prefixed 32-byte transaction hash.")
    int(value[2:], 16)
    return value


def eth_to_wei(value: float) -> int:
    return int(round(float(value) * 10**18))


def wei_to_eth(value: int) -> float:
    return round(int(value) / 10**18, 18)


def same_address(left: str | None, right: str | None) -> bool:
    return bool(left and right and left.lower() == right.lower())


def calculate_confirmations(latest_block_hex: str | None, tx_block_hex: str | None) -> int:
    if not latest_block_hex or not tx_block_hex:
        return 0
    latest = int(latest_block_hex, 16)
    tx_block = int(tx_block_hex, 16)
    return max(0, latest - tx_block + 1)
