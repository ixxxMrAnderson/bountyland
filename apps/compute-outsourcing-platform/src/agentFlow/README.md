# Agent Flow Framework

This folder maps `agent_flow.png` into a minimal code framework.

```text
Start
  -> user input
  -> z.ai Spec Agent extracts task info fields
  -> z.ai Requirement Agent decomposes user needs
  -> z.ai Criteria Agent builds scoring criteria JSON
  -> z.ai Satisfaction Agent checks whether user accepts the draft
  -> final JSON combines:
     1. taskInfo
     2. userRequirements
     3. scoringData
```

Current model config:

```ts
provider: "z.ai"
model: "glm-5.1" // when ZAI_API_KEY is available
mode: "api" | "mock"
```

Current files:

```text
types.ts
  JSON shapes for task info, user requirements, scoring criteria, trace steps.

zaiModel.ts
  Browser adapter. It calls /api/zai/agent-flow and falls back to mock output
  if the local bridge is offline.

server.ts
  Local API bridge. It keeps ZAI_API_KEY server-side, calls the official Z.AI
  Chat Completions endpoint, and returns strategy questions for the frontend.

agentPipeline.ts
  The orchestration pipeline used by the frontend task creation chat.
```

Real z.ai integration:

```text
1. Copy .env.example to .env.local.
2. Add ZAI_API_KEY.
3. Run npm run dev.
4. The frontend hits /api/zai/agent-flow through the Vite proxy.
5. Without ZAI_API_KEY, the UI keeps working through a local mock fallback.
```

The Z.AI strategy response asks high-level questions before order creation:

```text
- Many validators vs fewer high-reputation/high-stake validators.
- Forgiving boundary coverage audit vs strict parser-compatible audit.
- Conservative AI threshold/refund protection vs exploratory miner iteration.
```
