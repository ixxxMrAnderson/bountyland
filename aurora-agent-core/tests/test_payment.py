from __future__ import annotations

from aurora_agent_core.payment import PaymentConfig, verify_payment_tx


TX_HASH = "0x" + "1" * 64
CONTRACT = "0xD64381BF72758857da7151B7d197BFcF23b97339"
PAYER = "0x0000000000000000000000000000000000001001"


def test_verify_payment_tx_accepts_successful_contract_payment(monkeypatch) -> None:
    def fake_rpc(rpc_url, method, params):
        if method == "eth_chainId":
            return hex(11155111)
        if method == "eth_getTransactionByHash":
            return {
                "hash": TX_HASH,
                "from": PAYER,
                "to": CONTRACT,
                "value": hex(20_000_000_000_000_000),
            }
        if method == "eth_getTransactionReceipt":
            return {"status": "0x1", "blockNumber": hex(100)}
        if method == "eth_blockNumber":
            return hex(103)
        raise AssertionError(method)

    monkeypatch.setattr("aurora_agent_core.payment.json_rpc", fake_rpc)

    result = verify_payment_tx(
        TX_HASH,
        expected_price_eth=0.016,
        payer_address=PAYER,
        config=PaymentConfig(rpc_url="https://rpc.example", contract_address=CONTRACT),
    )

    assert result["payment_verified"] is True
    assert result["paid_amount_eth"] == 0.02
    assert result["expected_amount_eth"] == 0.016
    assert result["confirmations"] == 4


def test_verify_payment_tx_rejects_underpayment(monkeypatch) -> None:
    def fake_rpc(rpc_url, method, params):
        if method == "eth_chainId":
            return hex(11155111)
        if method == "eth_getTransactionByHash":
            return {
                "hash": TX_HASH,
                "from": PAYER,
                "to": CONTRACT,
                "value": hex(5_000_000_000_000_000),
            }
        if method == "eth_getTransactionReceipt":
            return {"status": "0x1", "blockNumber": hex(100)}
        if method == "eth_blockNumber":
            return hex(100)
        raise AssertionError(method)

    monkeypatch.setattr("aurora_agent_core.payment.json_rpc", fake_rpc)

    result = verify_payment_tx(
        TX_HASH,
        expected_price_eth=0.016,
        payer_address=PAYER,
        config=PaymentConfig(rpc_url="https://rpc.example", contract_address=CONTRACT),
    )

    assert result["payment_verified"] is False
    assert "below expected" in result["reason"]
