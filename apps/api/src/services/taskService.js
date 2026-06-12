import { generateCriteriaOptions, buildComputationOrder } from "../agents/taskCriteriaAgent.js";
import { auditSubmission } from "../agents/aiAuditAgent.js";
import { buildArtifactUris, sha256 } from "./artifactService.js";
import { draftCoboPactPolicy } from "./coboPolicyService.js";
import {
  addEvaluation,
  addSubmission,
  createTaskRecord,
  getTaskRecord,
  listEvaluations,
  listSettlements,
  listSubmissions,
  listTaskRecords
} from "../store/memoryStore.js";
import { calculateFinalEvaluation } from "../../../../packages/shared/src/scoring.js";

const DEMO_WORKER_ADDRESS = "0x0000000000000000000000000000000000001001";
const DEMO_VALIDATOR_ADDRESS = "0x0000000000000000000000000000000000002001";

export function proposeCriteria(taskInput) {
  return generateCriteriaOptions(taskInput);
}

export function createTaskFromCriteria({ taskInput, selectedCriteriaId }) {
  const order = buildComputationOrder({ taskInput, selectedCriteriaId });
  const artifacts = buildArtifactUris(order);
  const contractParams = {
    taskURI: artifacts.taskURI,
    orderURI: artifacts.orderURI,
    criteriaHash: artifacts.criteriaHash,
    deadline: order.deadline,
    aiAuditEnabled: order.aiAuditEnabled,
    rewardBudgetEth: order.rewardBudgetEth
  };
  const coboPactDraft = draftCoboPactPolicy({ order, contractParams });
  const task = createTaskRecord({
    order,
    artifacts,
    contractParams,
    coboPactDraft
  });

  return task;
}

export function listTasks() {
  return listTaskRecords().map(withChildren);
}

export function getTask(taskId) {
  const task = getTaskRecord(taskId);
  return task ? withChildren(task) : null;
}

export function submitWorkerOutput(taskId, body) {
  assertTaskExists(taskId);
  return addSubmission(taskId, {
    workerAddress: body.workerAddress || DEMO_WORKER_ADDRESS,
    outputURI: body.outputURI || `memory://outputs/${sha256(body.outputText || "")}`,
    outputHash: `0x${sha256(body.outputText || body.outputURI || "")}`,
    outputText: body.outputText || ""
  });
}

export function submitValidatorEvaluation(taskId, body) {
  const task = assertTaskExists(taskId);
  const submissions = listSubmissions(taskId);
  const submission =
    submissions.find((item) => item.id === Number(body.submissionId)) || submissions[0];
  if (!submission) {
    throw new Error("No worker submission exists for this task");
  }

  const aiAudit = auditSubmission({
    outputText: submission.outputText,
    selectedCriteria: task.order.selectedCriteria
  });
  const finalEvaluation = calculateFinalEvaluation({
    validatorScore: body.validatorScore,
    aiScore: aiAudit.aiScore,
    validatorReputation: body.validatorReputation || 70
  });

  return addEvaluation(taskId, {
    submissionId: submission.id,
    workerAddress: submission.workerAddress,
    validatorAddress: body.validatorAddress || DEMO_VALIDATOR_ADDRESS,
    validatorReason: body.reason || "",
    aiAudit,
    ...finalEvaluation
  });
}

function assertTaskExists(taskId) {
  const task = getTaskRecord(taskId);
  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }
  return task;
}

function withChildren(task) {
  return {
    ...task,
    submissions: listSubmissions(task.id),
    evaluations: listEvaluations(task.id),
    settlements: listSettlements(task.id)
  };
}
