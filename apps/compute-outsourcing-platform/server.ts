/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import dotenv from 'dotenv';
import express from 'express';
import type {
  AgentFlowDraft,
  ScoringMethodology,
  StrategyQuestion,
  StrategyQuestionOption,
  ZAiInferredSpec,
  ZAiStrategyResponse
} from './src/agentFlow/types';

dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
const port = Number(process.env.API_PORT || 8789);

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  const apiKey = process.env.ZAI_API_KEY || '';
  res.json({
    ok: true,
    provider: 'z.ai',
    mode: apiKey ? 'api' : 'mock',
    apiKeyPresent: Boolean(apiKey),
    apiKeyId: apiKey.includes('.') ? apiKey.split('.')[0] : null,
    model: process.env.ZAI_MODEL || 'GLM-4.5-Air',
    apiBase: process.env.ZAI_API_BASE || 'https://api.z.ai/api/paas/v4'
  });
});

app.post('/api/zai/agent-flow', async (req, res) => {
  const { draft, locale = 'en', phase = 'strategy' } = req.body as {
    draft?: AgentFlowDraft;
    locale?: 'en' | 'zh';
    phase?: 'methodology' | 'strategy';
  };

  if (!draft) {
    res.status(400).json({ error: 'Missing draft payload.' });
    return;
  }

  if (!process.env.ZAI_API_KEY) {
    res.json(createFallbackStrategyResponse(draft, locale, phase, 'Missing ZAI_API_KEY; using local mock.'));
    return;
  }

  try {
    const result = await callOfficialZAi(draft, locale, phase);
    res.json(result);
  } catch (error) {
    res.json(createFallbackStrategyResponse(
      draft,
      locale,
      phase,
      error instanceof Error ? error.message : 'Unknown Z.AI bridge error.'
    ));
  }
});

app.listen(port, () => {
  console.log(`[z.ai bridge] listening on http://localhost:${port}`);
});

async function callOfficialZAi(
  draft: AgentFlowDraft,
  locale: 'en' | 'zh',
  phase: 'methodology' | 'strategy'
): Promise<ZAiStrategyResponse> {
  const model = process.env.ZAI_MODEL || 'GLM-4.5-Air';
  const apiBase = process.env.ZAI_API_BASE || 'https://api.z.ai/api/paas/v4';
  const endpoint = process.env.ZAI_API_ENDPOINT || `${apiBase.replace(/\/$/, '')}/chat/completions`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.ZAI_TIMEOUT_MS || 25000));

  const prompt = buildAgentPrompt(draft, locale, phase);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.ZAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    signal: controller.signal,
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are the Z.AI Spec Agent for an agent-audited compute outsourcing platform. Return JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.25,
      max_tokens: 1600,
      thinking: {
        type: 'disabled'
      }
    })
  }).finally(() => clearTimeout(timeout));

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Z.AI API ${response.status}: ${body.slice(0, 240)}`);
  }

  const payload = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Z.AI response did not include choices[0].message.content. Try GLM-4.5-Air or increase max_tokens.');
  }

  const parsed = parseJsonFromModel(content);
  return normalizeStrategyResponse(parsed, model, draft, locale, phase);
}

function buildAgentPrompt(
  draft: AgentFlowDraft,
  locale: 'en' | 'zh',
  phase: 'methodology' | 'strategy'
) {
  if (phase === 'methodology') {
    return JSON.stringify({
      phase,
      language: locale === 'zh' ? 'Chinese' : 'English',
      roleContext: 'User defines a compute/data outsourcing task. Miners are human/work nodes that produce and submit the dataset or task output. Validators score miner submissions through a combined AI reference review plus human validator review. You are the z.ai spec agent.',
      instruction: [
        'Use only userMessage as task input.',
        'Infer taskInfo, userRequirements, and scoringCriteria yourself.',
        'Produce a high-level scoringMethodology for evaluating miner task results. Focus on a weighted rubric. Each rubric item must explain how validators should detect or verify that dimension in practice.',
        'Do not include internal planning steps or chain-of-thought. Set methodologySteps to [] unless there are essential public audit notes.',
        'Do not ask strategy questions yet. The user must approve the methodology first.',
        'Return compact JSON only. No markdown.'
      ],
      returnShape: 'Return keys: mode, model, inferredSpec, scoringMethodology, agentReasoningSummary. scoringMethodology={title,summary,methodologySteps[],scoringRubric[{dimension,weight,description}],citations[{label,source,reason}]}. Prefer methodologySteps=[]. scoringRubric.description must contain detailed detection procedures. inferredSpec needs taskInfo{title,budgetEth,depositEth}, userRequirements{purpose,detailedRequirements,outputFormat,newRequirements,priority}, scoringCriteria{contentAccuracy{score,rules},formatAccuracy{score,rules},aiThresholdLine}.',
      userMessage: draft.rawUserInput
    });
  }

  return JSON.stringify({
    phase,
    language: locale === 'zh' ? 'Chinese' : 'English',
      roleContext: 'User defines a compute/data outsourcing task. Miners are human/work nodes that produce and submit the dataset or task output. Validators score miner submissions through a combined AI reference review plus human validator review. You are the z.ai spec agent.',
      instruction: [
        'The user has approved the scoringMethodology.',
      'Ask 4 high-level strategyQuestions for the user: validator scale, output format strictness, AI-vs-human scoring weight, and miner reward threshold/refund behavior.',
      'Do not describe the work as AI-generated data unless the user explicitly requested AI generation. Miner submissions are produced by miners; AI only helps validators score them.',
      'The threshold question must be about miner submissions failing the combined validator score threshold, not about AI output being below expectations.',
      'Return compact JSON only. No markdown.'
    ],
    returnShape: 'Return keys: mode, model, strategyQuestions, criteriaRefinements, agentReasoningSummary. Each strategyQuestion needs id, question, whyItMatters, criteriaCoverage, options[{id,label,description,criteriaBias}].',
    acceptedScoringMethodology: draft.strategyResponse?.scoringMethodology,
    userMessage: draft.rawUserInput
  });
}

function parseJsonFromModel(content: string) {
  const trimmed = content.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fenceMatch?.[1] || trimmed;
  const firstBrace = jsonText.indexOf('{');
  const lastBrace = jsonText.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error('Z.AI response was not JSON.');
  }

  return JSON.parse(jsonText.slice(firstBrace, lastBrace + 1));
}

function normalizeStrategyResponse(
  parsed: Partial<ZAiStrategyResponse>,
  model: string,
  draft: AgentFlowDraft,
  locale: 'en' | 'zh',
  phase: 'methodology' | 'strategy'
): ZAiStrategyResponse {
  const fallback = createFallbackStrategyResponse(draft, locale, phase);
  const strategyQuestions = Array.isArray(parsed.strategyQuestions)
    ? parsed.strategyQuestions.map((question, index) => normalizeStrategyQuestion(question, index))
      .filter((question): question is StrategyQuestion => Boolean(question))
      .slice(0, 4)
    : [];

  return {
    mode: 'api',
    model: parsed.model || model,
    inferredSpec: normalizeInferredSpec(parsed.inferredSpec) || draft.strategyResponse?.inferredSpec,
    scoringMethodology: normalizeScoringMethodology(parsed.scoringMethodology) || draft.strategyResponse?.scoringMethodology || fallback.scoringMethodology,
    strategyQuestions: phase === 'strategy'
      ? (strategyQuestions.length ? strategyQuestions : fallback.strategyQuestions)
      : [],
    criteriaRefinements: Array.isArray(parsed.criteriaRefinements)
      ? parsed.criteriaRefinements
      : fallback.criteriaRefinements,
    agentReasoningSummary: parsed.agentReasoningSummary || fallback.agentReasoningSummary
  };
}

function normalizeScoringMethodology(methodology: unknown): ScoringMethodology | undefined {
  if (!methodology || typeof methodology !== 'object') return undefined;
  const candidate = methodology as Partial<ScoringMethodology>;

  return {
    title: candidate.title || 'Evaluation methodology',
    summary: candidate.summary || '',
    methodologySteps: Array.isArray(candidate.methodologySteps)
      ? candidate.methodologySteps.map(String).slice(0, 5)
      : [],
    scoringRubric: Array.isArray(candidate.scoringRubric)
      ? candidate.scoringRubric.map((item, index) => ({
        dimension: item.dimension || `Dimension ${index + 1}`,
        weight: Number(item.weight) || 0,
        description: item.description || ''
      })).slice(0, 5)
      : [],
    citations: Array.isArray(candidate.citations)
      ? candidate.citations.map((citation, index) => ({
        label: citation.label || `Reference ${index + 1}`,
        source: citation.source || '',
        reason: citation.reason || ''
      })).slice(0, 4)
      : []
  };
}

function normalizeInferredSpec(inferredSpec: unknown): ZAiInferredSpec | undefined {
  if (!inferredSpec || typeof inferredSpec !== 'object') return undefined;
  const candidate = inferredSpec as ZAiInferredSpec;
  const rawThreshold = candidate.scoringCriteria?.aiThresholdLine;
  const normalizedThreshold = typeof rawThreshold === 'number' && rawThreshold > 0 && rawThreshold <= 1
    ? Math.round(rawThreshold * 100)
    : rawThreshold;

  return {
    taskInfo: candidate.taskInfo,
    userRequirements: candidate.userRequirements,
    scoringCriteria: candidate.scoringCriteria
      ? {
        ...candidate.scoringCriteria,
        aiThresholdLine: normalizedThreshold
      }
      : undefined
  };
}

function normalizeStrategyQuestion(question: unknown, index: number): StrategyQuestion | null {
  if (!question || typeof question !== 'object') return null;
  const candidate = question as Partial<StrategyQuestion>;
  if (!candidate.question) return null;
  const options = Array.isArray(candidate.options)
    ? candidate.options
      .map((option, optionIndex) => {
        const candidateOption = (option || {}) as Partial<StrategyQuestionOption>;
        return {
          id: candidateOption.id || `option_${optionIndex + 1}`,
          label: candidateOption.label || `Option ${optionIndex + 1}`,
          description: candidateOption.description || '',
          criteriaBias: candidateOption.criteriaBias || ''
        };
      })
      .slice(0, 3)
    : [];

  return {
    id: candidate.id || `strategy_question_${index + 1}`,
    question: candidate.question,
    whyItMatters: candidate.whyItMatters || '',
    criteriaCoverage: Array.isArray(candidate.criteriaCoverage)
      ? candidate.criteriaCoverage
      : [],
    options: options.length
      ? options
      : [
        {
          id: 'default_accept',
          label: 'Accept',
          description: '',
          criteriaBias: ''
        }
      ]
  };
}

function createFallbackStrategyResponse(
  draft: AgentFlowDraft,
  locale: 'en' | 'zh',
  phase: 'methodology' | 'strategy' = 'strategy',
  error?: string
): ZAiStrategyResponse {
  const zh = locale === 'zh';
  const questions: StrategyQuestion[] = [
    {
      id: 'validator_access_strategy',
      question: zh ? '你希望 validator 越多越好，还是少而精？' : 'Do you want more validators, or fewer high-trust validators?',
      whyItMatters: zh
        ? '这会决定 miner 产出的数据集是被更多人快速打分，还是只开放给高 reputation / 高 stake 的少数 validator。'
        : 'This controls whether miner outputs are graded by a broad crowd or only by high reputation / high stake validators.',
      criteriaCoverage: zh
        ? ['validator 准入规模', '格式检查与边界覆盖']
        : ['Strict correctness review', 'Tolerant syntax and boundary coverage audit'],
      options: [
        {
          id: 'open_validator_swarm',
          label: zh ? 'validator 越多越好' : 'More validators',
          description: zh
            ? '更快形成多人评分共识，适合公开数据集和更宽容的覆盖度审计。'
            : 'Faster multi-rater consensus for public datasets and broad coverage scoring.',
          criteriaBias: 'Boost broad coverage, diversity checks, and lower access friction.'
        },
        {
          id: 'curated_expert_validators',
          label: zh ? '少而精' : 'Fewer experts',
          description: zh
            ? '只有 reputation 和 stake 足够高的 validator 能看 miner 输出，适合高价值或敏感数据。'
            : 'Restrict output access to high reputation / high stake validators.',
          criteriaBias: 'Boost correctness, privacy, and stricter expert review.'
        }
      ]
    },
    {
      id: 'audit_strictness_strategy',
      question: zh
        ? '对于 miner 输出格式，你更想宽容小偏差，还是要求严格可解析？'
        : 'Should tolerant syntax and boundary coverage audit be forgiving or parser-strict?',
      whyItMatters: zh
        ? '宽容会减少好答案因格式小问题被拒；严格会让链上结算和 validator 复核更稳定。'
        : 'A forgiving audit preserves useful answers with tiny format mistakes; a strict audit improves automatic settlement.',
      criteriaCoverage: zh ? ['格式检查与边界覆盖'] : ['Output format strictness and boundary coverage'],
      options: [
        {
          id: 'tolerant_boundary_audit',
          label: zh ? '宽容审计' : 'Forgiving',
          description: zh
            ? '允许轻微格式偏差，重点看边界 case 覆盖和样本多样性。'
            : 'Allow minor format drift and emphasize boundary-case coverage.',
          criteriaBias: 'Lower format penalties and emphasize boundary coverage.'
        },
        {
          id: 'strict_parser_audit',
          label: zh ? '严格可解析' : 'Parser-strict',
          description: zh
            ? 'JSONL/schema 必须稳定通过解析，便于自动 settlement。'
            : 'Require stable JSONL/schema parse before validators score content deeply.',
          criteriaBias: 'Raise format accuracy and parser compatibility weights.'
        }
      ]
    },
    {
      id: 'ai_human_scoring_mix',
      question: zh ? '你希望评分过程中 AI 参考分和人工 validator 判断各占多少？' : 'How should AI reference scoring and human validator judgment be weighted?',
      whyItMatters: zh
        ? 'AI 可以提供一致的参考评分，人工 validator 更适合判断任务语境、异常样本和争议情况。'
        : 'AI provides consistent reference scoring, while human validators handle task context, unusual samples, and disputes.',
      criteriaCoverage: zh ? ['AI + 人工共同评分'] : ['AI + human scoring mix'],
      options: [
        {
          id: 'ai_heavy_70_30',
          label: zh ? 'AI 70% / 人工 30%' : 'AI 70% / human 30%',
          description: zh
            ? '适合格式明确、样本量较大、希望快速一致评分的任务。'
            : 'Best for clearly formatted, high-volume tasks where consistent scoring matters.',
          criteriaBias: 'Use AI reference score as the dominant component.'
        },
        {
          id: 'balanced_50_50',
          label: zh ? 'AI 50% / 人工 50%' : 'AI 50% / human 50%',
          description: zh
            ? '适合大多数数据集任务，在一致性和人工判断之间平衡。'
            : 'Balanced default for most dataset tasks.'
        },
        {
          id: 'human_heavy_30_70',
          label: zh ? 'AI 30% / 人工 70%' : 'AI 30% / human 70%',
          description: zh
            ? '适合高价值、主观性强或需要专家判断的输出。'
            : 'Best for high-value or expert judgment-heavy outputs.',
          criteriaBias: 'Human validators dominate the final score.'
        }
      ]
    },
    {
      id: 'threshold_refund_strategy',
      question: zh ? 'miner 提交低于共同评分阈值时，你希望通过线偏保守还是偏进取？' : 'Should the combined-score threshold for miner submissions be conservative or exploratory?',
      whyItMatters: zh
        ? 'miner 产出由 AI 参考评分和人工 validator 共同打分；如果所有提交都没过线，deposit 会大部分退回。'
        : 'Miner outputs are scored by AI reference review plus human validators; if no submission passes, most of the deposit is refunded.',
      criteriaCoverage: draft.scoringCriteria.criteriaOptions.map((option) => option.name),
      options: [
        {
          id: 'protect_deposit_high_threshold',
          label: zh ? '保护 deposit' : 'Protect deposit',
          description: zh
            ? '把通过线设高一点，低质量 miner 输出更难获得 reward。'
            : 'Raise the pass line so low quality miner outputs rarely receive reward.',
          criteriaBias: 'Raise pass threshold and emphasize refund safety.'
        },
        {
          id: 'encourage_miner_iteration',
          label: zh ? '鼓励 miner' : 'Encourage miners',
          description: zh
            ? '通过线稍微灵活，适合探索型数据集任务。'
            : 'Keep the threshold more flexible for exploratory dataset tasks.',
          criteriaBias: 'Keep threshold moderate and allow validator discretion.'
        }
      ]
    }
  ];

  return {
    mode: 'mock',
    model: 'z.ai-spec-agent-mock-v0',
    scoringMethodology: {
      title: zh ? '金融多轮推理 QA 数据集验收打分方案' : 'Financial Multi-Step Reasoning QA Dataset Evaluation Plan',
      summary: zh
        ? '针对“500 个多轮演算法推导的金融商业推演逻辑基准问答数据集”，验收重点不是只看题目数量，而是检查每条 QA 是否具备可验证的金融情境、连续推理链、标准答案、难度标签和可用于大语言模型强化微调的结构化质量。'
        : 'For a 500-item financial business reasoning QA benchmark, validation should check not only item count, but whether each QA item has a verifiable financial scenario, multi-step reasoning chain, standard answer, difficulty tags, and structure suitable for LLM fine-tuning.',
      methodologySteps: [],
      scoringRubric: [
        {
          dimension: zh ? '内容正确性' : 'Content correctness',
          weight: 35,
          description: zh
            ? '抽样核对题目中的金融变量、利率、现金流、折现、杠杆、利润率、库存或商业假设是否自洽；人工 validator 复算标准答案，AI reference review 检查推理链中是否存在跳步、错误公式、单位混乱或与题干矛盾的结论。对每条样本至少检查 question、reasoning、answer 三者是否闭环。'
            : 'Sample-check financial variables, interest rates, cash flows, discounting, leverage, margins, inventory, or business assumptions for internal consistency. Human validators recalculate the standard answer while AI reference review flags skipped reasoning, wrong formulas, unit confusion, or contradictions between prompt and answer.'
        },
        {
          dimension: zh ? '推理链完整性' : 'Reasoning-chain completeness',
          weight: 25,
          description: zh
            ? '检查每条 QA 是否包含多轮或多步推导，而不是单步查表答案；推理链应明确列出关键中间量、计算顺序、商业约束和最终判断。validator 应标记“只有答案没有过程”“过程无法复现答案”“中间假设未说明”的样本。'
            : 'Check that each QA item contains multi-turn or multi-step derivation rather than a one-step lookup answer. The reasoning should expose intermediate values, calculation order, business constraints, and final judgment.'
        },
        {
          dimension: zh ? '覆盖度与多样性' : 'Coverage and diversity',
          weight: 25,
          description: zh
            ? '对 500 条样本做主题分布统计，确保覆盖定价、现金流、财务报表、市场进入、供应链、风险评估、贷款/清算、投资回报等多个商业推演场景；检测题面模板重复、数字替换式伪多样性和标签集中度过高的问题。'
            : 'Run topic distribution checks across the 500 samples to cover pricing, cash flow, financial statements, market entry, supply chain, risk, lending/liquidation, and ROI scenarios. Detect template repetition and superficial numeric substitutions.'
        },
        {
          dimension: zh ? '结构化可训练性' : 'Fine-tuning readiness',
          weight: 15,
          description: zh
            ? '检查 JSONL/schema 是否稳定，每条记录应包含 question、reasoning、answer、difficulty、topic/tag 等字段；字段为空、答案不可解析、difficulty 与题目复杂度明显不匹配、标签粒度混乱都应扣分。'
            : 'Check JSONL/schema stability. Each record should include question, reasoning, answer, difficulty, and topic/tag fields. Empty fields, unparseable answers, mismatched difficulty, or inconsistent tag granularity should be penalized.'
        }
      ],
      citations: [
        {
          label: 'JSON Lines',
          source: 'https://jsonlines.org/',
          reason: zh ? '用于说明 JSONL 数据集每行一条记录的可解析约束。' : 'Reference for one-record-per-line JSONL parseability.'
        },
        {
          label: 'BIG-bench / reasoning benchmark style',
          source: 'https://github.com/google/BIG-bench',
          reason: zh ? '用于参考复杂推理 benchmark 的任务结构、难度和多样性设计。' : 'Reference for task structure, difficulty, and diversity in reasoning benchmarks.'
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
    agentReasoningSummary: zh
      ? phase === 'methodology'
        ? `Z.AI 官方 API 暂时未返回可解析结果，已用本地 fallback 生成金融多轮推理 QA 数据集验收打分方案。${error ? `原因：${error}` : ''}`
        : `Z.AI 官方 API 暂时未返回可解析结果，已用本地 fallback 生成 validator 规模、格式严格度、AI/人工评分占比、threshold/refund 四组策略问题。${error ? `原因：${error}` : ''}`
      : phase === 'methodology'
        ? `Z.AI official API did not return a parseable result, so local fallback generated the financial multi-step reasoning QA evaluation methodology.${error ? ` Reason: ${error}` : ''}`
        : `Z.AI official API did not return a parseable result, so local fallback generated validator scale, format strictness, AI/human scoring mix, and threshold/refund strategy questions.${error ? ` Reason: ${error}` : ''}`,
    error
  };
}
