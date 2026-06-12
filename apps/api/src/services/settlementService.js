import { ZeroAddress } from "ethers";

import { sha256 } from "./artifactService.js";
import {
  finalizeTaskOnchain,
  getContractConfig,
  getOnchainTaskStats,
  submitResultOnchain
} from "./contractService.js";
import {
  addSettlement,
  getTaskRecord,
  listEvaluations,
  listSettlements,
  listSubmissions
} from "../store/memoryStore.js";

const MAX_BPS = 10_000;

export async function settleTask(taskId, options = {}) {
  const task = assertTaskExists(taskId);
  const evaluation = selectEvaluation(taskId, options.evaluationId);
  const submission = selectSubmission(taskId, evaluation.submissionId);
  const onchainTaskId = Number(options.onchainTaskId || task.onchainTaskId || task.id);
  const dryRun = options.dryRun !== false;
  const submitResultArgs = buildSubmitResultArgs({
    onchainTaskId,
    evaluation,
    submission,
    workerAddress: options.workerAddress,
    validatorAddress: options.validatorAddress,
    reportURI: options.reportURI,
    reportHash: options.reportHash
  });
  const finalizeArgs = buildFinalizeArgs({
    onchainTaskId,
    evaluation,
    submission,
    workerAddress: options.workerAddress,
    validatorAddress: options.validatorAddress,
    recipients: options.recipients,
    bpsShares: options.bpsShares
  });
  const plan = {
    network: getContractConfigSummary(),
    dryRun,
    submitResult: submitResultArgs,
    finalizeTask: finalizeArgs
  };

  if (dryRun) {
    return addSettlement(taskId, {
      status: "dry_run",
      evaluationId: evaluation.id,
      submissionId: submission.id,
      onchain: {
        taskId: onchainTaskId,
        plan
      }
    });
  }

  const submitResultTx = await submitResultOnchain(submitResultArgs);
  const finalizeTx = await finalizeTaskOnchain(finalizeArgs);
  let taskStats = null;
  try {
    taskStats = await getOnchainTaskStats(onchainTaskId);
  } catch (error) {
    taskStats = { error: error.message };
  }

  return addSettlement(taskId, {
    status: "settled",
    evaluationId: evaluation.id,
    submissionId: submission.id,
    onchain: {
      taskId: onchainTaskId,
      plan,
      submitResultTx,
      finalizeTx,
      taskStats
    }
  });
}

export function listTaskSettlements(taskId) {
  assertTaskExists(taskId);
  return listSettlements(taskId);
}

function buildSubmitResultArgs({
  onchainTaskId,
  evaluation,
  submission,
  workerAddress,
  validatorAddress,
  reportURI,
  reportHash
}) {
  const resolvedReportURI =
    reportURI ||
    evaluation.reportURI ||
    evaluation.aiAudit?.reportURI ||
    `memory://evaluations/${evaluation.taskId}/${evaluation.id}`;
  const resolvedReportHash =
    reportHash ||
    evaluation.reportHash ||
    evaluation.aiAudit?.reportHash ||
    `0x${sha256(JSON.stringify({ evaluation, submission }))}`;

  return {
    taskId: onchainTaskId,
    worker: requireAddress(workerAddress || evaluation.workerAddress || submission.workerAddress, "worker"),
    validator: normalizeOptionalAddress(validatorAddress || evaluation.validatorAddress),
    workerScore: clampScore(evaluation.workerScore ?? evaluation.finalScore ?? evaluation.aiScore),
    validatorScore: clampScore(evaluation.validatorQualityScore ?? evaluation.validatorScore ?? 0),
    reportURI: resolvedReportURI,
    reportHash: resolvedReportHash
  };
}

function buildFinalizeArgs({
  onchainTaskId,
  evaluation,
  submission,
  workerAddress,
  validatorAddress,
  recipients,
  bpsShares
}) {
  const resolvedRecipients =
    recipients || defaultRecipients(evaluation, submission, workerAddress, validatorAddress);
  const resolvedShares = bpsShares || defaultBpsShares(evaluation, resolvedRecipients);

  if (resolvedRecipients.length !== resolvedShares.length) {
    throw new Error("recipients and bpsShares length mismatch");
  }
  if (resolvedRecipients.length === 0) {
    throw new Error("at least one payout recipient is required");
  }

  let totalBps = 0;
  const normalizedRecipients = resolvedRecipients.map((recipient) => requireAddress(recipient, "recipient"));
  const normalizedShares = resolvedShares.map((share) => {
    const value = Number(share);
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`Invalid BPS share: ${share}`);
    }
    totalBps += value;
    if (totalBps > MAX_BPS) {
      throw new Error("BPS shares exceed 10000");
    }
    return value;
  });

  return {
    taskId: onchainTaskId,
    recipients: normalizedRecipients,
    bpsShares: normalizedShares
  };
}

function defaultRecipients(evaluation, submission, workerAddress, validatorAddress) {
  const recipients = [workerAddress || evaluation.workerAddress || submission.workerAddress];
  const resolvedValidator = validatorAddress || evaluation.validatorAddress;
  if (resolvedValidator && resolvedValidator !== ZeroAddress && resolvedValidator !== "0xvalidator") {
    recipients.push(resolvedValidator);
  }
  return recipients;
}

function defaultBpsShares(evaluation, recipients) {
  if (recipients.length === 1) {
    return [MAX_BPS];
  }
  const validatorBps = Math.max(
    0,
    Math.min(1000, Math.round(1000 * Number(evaluation.validatorRewardMultiplier ?? 1)))
  );
  return [MAX_BPS - validatorBps, validatorBps];
}

function selectEvaluation(taskId, evaluationId) {
  const evaluations = listEvaluations(taskId);
  if (evaluations.length === 0) {
    throw new Error(`Task ${taskId} has no evaluation to settle`);
  }
  if (evaluationId) {
    const selected = evaluations.find((item) => item.id === Number(evaluationId));
    if (!selected) {
      throw new Error(`Evaluation ${evaluationId} not found for task ${taskId}`);
    }
    return selected;
  }
  return evaluations[evaluations.length - 1];
}

function selectSubmission(taskId, submissionId) {
  const submissions = listSubmissions(taskId);
  const selected = submissions.find((item) => item.id === Number(submissionId));
  if (!selected) {
    throw new Error(`Submission ${submissionId} not found for task ${taskId}`);
  }
  return selected;
}

function assertTaskExists(taskId) {
  const task = getTaskRecord(taskId);
  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }
  return task;
}

function clampScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

function normalizeOptionalAddress(value) {
  if (!value || value === "0xvalidator") {
    return ZeroAddress;
  }
  return requireAddress(value, "validator");
}

function requireAddress(value, label) {
  if (typeof value !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error(`Invalid ${label} address: ${value || "<empty>"}`);
  }
  return value;
}

function getContractConfigSummary() {
  const config = getContractConfig();
  return {
    network: config.network,
    chainId: config.chainId,
    contract: config.contract,
    address: config.address
  };
}
