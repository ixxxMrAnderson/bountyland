/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Award, FileCode, Lightbulb, Send } from 'lucide-react';
import { Task } from '../types';
import { generateHash } from '../mockData';
import { useTranslation } from '../locales';

interface MinerPanelProps {
  task: Task;
  onClose: () => void;
  onSubmitOutput: (content: string, outputURI: string, outputHash: string) => void;
}

export const MinerPanel: React.FC<MinerPanelProps> = ({
  task,
  onClose,
  onSubmitOutput
}) => {
  const { t, locale } = useTranslation();
  const [content, setContent] = useState('');
  const [outputURI, setOutputURI] = useState('');
  const [outputHash, setOutputHash] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-generate a dummy IPFS hash when the user starts typing to make the DApp feel alive
  const handleContentChange = (val: string) => {
    setContent(val);
    if (val.trim() && !outputURI) {
      setOutputURI(`ipfs://Qm${generateHash('sub_')}`);
      setOutputHash(generateHash('0x'));
    } else if (!val.trim()) {
      setOutputURI('');
      setOutputHash('');
    }
  };

  const handleAutofill = (type: 'high' | 'poor') => {
    if (type === 'high') {
      if (locale === 'zh') {
        const sample = `{\n  "question": "如果在剧烈清算状态下，通过 Aave V3 借取了 10M USDT 的闪电贷用以清算 Compound 上清算阈值为 120% 的 Vault 仓位，清算者的清算激励是如何分配与套利的？",\n  "step_by_step_reasoning": "1. 结算节点从 Aave V3 借得 10M USDT 闪电贷。\\n2. 清算执行发起，调用 Compound 爆仓强平业务。\\n3. 代偿其中 5M USDT 债务（Comp 清算额上限为 50%）。\\n4. 清算并回收质押品（如 WBTC），得到 8% 的额外清算红利（折算相当于 5.4M USDT）。\\n5. 在 Uniswap 协议上把所得 WBTC 兑换为 USDT 结算，获得 5.4M USDT。\\n6. 抵扣本金与闪电贷息差成本 5.05M USDT（闪电贷手续费为 0.05%）。\\n7. 此次套利活动锁定净利润 = 5.4M - 5.05M = 0.35M USDT。",\n  "standard_answer": "闪电贷顺畅跑通。不良债务成功部分清算。清算者总套利 0.35M USDT 精华溢价。",\n  "difficulty_rating": "Hard",\n  "tag_taxonomy": "flashloan, liquidation-math, multi-hop-arbitrage"\n}`;
        setContent(sample);
        setOutputURI('ipfs://QmHighQualityAuditSubmissionVerified');
        setOutputHash('0x7ca18b0100d023a992ffedbaccbaaeef0c85191a03');
      } else {
        const sample = `{\n  "question": "What happens if a flash loan of 10M USDT is taken from Aave V3 to liquidate a Vault with 120% target ratio on Compound, and how does liquidator incentive play out?",\n  "step_by_step_reasoning": "1. Liquidator borrows 10M USDT flash loan from Aave V3.\\n2. Liquidator calls Compound liquidation method against Vault.\\n3. Repays 5M USDT of bad debt ( Compound close factor limit is 50% ).\\n4. Liquidator receives equivalent collateral in underlying variable assets (e.g. WBTC) + 8% liquidator incentive bonus (= 5.4M USDT value in WBTC).\\n5. Liquidator swaps WBTC back to USDT on Uniswap, receives 5.4M USDT.\\n6. Repays 5.05M USDT (including flash loan fee of 0.05% ) to Aave.\\n7. Net profit = 5.4M - 5.05M = 0.35M USDT.",\n  "standard_answer": "Flash loan completes. Bad loan is partially liquidated. Liquidator collects 0.35M Net USDT profit.",\n  "difficulty_rating": "Hard",\n  "tag_taxonomy": "flashloan, liquidation-math, multi-hop-arbitrage"\n}`;
        setContent(sample);
        setOutputURI('ipfs://QmHighQualityAuditSubmissionVerified');
        setOutputHash('0x7ca18b0100d023a992ffedbaccbaaeef0c85191a03');
      }
    } else {
      if (locale === 'zh') {
        const sample = `{\n  "question": "什么是闪电贷？",\n  "step_by_step_reasoning": "闪电贷也就是在同一个以太坊区块交易群中借出并一次还清的简单功能。很简单，很易懂，做好了。",\n  "standard_answer": "同一区块中借出与还清的小额闪速借贷",\n  "difficulty_rating": "Easy",\n  "tag_taxonomy": "general-text"\n}`;
        setContent(sample);
        setOutputURI('ipfs://QmLowQualitySybilSubmission');
        setOutputHash('0x3344bfccaa9112001bbcfadea92edaffec403321');
      } else {
        const sample = `{\n  "question": "what is flash loans?",\n  "step_by_step_reasoning": "A flash loan is a loan that you borrow and pay back in the same block. It is quick. Done.",\n  "standard_answer": "Quick sameday block lending",\n  "difficulty_rating": "Easy",\n  "tag_taxonomy": "general-text"\n}`;
        setContent(sample);
        setOutputURI('ipfs://QmLowQualitySybilSubmission');
        setOutputHash('0x3344bfccaa9112001bbcfadea92edaffec403321');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      onSubmitOutput(
        content, 
        outputURI || `ipfs://Qm${generateHash('sub_')}`, 
        outputHash || generateHash('0x')
      );
      setIsSubmitting(false);
    }, 1200);
  };

  let displayTitle = task.title;
  let displayDescription = task.description;
  if (locale === 'zh') {
    if (task.title.includes('Decentralized Outsourcing Task #')) {
      displayTitle = task.title.replace('Decentralized Outsourcing Task #', '去中心化外包算力计算订单 #');
    }
    if (task.description.startsWith('Natural language query defined:')) {
      displayDescription = task.description
        .replace('Natural language query defined:', '创建任务时的自然语言需求陈词:')
        .replace('Parameters mapped securely using selected criteria. Ready for miners and validators to process outputs.', '参数已按所选验收指标安全锚定，现已就绪。');
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col relative overflow-hidden animate-fade-in shadow-2xl">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-brand-indigo"></div>

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-850 p-5 mt-1.5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <FileCode className="w-4 h-4 text-brand-indigo" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-white">{t('minerConsole')}</h2>
              <p className="text-xs text-slate-400">{t('idLabel')} {displayTitle}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center border border-slate-700 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Workspace Container split layout */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-850">
          
          {/* Left panel: Computation Task specifications */}
          <div className="w-full md:w-1/2 p-6 overflow-y-auto space-y-5">
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">{t('payoutIncentive')}</span>
              <div className="flex items-center gap-1.5 mt-1">
                <Award className="w-5 h-5 text-amber-400" />
                <span className="font-mono text-xl font-bold text-white">{task.rewardPool.toFixed(3)} ETH</span>
                <span className="text-xs text-slate-400">{t('payoutScoreAdjusted')}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs uppercase font-mono font-bold tracking-wider text-slate-400">{t('requiredFormat')}</h4>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 flex justify-between items-center text-xs">
                <span className="text-slate-400">{t('parserTarget')}</span>
                <span className="font-mono bg-brand-cyan/10 text-brand-cyan px-2 py-0.5 rounded font-bold border border-brand-cyan/20">
                  {task.outputFormat}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs uppercase font-mono font-bold tracking-wider text-slate-400">{t('computationInstructions')}</h4>
              <div className="text-xs text-slate-300 bg-slate-950/60 leading-relaxed border border-slate-850 p-4 rounded-xl space-y-2 max-h-48 overflow-y-auto">
                <p className="font-medium text-slate-200">{t('outlineLabel')}</p>
                <p className="text-slate-400">{displayDescription}</p>
              </div>
            </div>

            {task.selectedCriteriaOption && (
              <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-850">
                <h4 className="text-xs uppercase font-mono font-bold tracking-wider text-brand-indigo">{t('targetRubric')}</h4>
                <div className="space-y-2 text-xs">
                  <div className="font-semibold text-slate-300">{task.selectedCriteriaOption.name}</div>
                  <p className="text-[11px] text-slate-505 leading-relaxed">{task.selectedCriteriaOption.description}</p>
                  
                  <div className="text-[10px] uppercase font-semibold text-slate-500 pt-1">{locale === 'en' ? 'Weight distribution:' : '指标比例明细：'}</div>
                  <div className="space-y-1">
                    {task.selectedCriteriaOption.scoringDimensions.map((dim, idx) => {
                      let dimName = dim.name;
                      if (locale === 'zh') {
                        dimName = dimName
                          .replace('Completeness & Schema accuracy', '完备性与 Schema 解析精度')
                          .replace('Edge Case Handling Coverage', '边缘场景覆盖率')
                          .replace('Logical consistency / Code correctness', '逻辑连贯性与代码正确性')
                          .replace('Format constraints match', '目标数据格式约束契合度')
                          .replace('Chain soundness & execution safety', '调用链安全与执行沙盒抗性')
                          .replace('Rubric specific checklist items', '专有考核内容契合度');
                      }
                      return (
                        <div key={idx} className="flex justify-between text-[11px] font-mono">
                          <span className="text-slate-400">{dimName}</span>
                          <span className="font-bold text-brand-indigo">{dim.weight}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right panel: Editor & submission engine */}
          <div className="w-full md:w-1/2 p-6 overflow-y-auto h-full flex flex-col justify-between">
            <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col justify-between">
              
              <div className="space-y-3 flex-1 flex flex-col">
                <div className="flex justify-between items-center">
                  <label className="text-xs uppercase font-mono font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    {t('computationField')}
                  </label>
                  {/* Autofill Toolbar */}
                  <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-850 gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleAutofill('high')}
                      className="text-[9px] font-semibold font-mono text-slate-400 hover:text-white px-2 py-1 hover:bg-slate-900 rounded select-none transition cursor-pointer"
                    >
                      {t('highQualityDemoBtn')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAutofill('poor')}
                      className="text-[9px] font-semibold font-mono text-slate-400 hover:text-white px-2 py-1 hover:bg-slate-900 rounded select-none transition cursor-pointer"
                    >
                      {t('badQualityDemoBtn')}
                    </button>
                  </div>
                </div>

                <div className="relative flex-1 flex flex-col min-h-[180px]">
                  <textarea
                    value={content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    placeholder={t('placeholderPaste')}
                    className="w-full flex-1 bg-slate-950 border border-slate-850 rounded-xl p-4 font-mono text-xs text-brand-cyan placeholder-slate-605 focus:outline-none focus:border-indigo-500/80 resize-none h-full shadow-inner leading-relaxed"
                    required
                  />
                </div>
              </div>

              {/* Autogenerated IPFS files metadata */}
              {content.trim() && (
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 space-y-1 text-[11px] font-mono">
                  <div className="flex justify-between text-slate-400 flex-wrap gap-1">
                    <span>{t('generatedOutputUri')}</span>
                    <span className="text-brand-cyan select-all max-w-[220px] truncate">{outputURI}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 flex-wrap gap-1">
                    <span>{t('commitHash')}</span>
                    <span className="text-brand-indigo select-all max-w-[220px] truncate">{outputHash}</span>
                  </div>
                </div>
              )}

              {/* Actions submission bar */}
              <div className="pt-4 border-t border-slate-850 shrink-0 flex items-center justify-end gap-4">
                <button
                  type="submit"
                  disabled={isSubmitting || !content.trim()}
                  className={`px-5 py-2.5 rounded-lg text-sm font-bold transition flex items-center gap-1.5 shadow-lg cursor-pointer ${
                    content.trim() 
                      ? 'bg-brand-indigo hover:bg-brand-indigo/80 text-white hover:shadow-brand-indigo/25'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? (
                    t('submittingEscrow')
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> {t('submitComputation')}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};
