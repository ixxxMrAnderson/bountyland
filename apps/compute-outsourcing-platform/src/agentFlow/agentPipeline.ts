/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getCriteriaOptionsForTask, generateHash } from '../mockData';
import { CriteriaOption } from '../types';
import {
  AgentFlowDraft,
  ScoringCriteriaJson,
  TaskInfoFields,
  UserRequirementFields,
  ZAiStrategyResponse
} from './types';
import { callZAiModelMock, zAiModelConfig } from './zaiModel';

export async function runInitialAgentFlow(rawUserInput: string): Promise<AgentFlowDraft> {
  const taskInfo = await callZAiModelMock('extract_task_info_fields', extractTaskInfo(rawUserInput));
  const userRequirements = await callZAiModelMock(
    'decompose_user_requirements',
    decomposeUserRequirements(rawUserInput)
  );
  const scoringCriteria = await callZAiModelMock(
    'build_validator_scoring_json',
    buildScoringCriteria(rawUserInput)
  );

  const satisfaction = await callZAiModelMock('analyze_user_satisfaction', {
    userSatisfied: false,
    unsatisfiedPoints: ['Waiting for user to select or revise validator criteria.']
  });

  const finalOrderJson = composeFinalOrder(taskInfo, userRequirements, scoringCriteria);

  return {
    model: zAiModelConfig,
    rawUserInput,
    taskInfo,
    userRequirements,
    scoringCriteria,
    satisfaction,
    finalOrderJson,
    trace: [
      {
        id: 'task-info',
        agent: 'z.ai Spec Agent',
        label: '任务信息字段',
        summary: `Created task id ${taskInfo.taskId}, budget ${taskInfo.budgetEth} ETH.`
      },
      {
        id: 'requirements',
        agent: 'z.ai Requirement Agent',
        label: '用户需求拆解',
        summary: `Purpose: ${userRequirements.purpose}; output format: ${userRequirements.outputFormat}.`
      },
      {
        id: 'criteria',
        agent: 'z.ai Criteria Agent',
        label: '评判标准 JSON',
        summary: `Generated ${scoringCriteria.criteriaOptions.length} criteria options with threshold ${scoringCriteria.aiThresholdLine}.`
      }
    ]
  };
}

export function finalizeAgentFlowWithCriteria(
  draft: AgentFlowDraft,
  selectedCriteria: CriteriaOption,
  strategySelections: Record<string, string> = {},
  strategyResponse?: ZAiStrategyResponse
): AgentFlowDraft {
  const scoringCriteria: ScoringCriteriaJson = {
    ...draft.scoringCriteria,
    criteriaOptions: [selectedCriteria],
    aiThresholdLine: selectedCriteria.id.includes('correctness') || selectedCriteria.id.includes('reasoning')
      ? 80
      : 72
  };

  return {
    ...draft,
    scoringCriteria,
    satisfaction: {
      userSatisfied: true,
      unsatisfiedPoints: []
    },
    finalOrderJson: composeFinalOrder(
      draft.taskInfo,
      draft.userRequirements,
      scoringCriteria,
      strategySelections,
      strategyResponse || draft.strategyResponse
    ),
    strategyResponse: strategyResponse || draft.strategyResponse,
    trace: [
      ...draft.trace,
      {
        id: 'user-confirmed',
        agent: 'z.ai Satisfaction Agent',
        label: '用户确认',
        summary: `User selected ${selectedCriteria.name}; final JSON is ready for Cobo Pact.`
      }
    ]
  };
}

function extractTaskInfo(rawUserInput: string): TaskInfoFields {
  const budgetMatch = rawUserInput.match(/(\d+(?:\.\d+)?)\s*(eth|ETH)/);
  const countMatch = rawUserInput.match(/(\d+)\s*(个|条|records|items|cases)/i);
  const count = countMatch ? Number(countMatch[1]) : undefined;

  return {
    taskId: `task-${generateHash('').slice(0, 8)}`,
    creatorId: 'mock-user-zai-demo',
    title: inferTitle(rawUserInput, count),
    budgetEth: budgetMatch ? Number(budgetMatch[1]) : 0,
    depositEth: budgetMatch ? Number(budgetMatch[1]) : 0
  };
}

function decomposeUserRequirements(rawUserInput: string): UserRequirementFields {
  const lower = rawUserInput.toLowerCase();
  const isDataset = lower.includes('dataset') || rawUserInput.includes('数据集');
  const isAudit = lower.includes('audit') || lower.includes('security') || rawUserInput.includes('审计');
  const isOcr = lower.includes('ocr') || lower.includes('translation') || rawUserInput.includes('翻译');

  return {
    purpose: isAudit
      ? 'Outsource security analysis work and receive verifiable audit artifacts.'
      : isOcr
        ? 'Outsource text extraction or semantic processing work.'
        : 'Outsource high-quality AI dataset generation for model training or evaluation.',
    detailedRequirements: [
      rawUserInput,
      'Miner must submit structured output matching the requested schema.',
      'Validator must score completion with explicit checklist evidence.'
    ],
    outputFormat: isDataset ? 'JSONL' : isAudit ? 'Markdown report' : 'Structured text',
    newRequirements: [
      'Return taskURI, orderURI, and criteriaHash after confirmation.',
      'Use Cobo mock approval before activating the task.',
      'Use AI threshold line for refund and settlement logic.'
    ],
    priority: isDataset ? 'diversity' : isAudit ? 'accuracy' : 'purpose'
  };
}

function buildScoringCriteria(rawUserInput: string): ScoringCriteriaJson {
  const criteriaOptions = getCriteriaOptionsForTask(rawUserInput);
  const formatRules = criteriaOptions.flatMap((option) => option.checklist).slice(0, 4);

  return {
    contentAccuracy: {
      score: 60,
      rules: [
        'Check whether the miner output directly satisfies the user purpose.',
        'Score factual correctness, reasoning validity, and completeness.',
        'Penalize placeholder or duplicated output.'
      ]
    },
    formatAccuracy: {
      score: 40,
      rules: formatRules.length
        ? formatRules
        : ['Check output schema, required fields, and parser compatibility.']
    },
    aiThresholdLine: 72,
    criteriaOptions
  };
}

function composeFinalOrder(
  taskInfo: TaskInfoFields,
  userRequirements: UserRequirementFields,
  scoringCriteria: ScoringCriteriaJson,
  strategySelections?: Record<string, string>,
  strategyResponse?: ZAiStrategyResponse
) {
  return {
    taskInfo,
    userRequirements,
    scoringData: scoringCriteria,
    settlementPolicy: {
      eligibleMinerThreshold: scoringCriteria.aiThresholdLine,
      minerRewardRanking: [
        {
          rank: 1,
          rewardSharePercent: 60,
          condition: 'Highest final AI + human validator score among submissions above threshold.'
        },
        {
          rank: 2,
          rewardSharePercent: 25,
          condition: 'Second-highest final score above threshold.'
        },
        {
          rank: 3,
          rewardSharePercent: 10,
          condition: 'Third-highest final score above threshold.'
        }
      ],
      validatorRewardSharePercent: 5,
      refundRule: 'If no miner submission reaches the eligible threshold, most of the user deposit is refundable after validator review.',
      scoringMix: 'Final score combines AI reference scoring and human validator review. Exact AI/human weighting follows the selected validator strategy.'
    },
    ...(strategySelections && Object.keys(strategySelections).length > 0 && strategyResponse
      ? {
        validatorStrategy: {
          strategySelections,
          strategyQuestions: strategyResponse.strategyQuestions,
          strategySummary: strategyResponse.agentReasoningSummary
        }
      }
      : {})
  };
}

function inferTitle(rawUserInput: string, count?: number) {
  const lower = rawUserInput.toLowerCase();
  if (lower.includes('contract') || rawUserInput.includes('合约')) {
    return count ? `Smart Contract Audit Dataset (${count})` : 'Smart Contract Audit Task';
  }
  if (lower.includes('finance') || rawUserInput.includes('金融')) {
    return count ? `Financial Reasoning QA Dataset (${count})` : 'Financial Reasoning Task';
  }
  if (lower.includes('ocr') || rawUserInput.includes('翻译')) {
    return 'OCR / Translation Processing Task';
  }
  return count ? `Reasoning QA Dataset (${count})` : 'Reasoning QA Dataset Task';
}
