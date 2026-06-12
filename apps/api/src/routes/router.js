import {
  createTaskFromCriteria,
  getTask,
  listTasks,
  proposeCriteria,
  submitValidatorEvaluation,
  submitWorkerOutput
} from "../services/taskService.js";
import { listTaskSettlements, settleTask } from "../services/settlementService.js";

export async function routeRequest(request) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const method = request.method || "GET";

  if (method === "GET" && url.pathname === "/health") {
    return ok({ status: "ok", service: "zai-api" });
  }

  if (method === "POST" && url.pathname === "/tasks/criteria") {
    return ok(proposeCriteria(await readJson(request)));
  }

  if (method === "POST" && url.pathname === "/tasks") {
    return ok(createTaskFromCriteria(await readJson(request)), 201);
  }

  if (method === "GET" && url.pathname === "/tasks") {
    return ok({ tasks: listTasks() });
  }

  const taskMatch = url.pathname.match(/^\/tasks\/(\d+)$/);
  if (method === "GET" && taskMatch) {
    const task = getTask(taskMatch[1]);
    return task ? ok(task) : notFound();
  }

  const submissionMatch = url.pathname.match(/^\/tasks\/(\d+)\/submissions$/);
  if (method === "POST" && submissionMatch) {
    return ok(submitWorkerOutput(submissionMatch[1], await readJson(request)), 201);
  }

  const evaluationMatch = url.pathname.match(/^\/tasks\/(\d+)\/evaluations$/);
  if (method === "POST" && evaluationMatch) {
    return ok(submitValidatorEvaluation(evaluationMatch[1], await readJson(request)), 201);
  }

  const settlementMatch = url.pathname.match(/^\/tasks\/(\d+)\/settle$/);
  if (method === "POST" && settlementMatch) {
    return ok(await settleTask(settlementMatch[1], await readJson(request)), 201);
  }

  const settlementsMatch = url.pathname.match(/^\/tasks\/(\d+)\/settlements$/);
  if (method === "GET" && settlementsMatch) {
    return ok({ settlements: listTaskSettlements(settlementsMatch[1]) });
  }

  return notFound();
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  const rawBody = Buffer.concat(chunks).toString("utf8");
  return rawBody ? JSON.parse(rawBody) : {};
}

function ok(body, status = 200) {
  return { status, body };
}

function notFound() {
  return { status: 404, body: { error: "Not found" } };
}
