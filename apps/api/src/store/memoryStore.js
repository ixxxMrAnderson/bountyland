const state = {
  nextTaskId: 1,
  tasks: new Map(),
  submissions: new Map(),
  evaluations: new Map(),
  settlements: new Map()
};

export function createTaskRecord(task) {
  const taskId = state.nextTaskId;
  state.nextTaskId += 1;
  const record = {
    id: taskId,
    status: "created",
    createdAt: new Date().toISOString(),
    ...task
  };
  state.tasks.set(taskId, record);
  state.submissions.set(taskId, []);
  state.evaluations.set(taskId, []);
  state.settlements.set(taskId, []);
  return record;
}

export function listTaskRecords() {
  return Array.from(state.tasks.values());
}

export function getTaskRecord(taskId) {
  return state.tasks.get(Number(taskId));
}

export function addSubmission(taskId, submission) {
  const key = Number(taskId);
  const submissions = state.submissions.get(key) || [];
  const record = {
    id: submissions.length + 1,
    taskId: key,
    submittedAt: new Date().toISOString(),
    ...submission
  };
  submissions.push(record);
  state.submissions.set(key, submissions);
  const task = state.tasks.get(key);
  if (task) {
    task.status = "worker_submitted";
  }
  return record;
}

export function listSubmissions(taskId) {
  return state.submissions.get(Number(taskId)) || [];
}

export function addEvaluation(taskId, evaluation) {
  const key = Number(taskId);
  const evaluations = state.evaluations.get(key) || [];
  const record = {
    id: evaluations.length + 1,
    taskId: key,
    evaluatedAt: new Date().toISOString(),
    ...evaluation
  };
  evaluations.push(record);
  state.evaluations.set(key, evaluations);
  const task = state.tasks.get(key);
  if (task) {
    task.status = "evaluated";
  }
  return record;
}

export function listEvaluations(taskId) {
  return state.evaluations.get(Number(taskId)) || [];
}

export function addSettlement(taskId, settlement) {
  const key = Number(taskId);
  const settlements = state.settlements.get(key) || [];
  const record = {
    id: settlements.length + 1,
    taskId: key,
    createdAt: new Date().toISOString(),
    ...settlement
  };
  settlements.push(record);
  state.settlements.set(key, settlements);
  const task = state.tasks.get(key);
  if (task && settlement.status === "settled") {
    task.status = "settled";
    task.onchain = {
      ...(task.onchain || {}),
      ...(settlement.onchain || {})
    };
  }
  return record;
}

export function listSettlements(taskId) {
  return state.settlements.get(Number(taskId)) || [];
}
