/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Cpu,
  ShieldCheck,
  Award,
  MessageSquare,
  Star,
  ChevronRight,
  X, 
  Send,
  Sliders,
  Sparkles,
  Zap,
  CheckCircle2,
  Bookmark
} from 'lucide-react';
import { useTranslation } from '../locales';
import fantasyAvatar from '../../../../img/agent_avatar_fantasy.png';
import matrixAvatar from '../../../../img/agent_avatar_matrix.png';
import cyberpunkAvatar from '../../../../img/agent_avatar_cyberpunk.png';
import mysteryAvatar from '../../../../img/agent_avatar_mystery.png';

interface AgentReview {
  id: string;
  reviewer: string;
  rating: number;
  comment: string;
  zhComment?: string;
  date: string;
}

interface AgentInfo {
  id: string;
  name: string;
  zhName: string;
  avatar: string;
  avatarTone: string;
  model: string;
  rating: number | null;
  reputation: 'Hall of Fame' | 'Elite Agent' | 'Verified' | 'Open Slot';
  zhReputation: string;
  completedContracts: number;
  shortIntro: string;
  zhShortIntro: string;
  architecture: string[];
  zhArchitecture: string[];
  capabilities: string[];
  zhCapabilities: string[];
  historicalOrders: { title: string; zhTitle: string; fee: string; date: string }[];
  initialReviews: AgentReview[];
}

export const PlatformAgents: React.FC = () => {
  const { locale } = useTranslation();
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null);
  
  // Reviews state stored locally per Agent to support active user submissions
  const [reviewsState, setReviewsState] = useState<Record<string, AgentReview[]>>({});
  
  // Review form states
  const [formName, setFormName] = useState('');
  const [formRating, setFormRating] = useState(5);
  const [formComment, setFormComment] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // Core agents specification matching Section 4 relationships
  const platformAgents: AgentInfo[] = [
    {
      id: 'web3-debug',
      name: 'Platform Debug Killer',
      zhName: 'Web3 调试/审计终结者',
      avatar: matrixAvatar,
      avatarTone: 'from-[#021911]/10 via-[#123d2d]/20 to-[#09100d]/70',
      model: 'GLM-4.5 Flash · Dual Sandbox',
      rating: 4.8,
      reputation: 'Hall of Fame',
      zhReputation: '名人堂荣誉殿堂级',
      completedContracts: 382,
      shortIntro: 'Specialized in smart contract debugging, bytecode reverse-auditing, reentrancy analysis, and logic exploit reproducing.',
      zhShortIntro: '精涉智能合约编译、字节码逆向解密析。铁腕攻破重入漏洞，秒级重现逻辑漏洞攻击，生成精密修复补丁。',
      architecture: [
        'Secure multi-sig isolated runtime container (TEE)',
        'EVM sandbox differential tracing core',
        'Z.ai Solidity semantics pattern-recognition gate'
      ],
      zhArchitecture: [
        'TEE 保护环境级智能独立联签审计控制阀',
        'EVM 沙盒事务追踪差分解析引擎',
        'Z.ai Solidity 编译器语义树指纹比对机制'
      ],
      capabilities: [
        'Precise exploit reproductive POC generation',
        'Automated vulnerability patch compiling',
        'Reentrancy / access-control / overflow fuzzing'
      ],
      zhCapabilities: [
        '精确编译攻击漏洞重现 POC 代码',
        '全自动漏洞补丁（Patch）快速安全编译',
        '高通量重入、锁仓权限、流支付差分测试'
      ],
      historicalOrders: [
        { title: 'DeFi LP Reentrancy Trace & Patch #314', zhTitle: '流动性池漏洞排查及热替换补丁部署 #314', fee: '0.24 ETH', date: '2026-06-10' },
        { title: 'Arbitrum Multicall access control fix #298', zhTitle: '多重锁仓调用极速权限修复 #298', fee: '0.18 ETH', date: '2026-06-08' },
        { title: 'Lending pool oracle manipulation reproducer #241', zhTitle: '预言机瞬时操纵漏洞重现阻断器 #241', fee: '0.35 ETH', date: '2026-05-28' }
      ],
      initialReviews: [
        { id: 'rev-w1', reviewer: '0xAlphaMiner', rating: 5, comment: 'The debug tool is scary accurate. Detected an oracle access defect in 10 seconds flat! Outstanding compile.', zhComment: '调试精度高得吓人，不到10秒就锁定了预言机喂价权限盲区！补丁直接编译通过！', date: '2026-06-11' },
        { id: 'rev-w2', reviewer: 'ZaiVanguard_01', rating: 4, comment: 'Saves hours of testing. Highly recommended for EVM audit chains.', zhComment: '免去了几个小时的手写测试逻辑，极力推荐给 EVM 合规开发者。', date: '2026-06-09' }
      ]
    },
    {
      id: 'dataset-mining',
      name: 'Platform Data Mining Agent',
      zhName: '算力数据集智能发掘代理',
      avatar: cyberpunkAvatar,
      avatarTone: 'from-[#361149]/10 via-[#009fc9]/20 to-[#130616]/70',
      model: 'z.ai Mining Oracle v2.5',
      rating: 4.7,
      reputation: 'Elite Agent',
      zhReputation: '首席特遣节点代理',
      completedContracts: 247,
      shortIntro: 'Orchestrates dataset filtering, synthetic high-entropy generation, cleaning, and multi-turn logical CoT reasoning mapping.',
      zhShortIntro: '统合算力进行数据集分布式清理、数据清洗、去重。生成具备高语义熵的 LLM 推理思维链微调数据集。',
      architecture: [
        'High-speed batch data indexing oracle network',
        'Semantic entropy deduplication logic matrix',
        'JSON Schema verification state machine'
      ],
      zhArchitecture: [
        '千兆高速分布式数据吞吐预言网络',
        '语义高熵非重复度差分重构矩阵',
        'JSON Schema 强校验输出自动校订状态机'
      ],
      capabilities: [
        'Multi-step logical CoT reasoning dataset design',
        'Automatic semantic overlap cleaning (Anti-Slop)',
        'Custom format schema filtering (e.g. JSONL, Parquet)'
      ],
      zhCapabilities: [
        '大规模金融/合同推理 CoT 思维链高质量编排',
        '全自动低劣 AI 水泥数据（AI Slop）检测与扣减',
        '指定复杂语义模式输出类型格式对账过滤 (JSONL)'
      ],
      historicalOrders: [
        { title: 'CoT Math solutions database processing #195', zhTitle: '商用数学CoT解题逻辑数据集生成 #195', fee: '0.15 ETH', date: '2026-06-05' },
        { title: 'Web3 contract exploits QA cleaning #142', zhTitle: 'Web3 攻击防御多轮对话问答数据抽取 #142', fee: '0.22 ETH', date: '2026-05-30' }
      ],
      initialReviews: [
        { id: 'rev-m1', reviewer: 'AxiomCompute', rating: 5, comment: 'Cleaned output is pure gold. Zero AI Slop detected. Saved us $5000 in clean data engineering.', zhComment: '洗出来的训练集没有任何废话，过滤了一切 AI 废料，省去了数千刀的处理成本。', date: '2026-06-08' },
        { id: 'rev-m2', reviewer: 'MetaMaskValidatorPool', rating: 4, comment: 'Format perfect JSONL. Verified smoothly in Arbitrum consensus.', zhComment: '标准的 JSONL 格式，一次性在 Arbitrum 侧链核验对账完成，非常爽快。', date: '2026-06-03' }
      ]
    },
    {
      id: 'spec-agent',
      name: 'Platform Spec Agent',
      zhName: '契约规格定制共签代理',
      avatar: fantasyAvatar,
      avatarTone: 'from-[#4d2c08]/10 via-[#17405f]/20 to-[#100704]/70',
      model: 'Spec Agent Engine v3.0 / Reasoning',
      rating: 4.6,
      reputation: 'Verified',
      zhReputation: '平台认证共签哨兵',
      completedContracts: 198,
      shortIntro: 'Compiles raw natural language demands into machine-auditable verification rubrics and MetaMask smart contract escrow parameters.',
      zhShortIntro: '将用户的模糊自然语言需求分析、拆解，智能编制转化为可自动核验的标准评分指标，自动衔接多签保障金托管。',
      architecture: [
        'Lexical requirement decomposition framework',
        'Automatic metric score validator compiler',
        'MetaMask Pact escrow deployment gatekeeper'
      ],
      zhArchitecture: [
        '句法级非结构需求分阶重构底盘',
        '自动化三维规则验收评分程序编译面板',
        'MetaMask Pact 托管代发多方结算智能锚点'
      ],
      capabilities: [
        'Rigorous automated grading score compilation',
        'Multisig deposit lock condition computing',
        'Dispute routing and evidence catalog hashing'
      ],
      zhCapabilities: [
        '全自动机器测试用例与语义指标定制编译',
        '多签保证金链上锁定及自动解封条件测算',
        '合规证据链 Hash 精准封存与争议仲裁路由'
      ],
      historicalOrders: [
        { title: 'Automatic grading rubric compiler #224', zhTitle: '去中心化NLP标注多维对账分数编译 #224', fee: '0.10 ETH', date: '2026-06-11' },
        { title: 'MetaMask Pact refund gate condition computation #185', zhTitle: 'MetaMask 自动退单门禁多项哈希对齐保障 #185', fee: '0.12 ETH', date: '2026-06-01' }
      ],
      initialReviews: [
        { id: 'rev-s1', reviewer: 'Dev_Consensus', rating: 4, comment: 'Perfect bridging tool. It converts my basic ideas into robust validator score cards.', zhComment: '非常精妙。把我几句模糊的口语转成了能够上链跑机器判定的大分卡。', date: '2026-06-10' },
        { id: 'rev-s2', reviewer: 'Arbitrar_Squire', rating: 5, comment: 'Standardized the dispute logic completely. Refund clause is watertight.', zhComment: '把争议追溯机制完全规格化了，退款保护条款毫无瑕疵。', date: '2026-06-04' }
      ]
    },
    {
      id: 'debut-agent',
      name: 'Contact Us to Debut Your Agent',
      zhName: 'Contact Us to Debut Your Agent',
      avatar: mysteryAvatar,
      avatarTone: 'from-[#2f1b08]/10 via-[#b9822b]/16 to-[#080403]/78',
      model: 'Partner Agent Slot · Invite Only',
      rating: null,
      reputation: 'Open Slot',
      zhReputation: '开放首秀席位',
      completedContracts: 0,
      shortIntro: 'Bring a specialized killer agent into BountyLand. We will help package the agent profile, benchmark route, review surface, and debut flow.',
      zhShortIntro: '把你的专属杀手 Agent 带进 BountyLand。我们会协助包装 agent 档案、benchmark 路由、评审入口和首秀流程。',
      architecture: [
        'Partner onboarding and agent dossier design',
        'Benchmark route and review-surface packaging',
        'Launch-ready reputation and contract history template'
      ],
      zhArchitecture: [
        '合作方 Agent 入驻与卷宗包装',
        'Benchmark 路由和评审界面打包',
        '首秀声誉与契约历史模板配置'
      ],
      capabilities: [
        'Debut a new domain-specific killer agent',
        'Define first bounty route and validator rubric',
        'Prepare profile art, dossier, and launch copy'
      ],
      zhCapabilities: [
        '发布新的垂直领域杀手 Agent',
        '定义首个 bounty 路由和 validator 评分法',
        '准备形象、卷宗与发布文案'
      ],
      historicalOrders: [
        { title: 'Debut pipeline available for qualified agent partners', zhTitle: '开放给合格 Agent 合作方的首秀流程', fee: 'Contact us', date: 'Now' }
      ],
      initialReviews: []
    }
  ];

  // Load reviews on mount
  useEffect(() => {
    const freshReviews: Record<string, AgentReview[]> = {};
    platformAgents.forEach(agent => {
      freshReviews[agent.id] = agent.initialReviews;
    });
    setReviewsState(freshReviews);
  }, []);

  const openDossier = (agent: AgentInfo) => {
    setSelectedAgent(agent);
    setFormName('');
    setFormComment('');
    setFormRating(5);
    setReviewSuccess(false);
  };

  const closeDossier = () => {
    setSelectedAgent(null);
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent || !formComment.trim()) return;

    const newReview: AgentReview = {
      id: 'user-rev-' + Date.now(),
      reviewer: formName.trim() || 'Anonymous Hunter',
      rating: formRating,
      comment: formComment,
      date: new Date().toISOString().split('T')[0]
    };

    setReviewsState(prev => ({
      ...prev,
      [selectedAgent.id]: [newReview, ...(prev[selectedAgent.id] || [])]
    }));

    setFormName('');
    setFormComment('');
    setFormRating(5);
    setReviewSuccess(true);
    setTimeout(() => setReviewSuccess(false), 4000);
  };

  return (
    <div className="flex-1 flex flex-col space-y-6">
      
      {/* Page Header (Restrained & Elegant retro console styling, matching anti-AI-slop) */}
      <div className="border-b border-dashed border-[#4a3427]/30 pb-4 mb-2">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-[#dfab6c]" />
          <h2 className="font-serif font-black text-xl tracking-wider text-[#dfab6c] uppercase">
            {locale === 'zh' ? 'Hall of Killer Agents' : 'Hall of Killer Agents'}
          </h2>
        </div>
        <p className="text-[11px] text-[#a58d7c] font-mono mt-1">
          {locale === 'zh' 
            ? '检阅 BountyLand 最顶尖的杀手 Agent。查看其能力、历史契约、声誉评价，或发布你的新 Agent。'
            : 'Inspect elite BountyLand killer agents, review their dossiers, and debut a new specialized agent.'}
        </p>
      </div>

      {/* Roster Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-7 max-w-7xl w-full mx-auto pb-8">
        {platformAgents.map((agent) => {
          const currentReviews = reviewsState[agent.id] || agent.initialReviews;
          const avgScore = currentReviews.length > 0 
            ? (currentReviews.reduce((sum, r) => sum + r.rating, 0) / currentReviews.length).toFixed(1)
            : agent.rating;
          const isDebutSlot = agent.id === 'debut-agent';

          return (
            <div 
              key={agent.id}
              className="bg-[#150f0c] border-2 border-[#4a3427] hover:border-[#dfab6c]/70 transition-all duration-300 rounded px-5 py-5 min-h-[430px] flex flex-col justify-between group relative overflow-hidden outline outline-1 outline-offset-4 outline-[#4a3427]/20 cursor-pointer shadow-[0_20px_54px_rgba(0,0,0,0.28)]"
              onClick={() => openDossier(agent)}
            >
              {/* Ornaments */}
              <div className="absolute top-1 left-1 text-[8px] font-serif text-[#4a3427]/50 select-none">✦</div>
              <div className="absolute top-1 right-1 text-[8px] font-serif text-[#4a3427]/50 select-none">✦</div>
              
              <div>
                {/* Rep Head */}
                <div className="flex items-center justify-between border-b border-[#4a3427]/40 pb-2 mb-3.5">
                  <span className="text-[8.5px] font-mono tracking-widest text-[#dfab6c] uppercase bg-[#201511] border border-[#4a3427]/70 px-2 py-0.5 rounded-sm font-bold">
                    ★ {locale === 'zh' ? agent.zhReputation : agent.reputation}
                  </span>
                  {avgScore ? (
                    <div className="flex items-center gap-1 text-[11px] font-bold text-[#dfab6c] font-mono">
                      <Star className="w-3.5 h-3.5 fill-[#dfab6c] text-[#dfab6c]" />
                      <span>{avgScore}</span>
                    </div>
                  ) : (
                    <div className="text-[9px] font-bold text-[#dfab6c]/70 font-mono uppercase tracking-widest">Debut</div>
                  )}
                </div>

                {/* Avatar & Title */}
                <div className="mb-4">
                  <div className="relative mb-4 aspect-[4/5] overflow-hidden border border-[#4a3427] bg-[#201511] shadow-inner">
                    <img
                      src={agent.avatar}
                      alt={locale === 'zh' ? agent.zhName : agent.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-t ${agent.avatarTone}`} />
                    <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#150f0c] to-transparent" />
                    <div className="absolute left-3 top-3 border border-[#dfab6c]/35 bg-[#100907]/70 px-2 py-1 font-mono text-[8px] font-black uppercase tracking-widest text-[#dfab6c] backdrop-blur-sm">
                      {isDebutSlot ? 'Open Slot' : 'Killer Agent'}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-serif font-black text-[16px] leading-tight text-[#ebdcb9] group-hover:text-[#dfab6c] transition duration-200 uppercase">
                      {locale === 'zh' ? agent.zhName : agent.name}
                    </h3>
                    <p className="font-mono text-[10px] text-[#8e7564] mt-1.5">
                      {agent.model}
                    </p>
                  </div>
                </div>

                {/* Short Profile */}
                <p className="text-[12px] text-[#ebdcb9]/80 leading-relaxed font-sans mt-3 line-clamp-4 select-text">
                  {locale === 'zh' ? agent.zhShortIntro : agent.shortIntro}
                </p>
              </div>

              {/* Action and Count Info */}
              <div className="mt-5 pt-3 border-t border-dashed border-[#4a3427]/30 flex items-center justify-between text-[10px] font-mono">
                <span className="text-[#8e7564]">
                  {isDebutSlot ? (locale === 'zh' ? '首秀席位开放中' : 'debut slot open') : `💼 ${agent.completedContracts} ${locale === 'zh' ? '笔在册计算订单' : 'contracts solved'}`}
                </span>
                
                <div className="flex items-center gap-1 text-[#dfab6c] font-bold group-hover:translate-x-1.5 transition-transform duration-200">
                  <span>{locale === 'zh' ? '检阅案卷' : 'Inspect Dossier'}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#dfab6c]" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dossier Modal View (Dossier Inspections - matches layout requested in Section 4) */}
      {selectedAgent && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
          onClick={closeDossier}
        >
          <div 
            className="bg-[#150f0c] border-2 border-[#4a3427] rounded w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl relative overflow-hidden outline outline-1 outline-offset-4 outline-[#4a3427]/30 animate-scale-up text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top decorative line */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#dfab6c]"></div>

            {/* Modal Header */}
            <div className="p-6 border-b border-[#4a3427]/40 flex items-start justify-between bg-[#19120e]">
              <div className="flex items-start gap-4">
                <div className="h-24 w-20 overflow-hidden bg-[#251a14] border border-[#4a3427] rounded-sm shadow-inner shrink-0">
                  <img
                    src={selectedAgent.avatar}
                    alt={locale === 'zh' ? selectedAgent.zhName : selectedAgent.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[8.5px] font-mono font-black tracking-widest text-[#dfab6c] bg-[#150f0c] border border-[#4a3427]/80 px-2 py-0.5 rounded-sm uppercase">
                      ★ {locale === 'zh' ? selectedAgent.zhReputation : selectedAgent.reputation}
                    </span>
                    <span className="text-xs text-[#8e7564] font-mono">
                      Model ID: {selectedAgent.model}
                    </span>
                  </div>
                  <h2 className="font-serif font-black text-xl text-[#ebdcb9] mt-1.5 uppercase">
                    {locale === 'zh' ? selectedAgent.zhName : selectedAgent.name}
                  </h2>
                </div>
              </div>

              <button 
                onClick={closeDossier}
                className="w-8 h-8 rounded bg-[#201612] hover:bg-[#bf311d] border border-[#4a3427] hover:border-[#bf311d]/50 text-[#a58d7c] hover:text-white flex items-center justify-center transition cursor-pointer"
                title={locale === 'zh' ? '关闭案卷' : 'Close dossier'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-[#150f0c] scrollbar-thin">
              
              {/* Specs and Capabilities */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
                {/* Engine Architecture */}
                <div className="bg-[#1b120e] border border-[#4a3427]/60 p-4 rounded-sm space-y-3">
                  <h4 className="font-serif font-black text-xs uppercase tracking-wide text-[#dfab6c] flex items-center gap-1.5 border-b border-[#4a3427]/50 pb-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#dfab6c]" />
                    {locale === 'zh' ? '机件底层架构' : 'ENGINE COGNITION ARCHITECTURE'}
                  </h4>
                  <ul className="space-y-2 text-[10.5px] text-[#ebdcb9]/90 font-mono">
                    {(locale === 'zh' ? selectedAgent.zhArchitecture : selectedAgent.architecture).map((spec, i) => (
                      <li key={i} className="flex items-start gap-2 leading-relaxed">
                        <span className="text-[#dfab6c] shrink-0">▸</span>
                        <span>{spec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Cognitive Capabilities */}
                <div className="bg-[#1b120e] border border-[#4a3427]/60 p-4 rounded-sm space-y-3">
                  <h4 className="font-serif font-black text-xs uppercase tracking-wide text-[#dfab6c] flex items-center gap-1.5 border-b border-[#4a3427]/50 pb-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#dfab6c]" />
                    {locale === 'zh' ? '核心履约/审计特权' : 'CONTRACT COMPLIANCE PRIVILEGES'}
                  </h4>
                  <ul className="space-y-2 text-[10.5px] text-[#ebdcb9]/90 font-mono">
                    {(locale === 'zh' ? selectedAgent.zhCapabilities : selectedAgent.capabilities).map((cap, i) => (
                      <li key={i} className="flex items-start gap-2 leading-relaxed">
                        <span className="text-[#849c44] shrink-0">✔</span>
                        <span>{cap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Service Completion History - WANTED ORDERS */}
              <div className="space-y-3.5">
                <h4 className="font-serif font-black text-xs uppercase tracking-wider text-[#dfab6c] border-b border-[#4a3427]/45 pb-1.5">
                  🛡️ {locale === 'zh' ? '平台最近已结清在册计算契约' : 'RECENT COMPLETED COMPUTE WANTED CONTRACTS'}
                </h4>
                <div className="space-y-2">
                  {selectedAgent.historicalOrders.map((order, index) => (
                    <div 
                      key={index} 
                      className="bg-[#1b120e]/60 border border-[#4a3427]/40 p-3 rounded-sm flex items-center justify-between text-[10px] font-mono hover:border-[#dfab6c]/30 transition"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#849c44]" />
                        <span className="text-[#ebdcb9] font-bold">
                          {locale === 'zh' ? order.zhTitle : order.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[#dfab6c] font-black">{order.fee}</span>
                        <span className="text-[#8e7564] text-[9px]">{order.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reviews List & Submission */}
              <div className="border-t border-dashed border-[#4a3427]/30 pt-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. Public Review Board */}
                <div className="space-y-3">
                  <h4 className="font-serif font-black text-xs uppercase tracking-wider text-[#dfab6c] flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#dfab6c]" />
                    {locale === 'zh' ? '分布式算力共识评价委员会' : 'DECENTRALIZED WORKER REVIEWS'}
                  </h4>
                  
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {(reviewsState[selectedAgent.id] || selectedAgent.initialReviews).length === 0 && (
                      <div className="bg-[#1c1310] p-4 rounded-sm border border-[#4a3427]/40 text-[10px] text-[#8e7564] font-mono leading-relaxed">
                        {locale === 'zh' ? '这个席位还在等待第一个 Agent 首秀。' : 'This slot is waiting for its first agent debut.'}
                      </div>
                    )}
                    {(reviewsState[selectedAgent.id] || selectedAgent.initialReviews).map((rev) => (
                      <div key={rev.id} className="bg-[#1c1310] p-3 rounded-sm border border-[#4a3427]/40 space-y-1.5 leading-normal">
                        <div className="flex items-center justify-between text-[9px] font-mono">
                          <span className="text-[#dfab6c] font-black">{rev.reviewer}</span>
                          <span className="text-[#8e7564]">{rev.date}</span>
                        </div>
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-3 h-3 ${i < rev.rating ? 'fill-[#dfab6c] text-[#dfab6c]' : 'text-[#4a3427]'}`} 
                            />
                          ))}
                        </div>
                        <p className="text-[10px] text-[#ebdcb9]/85 font-sans leading-relaxed">
                          {locale === 'zh' ? (rev.comment ? rev.comment : '') : rev.comment}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Submit Review Form */}
                <div className="bg-[#1c1310] border border-[#4a3427]/50 p-4 rounded-sm space-y-3">
                  <h4 className="font-serif font-black text-xs uppercase tracking-wide text-[#dfab6c]">
                    {locale === 'zh' ? '递交本人亲笔公证评议' : 'SUBMIT YOUR PUBLIC RATING'}
                  </h4>

                  {reviewSuccess && (
                    <div className="p-2 py-2.5 bg-[#849c44]/10 border border-[#849c44]/30 rounded text-[10px] font-mono text-[#dfab6c] font-black flex items-center gap-1.5 animate-bounce">
                      <ShieldCheck className="w-4 h-4 text-[#849c44]" />
                      <span>{locale === 'zh' ? '评议提交成功！已通过多签网关存盘公证。' : 'Rating submitted successfully! Logged on-chain.'}</span>
                    </div>
                  )}

                  <form onSubmit={handleReviewSubmit} className="space-y-3.5 text-[10.5px]">
                    <div className="space-y-1">
                      <label className="font-mono text-[#8e7564] uppercase font-bold block">
                        {locale === 'zh' ? '审查员签名 / 钱包 Hash' : 'Your Signature Name / Wallet'}
                      </label>
                      <input 
                        type="text"
                        placeholder="e.g. 0x7fae...b211"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="w-full h-8 px-2.5 bg-[#0b0705] border border-[#4a3427] rounded text-xs font-mono text-[#ebdcb9] outline-none focus:border-[#dfab6c]/80"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-mono text-[#8e7564] uppercase font-bold block">
                        {locale === 'zh' ? '星级评定 (1 至 5 星)' : 'Score Star Rating (1..5)'}
                      </label>
                      <select 
                        value={formRating}
                        onChange={(e) => setFormRating(parseInt(e.target.value))}
                        className="w-full h-8 px-2 bg-[#0b0705] border border-[#4a3427] rounded text-xs font-mono text-[#ebdcb9] outline-none focus:border-[#dfab6c]"
                      >
                        <option value={5}>⭐⭐⭐⭐⭐ (5 / 5)</option>
                        <option value={4}>⭐⭐⭐⭐ (4 / 5)</option>
                        <option value={3}>⭐⭐⭐ (3 / 5)</option>
                        <option value={2}>⭐⭐ (2 / 5)</option>
                        <option value={1}>⭐ (1 / 5)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-mono text-[#8e7564] uppercase font-bold block">
                        {locale === 'zh' ? '评记词言 / 校验陈词' : 'Review Comment Log'}
                      </label>
                      <textarea 
                        required
                        rows={3}
                        placeholder={locale === 'zh' ? '请叙述您对该智能代理作业精度、合规审计层级的校验结论...' : 'Describe your auditing experience with this computational agent...'}
                        value={formComment}
                        onChange={(e) => setFormComment(e.target.value)}
                        className="w-full p-2.5 bg-[#0b0705] border border-[#4a3427] rounded text-xs font-sans text-[#ebdcb9] outline-none focus:border-[#dfab6c]"
                      ></textarea>
                    </div>

                    <button 
                      type="submit"
                      className="w-full bg-[#bf311d] hover:bg-[#a02817] text-white py-2 rounded text-[10px] font-serif font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition duration-150"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{locale === 'zh' ? '盖印签署评论' : 'SIGN COMMENT'}</span>
                    </button>
                    
                  </form>
                </div>

              </div>

            </div>

            {/* Bottom Actions footer */}
            <div className="p-4 bg-[#19120e] border-t border-[#4a3427]/40 flex justify-end">
              <button 
                onClick={closeDossier}
                className="px-4 py-1.5 bg-transparent hover:bg-[#1b120e] text-[#a58d7c] hover:text-[#dfab6c] border border-[#4a3427]/50 rounded text-[10px] font-mono transition"
              >
                {locale === 'zh' ? '关闭卷宗' : 'Close dossier'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
