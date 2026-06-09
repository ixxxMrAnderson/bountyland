/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AgentFlowDraft,
  StrategyQuestion,
  ZAiModelConfig,
  ZAiStrategyResponse
} from './types';

export const zAiModelConfig: ZAiModelConfig = {
  provider: 'z.ai',
  model: 'z.ai-spec-agent-mock-v0',
  mode: 'mock'
};

export async function callZAiModelMock<T>(label: string, payload: T): Promise<T> {
  // Framework placeholder: swap this function with the real z.ai API call later.
  console.info(`[z.ai mock] ${label}`, payload);
  return payload;
}

export async function requestZAiStrategyQuestions(
  draft: AgentFlowDraft,
  locale: 'en' | 'zh',
  phase: 'methodology' | 'strategy' = 'strategy'
): Promise<ZAiStrategyResponse> {
  try {
    const response = await fetch('/api/zai/agent-flow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        locale,
        phase,
        draft
      })
    });

    if (!response.ok) {
      throw new Error(`Z.AI bridge returned ${response.status}`);
    }

    return await response.json() as ZAiStrategyResponse;
  } catch (error) {
    return createLocalStrategyResponse(draft, locale, phase, error instanceof Error ? error.message : 'Unknown error');
  }
}

function createLocalStrategyResponse(
  draft: AgentFlowDraft,
  locale: 'en' | 'zh',
  phase: 'methodology' | 'strategy',
  error?: string
): ZAiStrategyResponse {
  const questions: StrategyQuestion[] = locale === 'zh'
    ? [
      {
        id: 'validator_access_strategy',
        question: '你希望 validator 越多越好，还是少而精？',
        whyItMatters: '这会决定 miner 产出的数据集是被更多人快速打分，还是只开放给高 reputation / 高 stake 的少数 validator。',
        criteriaCoverage: ['validator 准入规模', '格式检查与边界覆盖'],
        options: [
          {
            id: 'open_validator_swarm',
            label: 'validator 越多越好',
            description: '更快形成多人评分共识，适合公开数据集和更宽容的覆盖度审计。',
            criteriaBias: 'Boost broad coverage, diversity checks, and lower access friction.'
          },
          {
            id: 'curated_expert_validators',
            label: '少而精',
            description: '只有 reputation 和 stake 足够高的 validator 能看 miner 输出，适合高价值或敏感数据。',
            criteriaBias: 'Boost correctness, privacy, and stricter expert review.'
          }
        ]
      },
      {
        id: 'audit_strictness_strategy',
        question: '对于 miner 输出格式，你更想宽容小偏差，还是要求严格可解析？',
        whyItMatters: '宽容会减少好答案因格式小问题被拒；严格会让链上结算和 validator 复核更稳定。',
        criteriaCoverage: ['格式检查与边界覆盖'],
        options: [
          {
            id: 'tolerant_boundary_audit',
            label: '宽容审计',
            description: '允许轻微格式偏差，重点看边界 case 覆盖和样本多样性。',
            criteriaBias: 'Lower format penalties and emphasize boundary coverage.'
          },
          {
            id: 'strict_parser_audit',
            label: '严格可解析',
            description: 'JSONL/schema 必须稳定通过解析，便于自动 settlement。',
            criteriaBias: 'Raise format accuracy and parser compatibility weights.'
          }
        ]
      },
      {
        id: 'ai_human_scoring_mix',
        question: '你希望评分过程中 AI 参考分和人工 validator 判断各占多少？',
        whyItMatters: 'AI 可以提供一致的参考评分，人工 validator 更适合判断任务语境、异常样本和争议情况。',
        criteriaCoverage: ['AI + 人工共同评分'],
        options: [
          {
            id: 'ai_heavy_70_30',
            label: 'AI 70% / 人工 30%',
            description: '适合格式明确、样本量较大、希望快速一致评分的任务。',
            criteriaBias: 'Use AI reference score as the dominant component.'
          },
          {
            id: 'balanced_50_50',
            label: 'AI 50% / 人工 50%',
            description: '适合大多数数据集任务，在一致性和人工判断之间平衡。'
          },
          {
            id: 'human_heavy_30_70',
            label: 'AI 30% / 人工 70%',
            description: '适合高价值、主观性强或需要专家判断的输出。',
            criteriaBias: 'Human validators dominate the final score.'
          }
        ]
      },
      {
        id: 'threshold_refund_strategy',
        question: 'miner 提交低于共同评分阈值时，你希望通过线偏保守还是偏进取？',
        whyItMatters: 'miner 产出由 AI 参考评分和人工 validator 共同打分；如果所有提交都没过线，deposit 会大部分退回。',
        criteriaCoverage: draft.scoringCriteria.criteriaOptions.map((option) => option.name),
        options: [
          {
            id: 'protect_deposit_high_threshold',
            label: '保护 deposit',
            description: '把通过线设高一点，低质量 miner 输出更难获得 reward。',
            criteriaBias: 'Raise pass threshold and emphasize refund safety.'
          },
          {
            id: 'encourage_miner_iteration',
            label: '鼓励 miner',
            description: '通过线稍微灵活，适合探索型数据集任务。',
            criteriaBias: 'Keep threshold moderate and allow validator discretion.'
          }
        ]
      }
    ]
    : [
      {
        id: 'validator_access_strategy',
        question: 'Do you want more validators, or fewer high-trust validators?',
        whyItMatters: 'This controls whether miner outputs are graded by a broad crowd or only by high reputation / high stake validators.',
        criteriaCoverage: ['Strict correctness review', 'Tolerant syntax and boundary coverage audit'],
        options: [
          {
            id: 'open_validator_swarm',
            label: 'More validators',
            description: 'Faster multi-rater consensus for public datasets and broad coverage scoring.',
            criteriaBias: 'Boost broad coverage, diversity checks, and lower access friction.'
          },
          {
            id: 'curated_expert_validators',
            label: 'Fewer experts',
            description: 'Restrict output access to high reputation / high stake validators.',
            criteriaBias: 'Boost correctness, privacy, and stricter expert review.'
          }
        ]
      },
      {
        id: 'audit_strictness_strategy',
        question: 'Should tolerant syntax and boundary coverage audit be forgiving or parser-strict?',
        whyItMatters: 'A forgiving audit preserves useful answers with tiny format mistakes; a strict audit improves automatic settlement.',
        criteriaCoverage: ['Tolerant syntax and boundary coverage audit'],
        options: [
          {
            id: 'tolerant_boundary_audit',
            label: 'Forgiving',
            description: 'Allow minor format drift and emphasize boundary-case coverage.',
            criteriaBias: 'Lower format penalties and emphasize boundary coverage.'
          },
          {
            id: 'strict_parser_audit',
            label: 'Parser-strict',
            description: 'Require stable JSONL/schema parse before validators score content deeply.',
            criteriaBias: 'Raise format accuracy and parser compatibility weights.'
          }
        ]
      },
      {
        id: 'ai_human_scoring_mix',
        question: 'How should AI reference scoring and human validator judgment be weighted?',
        whyItMatters: 'AI provides consistent reference scoring, while human validators handle task context, unusual samples, and disputes.',
        criteriaCoverage: ['AI + human scoring mix'],
        options: [
          {
            id: 'ai_heavy_70_30',
            label: 'AI 70% / human 30%',
            description: 'Best for clearly formatted, high-volume tasks where consistent scoring matters.',
            criteriaBias: 'Use AI reference score as the dominant component.'
          },
          {
            id: 'balanced_50_50',
            label: 'AI 50% / human 50%',
            description: 'Balanced default for most dataset tasks.'
          },
          {
            id: 'human_heavy_30_70',
            label: 'AI 30% / human 70%',
            description: 'Best for high-value or expert judgment-heavy outputs.',
            criteriaBias: 'Human validators dominate the final score.'
          }
        ]
      },
      {
        id: 'threshold_refund_strategy',
        question: 'Should the combined-score threshold for miner submissions be conservative or exploratory?',
        whyItMatters: 'Miner outputs are scored by AI reference review plus human validators; if no submission passes, most of the deposit is refunded.',
        criteriaCoverage: draft.scoringCriteria.criteriaOptions.map((option) => option.name),
        options: [
          {
            id: 'protect_deposit_high_threshold',
            label: 'Protect deposit',
            description: 'Raise the pass line so low quality miner outputs rarely receive reward.',
            criteriaBias: 'Raise pass threshold and emphasize refund safety.'
          },
          {
            id: 'encourage_miner_iteration',
            label: 'Encourage miners',
            description: 'Keep the threshold more flexible for exploratory dataset tasks.',
            criteriaBias: 'Keep threshold moderate and allow validator discretion.'
          }
        ]
      }
    ];

  return {
    mode: 'mock',
    model: 'z.ai-spec-agent-mock-v0',
    scoringMethodology: {
      title: locale === 'zh' ? '金融多轮推理 QA 数据集验收打分方案' : 'Financial Multi-Step Reasoning QA Dataset Evaluation Plan',
      summary: locale === 'zh'
        ? '针对“500 个多轮演算法推导的金融商业推演逻辑基准问答数据集”，验收重点不是只看题目数量，而是检查每条 QA 是否具备可验证的金融情境、连续推理链、标准答案、难度标签和可用于大语言模型强化微调的结构化质量。'
        : 'For a 500-item financial business reasoning QA benchmark, validation should check not only item count, but whether each QA item has a verifiable financial scenario, multi-step reasoning chain, standard answer, difficulty tags, and structure suitable for LLM fine-tuning.',
      methodologySteps: [],
      scoringRubric: [
        {
          dimension: locale === 'zh' ? '内容正确性' : 'Content correctness',
          weight: 35,
          description: locale === 'zh'
            ? '抽样核对题目中的金融变量、利率、现金流、折现、杠杆、利润率、库存或商业假设是否自洽；人工 validator 复算标准答案，AI reference review 检查推理链中是否存在跳步、错误公式、单位混乱或与题干矛盾的结论。对每条样本至少检查 question、reasoning、answer 三者是否闭环。'
            : 'Sample-check financial variables, interest rates, cash flows, discounting, leverage, margins, inventory, or business assumptions for internal consistency. Human validators recalculate the standard answer while AI reference review flags skipped reasoning, wrong formulas, unit confusion, or contradictions between prompt and answer.'
        },
        {
          dimension: locale === 'zh' ? '推理链完整性' : 'Reasoning-chain completeness',
          weight: 25,
          description: locale === 'zh'
            ? '检查每条 QA 是否包含多轮或多步推导，而不是单步查表答案；推理链应明确列出关键中间量、计算顺序、商业约束和最终判断。validator 应标记“只有答案没有过程”“过程无法复现答案”“中间假设未说明”的样本。'
            : 'Check that each QA item contains multi-turn or multi-step derivation rather than a one-step lookup answer. The reasoning should expose intermediate values, calculation order, business constraints, and final judgment.'
        },
        {
          dimension: locale === 'zh' ? '覆盖度与多样性' : 'Coverage and diversity',
          weight: 25,
          description: locale === 'zh'
            ? '对 500 条样本做主题分布统计，确保覆盖定价、现金流、财务报表、市场进入、供应链、风险评估、贷款/清算、投资回报等多个商业推演场景；检测题面模板重复、数字替换式伪多样性和标签集中度过高的问题。'
            : 'Run topic distribution checks across the 500 samples to cover pricing, cash flow, financial statements, market entry, supply chain, risk, lending/liquidation, and ROI scenarios. Detect template repetition and superficial numeric substitutions.'
        },
        {
          dimension: locale === 'zh' ? '结构化可训练性' : 'Fine-tuning readiness',
          weight: 15,
          description: locale === 'zh'
            ? '检查 JSONL/schema 是否稳定，每条记录应包含 question、reasoning、answer、difficulty、topic/tag 等字段；字段为空、答案不可解析、difficulty 与题目复杂度明显不匹配、标签粒度混乱都应扣分。'
            : 'Check JSONL/schema stability. Each record should include question, reasoning, answer, difficulty, and topic/tag fields. Empty fields, unparseable answers, mismatched difficulty, or inconsistent tag granularity should be penalized.'
        }
      ],
      citations: [
        {
          label: 'JSON Lines',
          source: 'https://jsonlines.org/',
          reason: locale === 'zh' ? '用于说明 JSONL 数据集每行一条记录的可解析约束。' : 'Reference for one-record-per-line JSONL parseability.'
        },
        {
          label: 'BIG-bench / reasoning benchmark style',
          source: 'https://github.com/google/BIG-bench',
          reason: locale === 'zh' ? '用于参考复杂推理 benchmark 的任务结构、难度和多样性设计。' : 'Reference for task structure, difficulty, and diversity in reasoning benchmarks.'
        }
      ]
    },
    strategyQuestions: phase === 'strategy' ? questions : [],
    criteriaRefinements: draft.scoringCriteria.criteriaOptions.map((option) => ({
      criteriaId: option.id,
      suggestedChanges: [
        'Bind validator access policy to stake and reputation profile.',
        'Persist selected audit strictness inside finalOrderJson before Cobo Pact signing.',
        'Tie refund behavior to the combined validator threshold and miner pass rate.'
      ]
    })),
    agentReasoningSummary: locale === 'zh'
      ? phase === 'methodology'
        ? '本地 mock 已生成金融多轮推理 QA 数据集验收打分方案。'
        : '本地 mock 已生成 validator 规模、格式严格度、AI/人工评分占比、threshold/refund 四组高层策略问题。'
      : phase === 'methodology'
        ? 'Local mock generated the financial multi-step reasoning QA evaluation methodology.'
        : 'Local mock generated high-level strategy questions for validator scale, format strictness, AI/human scoring mix, and threshold/refund behavior.',
    error
  };
}
