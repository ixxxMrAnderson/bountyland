// ============================================================================
// Aurora Agent Core API client
// Dev: Vite proxy /api → http://127.0.0.1:8791
// ============================================================================

const API_BASE = '/api';

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface IntakeResponse {
  status: 'needs_confirmation' | 'awaiting_price_confirmation' | 'ready';
  ready: boolean;
  agent_message?: string;
  missing_fields?: string[];
  suggested_price?: number;
  user_budget?: number | null;
  draft_task?: Record<string, unknown>;
  task_spec?: Record<string, unknown>;
  usage?: {
    agent: string;
    llm?: {
      provider: string;
      model: string;
      total_tokens: number;
    };
    pricing?: {
      suggested_price: number;
      user_budget: number | null;
      currency: string;
    };
  };
}

export interface ExecutionArtifact {
  type: 'debug_report' | 'repo_context' | 'runtime' | 'trace' | 'patch' | 'modified_repo';
  path: string;
}

export interface ExecutionSummary {
  repo_url?: string;
  test_command?: string;
  reproduced?: boolean;
  returncode?: number;
  candidate_files?: number;
  patch_generated?: boolean;
  verification_returncode?: number;
  patch_iterations?: number;
  cleanup_repo?: boolean;
}

export interface ExecutionResult {
  task_id?: string;
  status?: string;
  summary?: ExecutionSummary;
  artifacts?: ExecutionArtifact[];
  usage?: {
    miner?: string;
    repo_cloned?: boolean;
    commands_run?: number;
    initial_returncode?: number;
    patch_iterations?: number;
    patch_generated?: boolean;
    files_modified?: number;
    verification_returncode?: number;
    cleanup_repo?: boolean;
    llm?: {
      provider: string;
      model: string;
      calls: number;
      total_tokens: number;
    };
    llm_total_tokens?: number;
  };
}

export interface ExecuteResponse {
  intake: IntakeResponse;
  execution: ExecutionResult | null;
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

/**
 * POST /v1/intake
 * Analyse the user's debug request and return a task spec + suggested price.
 */
export async function intakeDebug(userInput: string): Promise<IntakeResponse> {
  const body = { user_input: userInput, use_llm: true };
  console.group('%c🚀 [Agent API] POST /v1/intake', 'color: #dfab6c; font-weight: bold');
  console.log('%c📤 Request:', 'color: #849c44', { user_input: userInput.slice(0, 300) + (userInput.length > 300 ? '...' : ''), use_llm: true });
  console.time('intake');

  const res = await fetch(`${API_BASE}/v1/intake`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  console.timeEnd('intake');

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.log('%c❌ Error:', 'color: #bf311d', res.status, text.slice(0, 300));
    console.groupEnd();
    throw new Error(`Intake failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  console.log('%c📥 Response:', 'color: #dfab6c', {
    status: data.status,
    ready: data.ready,
    suggested_price: data.suggested_price,
    missing_fields: data.missing_fields,
    agent_message: data.agent_message?.slice(0, 200),
    usage: data.usage,
  });
  console.groupEnd();
  return data;
}

/**
 * POST /v1/execute
 * Confirm price and execute the debug miner.
 *
 * NOTE: /v1/execute re-runs TaskIntakeGraph internally before routing to the
 * miner, so user_input must contain the FULL original request text.
 */
export async function executeDebug(params: {
  userInput: string;
  userBudget: number;
  outputDir?: string;
}): Promise<ExecuteResponse> {
  const body = {
    user_input: params.userInput,
    price_confirmed: true,
    user_budget: params.userBudget,
    use_llm: true,
    output_dir: params.outputDir ?? undefined,
  };
  console.group('%c⚡ [Agent API] POST /v1/execute', 'color: #849c44; font-weight: bold');
  console.log('%c📤 Request:', 'color: #849c44', {
    user_input: params.userInput.slice(0, 200) + (params.userInput.length > 200 ? '...' : ''),
    price_confirmed: true,
    user_budget: params.userBudget,
    use_llm: true,
  });
  console.time('execute');

  const res = await fetch(`${API_BASE}/v1/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  console.timeEnd('execute');

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.log('%c❌ Error:', 'color: #bf311d', res.status, text.slice(0, 300));
    console.groupEnd();
    throw new Error(`Execute failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  const exec = data.execution || {};
  console.log('%c📥 Response:', 'color: #dfab6c', {
    'intake.status': data.intake?.status,
    'intake.ready': data.intake?.ready,
    'execution.status': exec.status,
    'execution.summary': exec.summary,
    'execution.usage': exec.usage,
    'artifacts.count': exec.artifacts?.length,
    'artifacts': exec.artifacts?.map((a: any) => a.type + ': ' + a.path),
  });
  console.groupEnd();
  return data;
}

/**
 * GET /v1/artifacts/download?task_id=...&filename=...
 * Download a single artifact file from a completed task run.
 */
export function getArtifactDownloadUrl(taskId: string, filename: string): string {
  const params = new URLSearchParams({ task_id: taskId, filename });
  return `${API_BASE}/v1/artifacts/download?${params.toString()}`;
}

/**
 * Fetch an artifact's text content for inline display.
 */
export async function fetchArtifactContent(taskId: string, filename: string): Promise<string> {
  const url = getArtifactDownloadUrl(taskId, filename);
  console.log('%c📄 [Agent API] GET artifact', 'color: #8e7564', { taskId, filename, url });
  console.time('artifact_' + filename);

  const res = await fetch(url);

  console.timeEnd('artifact_' + filename);

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.log('%c❌ Artifact fetch failed:', 'color: #bf311d', res.status, text.slice(0, 200));
    throw new Error(`Artifact fetch failed (${res.status}): ${text}`);
  }

  const content = await res.text();
  console.log('%c📥 Artifact loaded:', 'color: #8e7564', { filename, size: content.length });
  return content;
}

/**
 * GET /health
 */
export async function healthCheck(): Promise<{ status: string; service: string }> {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}
