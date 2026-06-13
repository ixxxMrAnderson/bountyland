from __future__ import annotations

from pathlib import Path
from typing import Any, Optional

import os
from pathlib import Path

import uvicorn
<<<<<<< Updated upstream
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
=======
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict, Field, HttpUrl
>>>>>>> Stashed changes

from aurora_agent_core.agents.human_market_task_spec_graph import HumanMarketTaskSpecGraph
from aurora_agent_core.agents.task_intake_graph import TaskIntakeGraph
from aurora_agent_core.payment import verify_payment_tx
from aurora_agent_core.platform_agent_registry import (
    create_platform_agent,
    get_platform_agent,
    list_platform_agents,
)
from aurora_agent_core.runner import run_aurora_task


class IntakeRequest(BaseModel):
    user_input: str = Field(..., min_length=1)
    price_confirmed: bool = False
    user_budget: Optional[float] = None
    use_llm: bool = False


class ExecuteRequest(IntakeRequest):
    output_dir: Optional[str] = None
    payment_verified: bool = False
    payment_tx_hash: Optional[str] = None
    payment_expected_price: Optional[float] = None
    payer_address: Optional[str] = None


class HumanMarketSpecRequest(BaseModel):
    user_input: str = Field(..., min_length=1)
    spec_confirmed: bool = False
    use_llm: bool = False
    task_definition: Optional[dict[str, Any]] = None
    validator_criteria: Optional[dict[str, Any]] = None
    reward_rule: Optional[dict[str, Any]] = None


class PaymentVerifyRequest(BaseModel):
    tx_hash: str = Field(..., min_length=66, max_length=66)
    expected_price: float = Field(..., gt=0)
    payer_address: Optional[str] = None


class PlatformAgentInputField(BaseModel):
    key: str = Field(..., min_length=1)
    type: str = Field(..., min_length=1)
    required: bool


class PlatformAgentInputSchema(BaseModel):
    fields: list[PlatformAgentInputField] = Field(..., min_length=1)


class PlatformAgentOutputSchema(BaseModel):
    type: str = Field(..., min_length=1)
    result_path: str = Field(..., min_length=1)


class PlatformAgentCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    agent_name: str = Field(..., min_length=1)
    company_name: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)
    api_url: HttpUrl
    input_schema: PlatformAgentInputSchema
    output_schema: PlatformAgentOutputSchema


app = FastAPI(
    title="Aurora Agent Core API",
    version="0.1.0",
    description="LangGraph MVP API for task intake, confirmation, routing, and dataset miner execution.",
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "aurora-agent-core"}


@app.post("/v1/intake")
def intake(request: IntakeRequest) -> dict[str, Any]:
    return TaskIntakeGraph().run(request.model_dump())


@app.post("/v1/execute")
def execute(request: ExecuteRequest) -> dict[str, Any]:
    output_dir = Path(request.output_dir) if request.output_dir else None
    payment_result = None
    if request.payment_tx_hash and not request.payment_verified:
        expected_price = request.payment_expected_price or request.user_budget
        if expected_price is None:
            raise HTTPException(status_code=400, detail="payment_expected_price or user_budget is required when payment_tx_hash is provided.")
        payment_result = verify_payment_tx(
            tx_hash=request.payment_tx_hash,
            expected_price_eth=expected_price,
            payer_address=request.payer_address,
        )
        if not payment_result.get("payment_verified"):
            raise HTTPException(status_code=402, detail=payment_result)
    payload = request.model_dump(exclude={"output_dir"})
    payload["payment_verified"] = bool(request.payment_verified or payment_result)
    result = run_aurora_task(payload, output_dir=output_dir)
    if payment_result:
        result["payment"] = payment_result
    return result


@app.post("/v1/payment/verify")
def verify_payment(request: PaymentVerifyRequest) -> dict[str, Any]:
    try:
        return verify_payment_tx(
            tx_hash=request.tx_hash,
            expected_price_eth=request.expected_price,
            payer_address=request.payer_address,
        )
    except Exception as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@app.get("/v1/artifacts/download")
def download_artifact(task_id: str = Query(..., min_length=1), filename: str = Query(..., min_length=1)):
    """Download a single artifact file from a completed task run."""
    base = Path("artifacts") / task_id
    if not base.is_dir():
        raise HTTPException(status_code=404, detail=f"Task directory not found: {task_id}")
    # Security: prevent path traversal
    safe_name = os.path.basename(filename)
    file_path = base / safe_name
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail=f"Artifact file not found: {safe_name}")
    return FileResponse(str(file_path), filename=safe_name)


@app.post("/v1/human-market/spec")
def human_market_spec(request: HumanMarketSpecRequest) -> dict[str, Any]:
    return HumanMarketTaskSpecGraph().run(request.model_dump())


@app.post("/v1/platform-agents")
def register_platform_agent(request: PlatformAgentCreateRequest) -> dict[str, Any]:
    payload = request.model_dump(mode="json")
    return create_platform_agent(payload)


@app.get("/v1/platform-agents")
def platform_agents() -> dict[str, Any]:
    return {"agents": list_platform_agents()}


@app.get("/v1/platform-agents/{agent_id}")
def platform_agent_detail(agent_id: str) -> dict[str, Any]:
    agent = get_platform_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Platform agent not found")
    return agent


def main() -> None:
    uvicorn.run("aurora_agent_core.api:app", host="127.0.0.1", port=8791, reload=False)


if __name__ == "__main__":
    main()
