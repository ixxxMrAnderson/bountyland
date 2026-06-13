from __future__ import annotations

from pathlib import Path
from typing import Any, Optional

import os
from pathlib import Path

import uvicorn
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from aurora_agent_core.agents.human_market_task_spec_graph import HumanMarketTaskSpecGraph
from aurora_agent_core.agents.task_intake_graph import TaskIntakeGraph
from aurora_agent_core.runner import run_aurora_task


class IntakeRequest(BaseModel):
    user_input: str = Field(..., min_length=1)
    price_confirmed: bool = False
    user_budget: Optional[float] = None
    use_llm: bool = False


class ExecuteRequest(IntakeRequest):
    output_dir: Optional[str] = None


class HumanMarketSpecRequest(BaseModel):
    user_input: str = Field(..., min_length=1)
    spec_confirmed: bool = False
    use_llm: bool = False
    task_definition: Optional[dict[str, Any]] = None
    validator_criteria: Optional[dict[str, Any]] = None
    reward_rule: Optional[dict[str, Any]] = None


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
    payload = request.model_dump(exclude={"output_dir"})
    return run_aurora_task(payload, output_dir=output_dir)


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


def main() -> None:
    uvicorn.run("aurora_agent_core.api:app", host="127.0.0.1", port=8791, reload=False)


if __name__ == "__main__":
    main()
