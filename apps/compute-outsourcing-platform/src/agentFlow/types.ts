/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CriteriaOption } from '../types';

export interface ZAiModelConfig {
  provider: 'z.ai';
  model: string;
  mode: 'mock' | 'api';
}

export interface StrategyQuestionOption {
  id: string;
  label: string;
  description: string;
  criteriaBias?: string;
}

export interface StrategyQuestion {
  id: string;
  question: string;
  whyItMatters: string;
  options: StrategyQuestionOption[];
  criteriaCoverage: string[];
}

export interface CriteriaRefinement {
  criteriaId: string;
  suggestedChanges: string[];
}

export interface MethodologyCitation {
  label: string;
  source: string;
  reason: string;
}

export interface ScoringRubricItem {
  dimension: string;
  weight: number;
  description: string;
}

export interface ScoringMethodology {
  title: string;
  summary: string;
  methodologySteps: string[];
  scoringRubric: ScoringRubricItem[];
  citations: MethodologyCitation[];
}

export interface ZAiInferredSpec {
  taskInfo?: Partial<TaskInfoFields>;
  userRequirements?: Partial<UserRequirementFields>;
  scoringCriteria?: Partial<ScoringCriteriaJson>;
}

export interface ZAiStrategyResponse {
  mode: 'mock' | 'api';
  model: string;
  inferredSpec?: ZAiInferredSpec;
  scoringMethodology?: ScoringMethodology;
  strategyQuestions: StrategyQuestion[];
  criteriaRefinements: CriteriaRefinement[];
  agentReasoningSummary: string;
  error?: string;
}

export interface TaskInfoFields {
  taskId: string;
  creatorId: string;
  title: string;
  budgetEth: number;
  depositEth: number;
}

export interface UserRequirementFields {
  purpose: string;
  detailedRequirements: string[];
  outputFormat: string;
  newRequirements: string[];
  priority: 'purpose' | 'accuracy' | 'format' | 'budget' | 'diversity';
}

export interface ScoringCriteriaJson {
  contentAccuracy: {
    score: number;
    rules: string[];
  };
  formatAccuracy: {
    score: number;
    rules: string[];
  };
  aiThresholdLine: number;
  criteriaOptions: CriteriaOption[];
}

export interface AgentFlowTraceStep {
  id: string;
  agent: string;
  label: string;
  summary: string;
}

export interface AgentFlowDraft {
  model: ZAiModelConfig;
  rawUserInput: string;
  taskInfo: TaskInfoFields;
  userRequirements: UserRequirementFields;
  scoringCriteria: ScoringCriteriaJson;
  satisfaction: {
    userSatisfied: boolean;
    unsatisfiedPoints: string[];
  };
  finalOrderJson: {
    taskInfo: TaskInfoFields;
    userRequirements: UserRequirementFields;
    scoringData: ScoringCriteriaJson;
    settlementPolicy?: {
      eligibleMinerThreshold: number;
      minerRewardRanking: Array<{
        rank: number;
        rewardSharePercent: number;
        condition: string;
      }>;
      validatorRewardSharePercent: number;
      refundRule: string;
      scoringMix: string;
    };
    validatorStrategy?: {
      strategySelections: Record<string, string>;
      strategyQuestions: StrategyQuestion[];
      strategySummary: string;
    };
  };
  strategyResponse?: ZAiStrategyResponse;
  trace: AgentFlowTraceStep[];
}
