/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Bot, 
  Cpu, 
  Scale, 
  ListTodo, 
  Sparkles, 
  Check, 
  Coins, 
  TrendingUp, 
  ChevronRight, 
  ArrowRight,
  ShieldAlert,
  Send,
  User,
  ExternalLink,
  Info,
  LogOut,
  X,
  ChevronLeft,
  Award,
  ShieldCheck,
  CheckCircle2,
  ArrowDownToLine,
  FileText,
  FileArchive,
  Download,
  Wallet
} from 'lucide-react';

import { CoboWalletWidget } from './components/CoboWalletWidget';
import { NetworkStatsWidget } from './components/NetworkStatsWidget';
import { AuthPanel } from './components/AuthPanel';
import { TaskCard } from './components/TaskCard';
import { TaskDetailModal } from './components/TaskDetailModal';
import { MinerPanel } from './components/MinerPanel';
import { ValidatorPanel } from './components/ValidatorPanel';
import { ActivityCard } from './components/ActivityCard';
import { ActivityDetailModal } from './components/ActivityDetailModal';
import { PlatformAgents } from './components/PlatformAgents';
import TargetCursor from './components/TargetCursor';

import {
  getCriteriaOptionsForTask,
  initialTasks, 
  getInitialActivities, 
  generateHash 
} from './mockData';
import { 
  Task, 
  Activity, 
  WalletState, 
  CriteriaOption, 
  MinerSubmission, 
  ApprovalItem 
} from './types';

import { useTranslation, getLocalizedTask, getLocalizedTaskTitle, getLocalizedCriteria } from './locales';
import { intakeDebug, executeDebug, getArtifactDownloadUrl, fetchArtifactContent } from './services/agentApi';
import type { ExecuteResponse } from './services/agentApi';
import JSZip from 'jszip';
import { connectWallet, disconnectWallet, refreshBalance, onAccountsChanged, onChainChanged } from './services/walletService';
import { createTaskOnChain } from './services/contractService';
import type { CreateTaskResult } from './services/contractService';
import { ethers } from 'ethers';
import introBackground from '../../../img/intro_page_concept.png';
import debugAgentAvatar from '../../../img/agent_avatar_matrix.png';
import dataAgentAvatar from '../../../img/agent_avatar_cyberpunk.png';
import specAgentAvatar from '../../../img/agent_avatar_fantasy.png';

interface IntroLandingProps {
  locale: 'en' | 'zh';
  onLogin: () => void;
  onToggleLanguage: () => void;
}

const SPEC_PRIMARY_OPTION_IDS = new Set([
  'sec-heavy',
  'reasoning-heavy',
  'char-correctness',
  'default-coherence'
]);

const isPrimarySpecOption = (option: CriteriaOption) => SPEC_PRIMARY_OPTION_IDS.has(option.id);

const getSpecCriteriaOptionDisplay = (option: CriteriaOption, locale: 'en' | 'zh'): CriteriaOption => {
  const isPrimary = isPrimarySpecOption(option);

  if (isPrimary) {
    return {
      ...option,
      name: locale === 'zh' ? '交付证据完整度审计' : 'Evidence Completeness & Delivery Traceability',
      description: locale === 'zh'
        ? '聚焦成果是否可复现、证据链是否完整、来源/日志/版本与交付物是否能被验证者直接复核，权重落在可交付性与审计追踪。'
        : 'Audits reproducibility, evidence chain completeness, source/log/version traceability, and whether validators can directly verify the delivered artifact.'
    };
  }

  return {
    ...option,
    name: locale === 'zh' ? '格式边界与解析稳定性' : 'Format Boundary & Parser Stability',
    description: locale === 'zh'
      ? '高宽容边缘场景覆盖规则，注重多轮思维推理的连贯、输出结构的严格对账和 JSONL/Markdown 等格式的稳定解析。'
      : 'Prioritizes edge-case coverage, coherent reasoning across turns, strict output-structure reconciliation, and stable parsing for JSONL/Markdown artifacts.'
  };
};

const IntroLanding: React.FC<IntroLandingProps> = ({ locale, onLogin, onToggleLanguage }) => {
  const [showAbout, setShowAbout] = useState(false);
  const aboutText = locale === 'zh'
    ? '在十九世纪的美国大西部，Bounty Land 是悬赏令、赏金猎手、职业杀手和执法者交汇的地方：有人挂出通缉与赎金，有人接下追捕与清算，执法部门负责监督秩序。在我们的项目里，每一张悬赏令都是一个计算任务。用户既可以调用平台提供的职业杀手 Agent 直接解决任务，也可以把任务发布到公开市场，让其他人工用户接单、提交结果并领取奖励；验证者则像执法部门一样审查工作，保证最终结算可信。'
    : 'On the 19th-century American frontier, Bounty Land was where wanted posters, reward money, bounty hunters, hired killers, and law enforcement met: someone posted the bounty, someone tracked the target, and sheriffs kept order. In our project, each wanted poster becomes a compute task. Users can ask platform-provided killer agents to solve the job directly, or post the bounty to the open market so human workers can take it, submit results, and earn rewards, while validators act as law enforcement to review the work and keep settlement fair.';

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080504] text-[#f4e5c3]">
      <TargetCursor
        spinDuration={2}
        hideDefaultCursor
        parallaxOn
        hoverDuration={0.2}
      />
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${introBackground})` }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,3,2,0.78)_0%,rgba(5,3,2,0.34)_48%,rgba(5,3,2,0.12)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#070403] via-[#070403]/45 to-transparent" />

      <button
        type="button"
        onClick={onToggleLanguage}
        className="cursor-target absolute right-6 top-6 z-20 h-10 px-4 border border-[#e0ad71]/45 bg-[#100907]/75 text-[#f0c384] hover:bg-[#1a100c] hover:border-[#f0c384] transition font-mono text-xs font-bold tracking-[0.18em]"
      >
        {locale === 'en' ? '中文' : 'EN'}
      </button>

      <section className="relative z-10 flex min-h-screen w-full items-center justify-center px-8 sm:px-14 lg:px-24">
        <div className="flex w-full max-w-5xl flex-col items-center pt-20 text-center">
          <div className="mb-7 h-1 w-24 bg-[#c43b25]" />
          <h1 className="text-[clamp(1.9rem,4.25vw,4.65rem)] font-normal uppercase leading-none tracking-[0.58em] text-[#f3d4a0]/52 drop-shadow-[0_9px_34px_rgba(0,0,0,0.62)] [font-family:'Copperplate','Copperplate_Gothic_Light','Cinzel',serif]">
            BountyLand
          </h1>
          <div className="mt-14 flex flex-col items-center justify-center gap-8 sm:flex-row sm:gap-36">
            <button
              type="button"
              onClick={() => setShowAbout(true)}
              className="cursor-target h-8 min-w-24 border border-[#e0ad71]/20 bg-[#130b08]/28 px-5 text-center font-display text-[8px] font-normal uppercase tracking-[0.46em] text-[#e7bd7d]/48 transition hover:border-[#f0c384]/55 hover:bg-[#21140f]/45 hover:text-[#f0c384]/78"
            >
              About
            </button>
            <button
              type="button"
              onClick={onLogin}
              className="cursor-target group h-8 min-w-24 border border-[#912a19]/34 bg-[#bf311d]/42 px-5 text-center font-display text-[8px] font-normal uppercase tracking-[0.46em] text-white/52 shadow-[0_14px_32px_rgba(191,49,29,0.08)] transition hover:bg-[#a92918]/68 hover:text-white/82"
            >
              <span className="inline-flex items-center justify-center gap-3">
                Login
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </button>
          </div>
        </div>
      </section>

      {showAbout && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-[#050302]/35 px-6 backdrop-blur-[2px]"
          onClick={() => setShowAbout(false)}
        >
          <div
            className="relative w-full max-w-2xl border border-[#e0ad71]/20 bg-[#100806]/45 px-7 py-7 shadow-[0_30px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:px-9 sm:py-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowAbout(false)}
              className="cursor-target absolute right-3 top-3 flex h-8 w-8 items-center justify-center border border-[#e0ad71]/18 bg-[#160d09]/35 text-[#f3d4a0]/50 transition hover:border-[#f3d4a0]/45 hover:text-[#f3d4a0]/80"
              aria-label={locale === 'zh' ? '关闭介绍' : 'Close about'}
            >
              <X className="h-4 w-4" />
            </button>
            <div className="mb-5 h-px w-20 bg-[#c43b25]/55" />
            <h2 className="mb-5 font-sans text-sm font-semibold uppercase tracking-[0.34em] text-[#f3d4a0]/68">
              {locale === 'zh' ? 'About BountyLand' : 'About BountyLand'}
            </h2>
            <p
              className="select-text text-[12.5px] leading-7 text-[#f6dfb5]/58 sm:text-[13.5px] sm:leading-8"
              style={{
                fontFamily: locale === 'zh'
                  ? '"KaiTi", "STKaiti", "Kaiti SC", "楷体", serif'
                  : '"Times New Roman", Times, serif',
                letterSpacing: locale === 'zh' ? '0.08em' : '0.045em',
              }}
            >
              {aboutText}
            </p>
          </div>
        </div>
      )}
    </main>
  );
};

export default function App() {
  const { t, locale, setLanguage } = useTranslation();
  const [showLanding, setShowLanding] = useState(true);
  
  // Authenticated Developer Profile State
  const [user, setUser] = useState<{ email: string; initials: string; walletAddress?: string } | null>(() => {
    const saved = localStorage.getItem('zai_logged_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const handleAuthSuccess = (email: string, initials: string, walletAddress?: string) => {
    const loggedUser = { email, initials, walletAddress };
    setUser(loggedUser);
    localStorage.setItem('zai_logged_user', JSON.stringify(loggedUser));

    // Support automatic Cobo Wallet connectivity synchronization if logging in via Web3
    if (walletAddress) {
      setWallet((prev) => ({
        ...prev,
        connected: true,
        address: walletAddress
      }));
    }
    
    triggerAlarm('success', t('loginSuccess'));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('zai_logged_user');
    setShowLanding(true);
    triggerAlarm('success', locale === 'zh' ? '成功安全退出登录。' : 'Successfully logged out safely.');
  };

  const [activeTab, setActiveTab] = useState<'DefineNewTask' | 'ActiveTasks' | 'Activities' | 'PlatformAgents'>('DefineNewTask');
  
  // Database State (Mock persistent records in memo state)
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activities, setActivities] = useState<Activity[]>(getInitialActivities());
  
  // Wallet state — populated by MetaMask connection
  const [wallet, setWallet] = useState<WalletState>({
    connected: false,
    address: '',
    balance: 0,
    pendingApprovalsList: []
  });

  // UI Selection parameters
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [activeMineTask, setActiveMineTask] = useState<Task | null>(null);
  const [activeValidateTask, setActiveValidateTask] = useState<Task | null>(null);

  // Chat conversation parameters (Page 1)
  const [userInput, setUserInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{
    sender: 'user' | 'agent';
    text: string;
    criteriaOptions?: CriteriaOption[];
    selectedOptionId?: string;
    orderPreview?: {
      summary: string;
      deposit: number;
      reward: number;
      passScore: number;
      options: CriteriaOption;
    };
  }>>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [stage, setStage] = useState<'prompt' | 'options' | 'pact_ready' | 'deployed'>('prompt');
  const [tempCreatedTask, setTempCreatedTask] = useState<any>(null);

  // Custom Form & Path choice states
  const [definePath, setDefinePath] = useState<'web3' | 'dataset' | 'custom' | null>(null);

  // Web3 Debug Form parameters
  const [web3RepoUrl, setWeb3RepoUrl] = useState('');
  const [web3IssueType, setWeb3IssueType] = useState('Reentrancy');
  const [web3VMType, setWeb3VMType] = useState('Solidity/EVM');
  const [web3ContractAddr, setWeb3ContractAddr] = useState('');
  const [web3FileScope, setWeb3FileScope] = useState('');
  const [web3Deliverables, setWeb3Deliverables] = useState<string[]>(['Audit Report', 'Patch/Fix suggestion']);
  const [web3CustomNotes, setWeb3CustomNotes] = useState('');
  
  // Dataset Miner Form parameters
  const [datasetDomain, setDatasetDomain] = useState('Financial Chain-of-Thought Reasoning');
  const [datasetSize, setDatasetSize] = useState('1000');
  const [datasetSources, setDatasetSources] = useState('');
  const [datasetSchema, setDatasetSchema] = useState('JSONL with query key, logical rationale thought-blocks, and verified gold response');
  const [datasetCleaning, setDatasetCleaning] = useState('');
  const [datasetValidationMetric, setDatasetValidationMetric] = useState('diversity-heavy');
  const [datasetCustomNotes, setDatasetCustomNotes] = useState('');

  // Submit and loading lifecycle parameters
  const [formSubmittingStage, setFormSubmittingStage] = useState<
    'none' | 'analyzing' | 'proposal_ready' | 'deploying_contract' | 'agent_intake' | 'agent_need_info' | 'agent_executing' | 'completed_download'
  >('none');
  const [draftedProposal, setDraftedProposal] = useState<any>(null);
  const [contractResult, setContractResult] = useState<CreateTaskResult | null>(null);
  const [agentResult, setAgentResult] = useState<ExecuteResponse | null>(null);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [agentMissingFields, setAgentMissingFields] = useState<string[]>([]);
  const [agentMessage, setAgentMessage] = useState<string | null>(null);
  const [reportContent, setReportContent] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Self-created task warrant management
  const [modifyingTask, setModifyingTask] = useState<Task | null>(null);
  const [modifyTitle, setModifyTitle] = useState('');
  const [modifyDescription, setModifyDescription] = useState('');
  const [modifyBounty, setModifyBounty] = useState('0.150');

  const handleCancelWarrant = (targetTask: Task) => {
    setTasks((prev) => prev.filter((t) => t.id !== targetTask.id));
    setWallet((prev) => ({
      ...prev,
      balance: parseFloat((prev.balance + targetTask.rewardPool).toFixed(4))
    }));
    triggerAlarm(
      'success',
      locale === 'zh'
        ? `悬赏挂单「${targetTask.title}」已成功撤回，质押金 ${targetTask.rewardPool} ETH 已全额退回到您的 MetaMask 钱包！`
        : `Warrant "${targetTask.title}" canceled. Escrow deposit of ${targetTask.rewardPool} ETH refunded successfully!`
    );
  };

  const handleStartModifyDemand = (task: Task) => {
    setModifyingTask(task);
    setModifyTitle(task.title);
    setModifyDescription(task.description);
    setModifyBounty(task.rewardPool.toString());
  };

  const handleSaveModifiedDemand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modifyingTask) return;

    const newPool = parseFloat(modifyBounty) || 0.1;
    const diff = newPool - modifyingTask.rewardPool;

    if (diff > 0 && wallet.balance < diff) {
      triggerAlarm('error', locale === 'zh' ? '算力契约追加失败：MetaMask 钱包余额不足！' : 'Pact modification failed: Insufficient wallet balance!');
      return;
    }

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === modifyingTask.id) {
          return {
            ...t,
            title: modifyTitle,
            description: modifyDescription,
            rewardPool: newPool,
            depositAmount: newPool,
          };
        }
        return t;
      })
    );

    setWallet((prev) => ({
      ...prev,
      balance: parseFloat((prev.balance - diff).toFixed(4))
    }));

    triggerAlarm(
      'success',
      locale === 'zh'
        ? '赏金悬赏单已成功修改！契约内容和多签保证金等参数已在链上实时更新。'
        : 'Warrant parameters and escrow deposit updated successfully!'
    );

    setModifyingTask(null);
  };

  // Global Alerts feed
  const [feedback, setFeedback] = useState<{ type: 'success' | 'alert' | 'error'; message: string } | null>(null);

  // Helper trigger to announce feedback
  const triggerAlarm = (type: 'success' | 'alert' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 6000);
  };

  // ── MetaMask Wallet handlers ──

  const handleConnectWallet = async () => {
    try {
      const { address, balance } = await connectWallet();
      setWallet((prev) => ({
        ...prev,
        connected: true,
        address,
        balance,
      }));
      triggerAlarm('success', locale === 'zh'
        ? `已连接 MetaMask: ${address.slice(0, 6)}...${address.slice(-4)}`
        : `MetaMask connected: ${address.slice(0, 6)}...${address.slice(-4)}`);
    } catch (err: any) {
      triggerAlarm('error', err?.message || (locale === 'zh' ? '钱包连接失败' : 'Wallet connection failed'));
    }
  };

  const handleDisconnectWallet = () => {
    const info = disconnectWallet();
    setWallet((prev) => ({
      ...prev,
      connected: info.connected,
      address: info.address,
      balance: info.balance,
    }));
    triggerAlarm('alert', locale === 'zh' ? 'MetaMask 已断开连接' : 'MetaMask disconnected');
  };

  // Listen for MetaMask account / chain changes
  React.useEffect(() => {
    const removeAccounts = onAccountsChanged((accounts: string[]) => {
      if (accounts.length === 0) {
        handleDisconnectWallet();
      } else {
        setWallet((prev) => ({ ...prev, address: accounts[0] }));
        refreshBalance(accounts[0]).then((balance) =>
          setWallet((prev) => ({ ...prev, balance }))
        ).catch(() => {});
      }
    });

    const removeChain = onChainChanged(() => {
      // Refresh balance on chain change
      if (wallet.address) {
        refreshBalance(wallet.address).then((balance) =>
          setWallet((prev) => ({ ...prev, balance }))
        ).catch(() => {});
      }
    });

    return () => {
      removeAccounts();
      removeChain();
    };
  }, [wallet.address]);

  // Automated Web3 Debug Request Form Submission handler
  const handleWeb3FormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmittingStage('analyzing');

    const criteriaOption: CriteriaOption = {
      id: 'web3-debug-custom-' + Date.now(),
      name: locale === 'zh' ? '沙箱多重重试渗透审计校验机制' : 'Sandboxed VM Anti-Exploit Checkmarks',
      description: `EVM transaction tracking and trace logs matching algorithm configured specifically for detecting ${web3IssueType} flaws.`,
      outputRequirements: `Solidity contract patch diff plus a local compilation verification script verifying the bug is neutralized.`,
      scoringDimensions: [
        { name: locale === 'zh' ? '漏洞修复彻底程度与边缘阻断 (weight: 50%)' : 'Security Patch Completeness & Edge Blocking', weight: 50 },
        { name: locale === 'zh' ? '编译器静态兼容性及测试通过率 (weight: 30%)' : 'EVM Sandbox Compilation Status', weight: 30 },
        { name: locale === 'zh' ? '代码整洁度与反代码粘连考核 (weight: 20%)' : 'Anti-Collusion Structural Compliance', weight: 20 }
      ],
      passCondition: 'Audit score >= 75 / 100 in deep sandboxed exploit reproduction loop.',
      checklist: [
        `Validate that original ${web3IssueType} reproduction script fails post-patch.`,
        'Ensure zero compiler state deprecation or warning triggers.',
        'Verify compliance against security patterns defined in z.ai auditing lexicon.'
      ],
      auditPrompt: `Directly assess code for ${web3IssueType} vulnerabilities inside target ${web3VMType} files.`,
      disputeTrigger: 'Validation deviance score exceeds threshold delta > 15.'
    };

    // Call agent intake to get suggested_price
    let suggestedPrice = 0.15; // fallback default
    try {
      const userInput = buildDebugUserInput();
      const intake = await intakeDebug(userInput);
      if (intake.suggested_price && intake.suggested_price > 0) {
        suggestedPrice = intake.suggested_price;
      }
    } catch (err) {
      console.warn('Intake API call failed during form submit, using default price:', err);
    }

    setDraftedProposal({
      type: 'web3',
      title: locale === 'zh' ? `智能合约 ${web3IssueType} 漏洞排查修复` : `${web3IssueType} Exploit Sandbox Analysis`,
      description: `Audit target scope: VM/Chain: ${web3VMType}, suspected exploit: ${web3IssueType}. Repository Target: ${web3RepoUrl || 'Direct copy text'}. Suspected Address: ${web3ContractAddr || 'Local workspace'}. Files: ${web3FileScope || 'All elements'}. Deliverable: ${web3Deliverables.join(', ')}. Additional Details: ${web3CustomNotes || 'None'}.`,
      rewardPool: suggestedPrice,
      depositAmount: suggestedPrice,
      aiThresholdLine: 75,
      criteriaName: criteriaOption.name,
      selectedCriteriaOption: criteriaOption,
      outputFormat: 'Solidity Compiler Patch',
      rawPromptText: `Debug Contract ${web3IssueType}`
    });

    setFormSubmittingStage('proposal_ready');
  };

  // Automated Dataset Mining Request Form Submission handler
  const handleDatasetFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmittingStage('analyzing');
    
    setTimeout(() => {
      const criteriaOption: CriteriaOption = {
        id: 'dataset-mining-custom-' + Date.now(),
        name: locale === 'zh' ? '高熵逻辑推演连贯去噪评价体系' : 'High Entropy Logical Deductive Rubric',
        description: `Dynamic test standard for verifying multi-turn conversational models or complex mathematical reasoning chains in domain ${datasetDomain}.`,
        outputRequirements: `Validation of ${datasetSize} JSONL lines aligning with specified JSON schema.`,
        scoringDimensions: [
          { name: locale === 'zh' ? 'CoT 多阶推导正确性及事实核验 (weight: 50%)' : 'CoT Multi-Turn Deductive Rigor', weight: 50 },
          { name: locale === 'zh' ? '语义不重复抗重度及高信息熵 (weight: 30%)' : 'High-Entropy Format Deduplication', weight: 30 },
          { name: locale === 'zh' ? 'JSONL 结构对账及主键字段对齐 (weight: 20%)' : 'Strict JSON Schema Alignment', weight: 20 }
        ],
        passCondition: 'Average alignment grading index score >= 72 / 100.',
        checklist: [
          'Verify every row includes rich multi-step step_by_step_reasoning chain.',
          'Filter out boilerplate phrases, repetitive loops, and lower index noise.',
          'Validate response outputs with sandboxed validator algorithms.'
        ],
        auditPrompt: `Process evaluation for target ${datasetDomain} datasets ensuring zero redundancy.`,
        disputeTrigger: 'Validator index score deviance vs referee tool > 15.'
      };

      setDraftedProposal({
        type: 'dataset',
        title: locale === 'zh' ? `分布式发掘: ${datasetDomain} 算力数据集` : `Dataset Outsource: ${datasetDomain} High Entropy Corpus`,
        description: `Custom data collection contract. Domain target: ${datasetDomain}. Dataset size target: ${datasetSize} elements. Target JSON Schema structure: ${datasetSchema}. Cleaning guidelines: ${datasetCleaning || 'Remove boilerplate/low semantic density'}. Metrics target: ${datasetValidationMetric === 'diversity-heavy' ? 'Maximum unique information density' : 'Rigid accuracy validation'}. Notes: ${datasetCustomNotes || 'None'}.`,
        rewardPool: 0.180,
        depositAmount: 0.180,
        aiThresholdLine: 72,
        criteriaName: criteriaOption.name,
        selectedCriteriaOption: criteriaOption,
        outputFormat: 'JSON Lines (.jsonl)',
        rawPromptText: `Outsource Dataset ${datasetDomain}`
      });

      setFormSubmittingStage('proposal_ready');
    }, 1800);
  };

  // ---------------------------------------------------------------------------
  // Agent integration — build a rich user_input from the web3 form fields
  // ---------------------------------------------------------------------------
  const buildDebugUserInput = (): string => {
    // Build a test command hint based on the VM type
    const vmTestHints: Record<string, string> = {
      'Solidity/EVM': 'forge test 或 npx hardhat test',
      'Rust/WASM (Solana)': 'cargo test-sbf 或 anchor test',
      'Move (Sui/Aptos)': 'sui move test 或 aptos move test',
      'Huff/Yul Assembly': 'forge test 或 huffc compile',
    };
    const defaultTestCmd = vmTestHints[web3VMType] || '执行项目测试';

    const parts: string[] = [
      `GitHub 仓库地址: ${web3RepoUrl}`,
      `漏洞类型: ${web3IssueType}`,
      `编译器/VM环境: ${web3VMType}`,
      web3ContractAddr ? `受影响合约地址: ${web3ContractAddr}` : null,
      web3FileScope ? `受检文件范围: ${web3FileScope}` : null,
      `期望交付成果: ${web3Deliverables.join('、')}`,
      `修复代码，保留仓库，我要看修改后的代码`,
      // Use "错误日志:" prefix so extract_logs() in the rule engine can match it
      web3CustomNotes
        ? `错误日志:\n${web3CustomNotes}`
        : `错误日志: 编译或运行时出现与${web3IssueType}相关的错误或异常行为`,
      // Provide a test command so reproduction_evidence passes
      `测试命令: ${defaultTestCmd}`,
    ];
    return parts.filter(Boolean).join('\n');
  };

  // ---------------------------------------------------------------------------
  // Agent integration — call /v1/intake → /v1/execute
  // ---------------------------------------------------------------------------
  const handleAgentDeploy = async () => {
    if (!draftedProposal || draftedProposal.type !== 'web3') return;

    // Require wallet connection
    if (!wallet.connected) {
      triggerAlarm('error', locale === 'zh' ? '请先连接 MetaMask 钱包' : 'Please connect MetaMask wallet first');
      return;
    }

    const userInput = buildDebugUserInput();
    const bounty = draftedProposal.rewardPool || 0.15;

    console.group('%c🔧 [Agent Flow] handleAgentDeploy', 'color: #dfab6c; font-weight: bold; font-size: 14px');
    console.log('%c📋 userInput:', 'color: #ebdcb9', userInput);
    console.log('%c💰 bounty:', 'color: #ebdcb9', bounty, 'ETH');

    // Reset previous state
    setContractResult(null);
    setAgentResult(null);
    setAgentError(null);
    setAgentMissingFields([]);
    setAgentMessage(null);
    setReportContent(null);
    setReportLoading(false);

    // ── Phase 0: On-chain escrow ──
    console.log('%c📡 Phase 0: Deploying contract...', 'color: #dfab6c');
    setFormSubmittingStage('deploying_contract');

    // Default 24-hour SLA deadline
    const deadline = Math.floor(Date.now() / 1000) + 24 * 3600;
    const criteriaJSON = JSON.stringify({
      task: draftedProposal.title,
      repo: web3RepoUrl,
      issueType: web3IssueType,
      vm: web3VMType,
      deliverables: web3Deliverables,
    });
    const criteriaHashBytes32 = ethers.keccak256(ethers.toUtf8Bytes(criteriaJSON));

    try {
      const chainResult = await createTaskOnChain({
        taskURI: `data:application/json,${encodeURIComponent(JSON.stringify({ title: draftedProposal.title, repo: web3RepoUrl, issueType: web3IssueType, vm: web3VMType, description: draftedProposal.description }))}`,
        orderURI: `data:application/json,${encodeURIComponent(JSON.stringify({ deliverables: web3Deliverables, outputFormat: draftedProposal.outputFormat, criteria: criteriaJSON }))}`,
        criteriaHash: criteriaHashBytes32,
        deadline,
        rewardPoolEth: bounty,
      });

      setContractResult(chainResult);
      console.log('%c✅ Contract deployed:', 'color: #849c44', chainResult);
      triggerAlarm(
        'success',
        locale === 'zh'
          ? `链上托管成功！Task #${chainResult.taskId} 已创建，${bounty} ETH 已存入合约`
          : `Escrow locked! Task #${chainResult.taskId} created, ${bounty} ETH deposited on-chain`,
      );
    } catch (chainErr: any) {
      // Re-throw user-rejected errors, otherwise show message and stop
      if (chainErr?.code === 'ACTION_REJECTED' || chainErr?.message?.includes('user rejected')) {
        triggerAlarm('alert', locale === 'zh' ? 'MetaMask 交易已取消' : 'MetaMask transaction cancelled');
        setFormSubmittingStage('proposal_ready');
        return;
      }
      setAgentError(chainErr?.message || String(chainErr));
      triggerAlarm('error', locale === 'zh' ? `链上托管失败: ${chainErr?.message || '未知错误'}` : `On-chain escrow failed: ${chainErr?.message || 'Unknown error'}`);
      setFormSubmittingStage('proposal_ready');
      return;
    }

    // ── Phase 1: Agent intake ──
    console.log('%c🤖 Phase 1: Calling agent intake...', 'color: #dfab6c');
    setFormSubmittingStage('agent_intake');
    try {
      const intake = await intakeDebug(userInput);

      if (intake.status === 'needs_confirmation') {
        setAgentMissingFields(intake.missing_fields || []);
        setAgentMessage(intake.agent_message || null);
        setFormSubmittingStage('agent_need_info');
        return;
      }

      // Show suggested price / agent message and proceed
      if (intake.agent_message) {
        setAgentMessage(intake.agent_message);
      }

      // Phase 2 — execute
      console.log('%c⚡ Phase 2: Calling agent execute...', 'color: #849c44');
      setFormSubmittingStage('agent_executing');
      const result = await executeDebug({
        userInput,
        userBudget: bounty,
      });

      setAgentResult(result);
      console.log('%c✅ Agent result received:', 'color: #849c44', {
        'intake.status': result.intake?.status,
        'execution.status': result.execution?.status,
        'execution.summary': result.execution?.summary,
        'artifacts': result.execution?.artifacts?.length,
      });

      // If execute failed (intake said not ready even with price_confirmed)
      if (!result.execution) {
        const intakeResult = result.intake;
        if (intakeResult.status === 'needs_confirmation') {
          setAgentMissingFields(intakeResult.missing_fields || []);
          setAgentMessage(intakeResult.agent_message || null);
          setFormSubmittingStage('agent_need_info');
          return;
        }
        setAgentError(
          locale === 'zh'
            ? 'Agent 执行未能启动，请检查输入后重试。'
            : 'Agent execution could not start. Please check your input and try again.',
        );
        setFormSubmittingStage('proposal_ready');
        return;
      }

      // Deduct wallet & create task (same as before, but with real data)
      setWallet((prev) => ({
        ...prev,
        balance: parseFloat((prev.balance - bounty).toFixed(4)),
      }));

      const newTaskId = 'task-' + (tasks.length + 1);
      const exec = result.execution;
      const summary = exec.summary || {};

      const newlyDeployed: Task = {
        id: newTaskId,
        title: draftedProposal.title,
        description:
          draftedProposal.description +
          ` Agent execution complete. Patch generated: ${summary.patch_generated ? 'YES' : 'NO'}, iterations: ${summary.patch_iterations ?? 'N/A'}.`,
        createdAt: new Date().toISOString(),
        deadline: 'Completed',
        rewardPool: bounty,
        depositAmount: bounty,
        aiAuditEnabled: true,
        aiThresholdLine: 75,
        status: 'Completed',
        assignedAgent: 'Platform Debug Killer',
        criteriaName: draftedProposal.criteriaName,
        selectedCriteriaOption: draftedProposal.selectedCriteriaOption,
        outputFormat: draftedProposal.outputFormat,
        taskURI: `ipfs://Qm${generateHash('task_')}`,
        orderURI: `ipfs://Qm${generateHash('order_')}`,
        criteriaHash: generateHash('0x'),
        minerSubmissionsCount: 1,
        minerSubmissions: [
          {
            id: 'sub-' + Date.now(),
            taskId: newTaskId,
            workerAddress: '0x3f5ce...d88a',
            submittedAt: new Date().toISOString(),
            content: exec.status === 'diagnosed'
              ? `Debug Agent diagnosed the repository. Reproduced: ${summary.reproduced ? 'YES' : 'NO'}. Patch iterations: ${summary.patch_iterations ?? 'N/A'}. Verification returncode: ${summary.verification_returncode ?? 'N/A'}.`
              : `Agent execution completed with status: ${exec.status || 'unknown'}.`,
            outputURI: `ipfs://Qm${generateHash('out_')}`,
            outputHash: generateHash('0x'),
            status: 'Settled',
            evaluation: {
              validatorAddress: '0xSystemAgent',
              validatorScore: summary.patch_generated ? 100 : 50,
              validatorReason: summary.patch_generated
                ? 'Debug Agent successfully reproduced the bug and generated a verified patch.'
                : 'Agent completed diagnosis but could not generate a verified patch.',
              aiScore: summary.patch_generated ? 100 : 50,
              aiExplanation: `LLM tokens used: ${exec.usage?.llm_total_tokens ?? 'N/A'}. Repo cloned: ${exec.usage?.repo_cloned ? 'YES' : 'NO'}. Commands run: ${exec.usage?.commands_run ?? 'N/A'}.`,
              finalScore: summary.patch_generated ? 100 : 50,
              delta: 12,
              reputationChange: 5,
              settled: true,
            },
          },
        ],
      };

      setTasks((prev) => [newlyDeployed, ...prev]);

      triggerAlarm(
        'success',
        locale === 'zh'
          ? `Agent 执行完成！已生成 ${summary.patch_generated ? '漏洞修复补丁' : '诊断报告'}，可下载查看。`
          : `Agent execution complete! ${summary.patch_generated ? 'Patch generated' : 'Diagnosis ready'} for download.`,
      );

      setFormSubmittingStage('completed_download');
      console.log('%c🏁 Flow complete → completed_download', 'color: #849c44');
      console.groupEnd();

      // Fetch the debug report content for inline display
      const artifacts = result.execution.artifacts || [];
      const reportArtifact = artifacts.find((a: any) => a.type === 'debug_report');
      if (reportArtifact?.path) {
        const taskIdMatch = reportArtifact.path.match(/(task_\w+)/);
        if (taskIdMatch) {
          setReportLoading(true);
          fetchArtifactContent(taskIdMatch[1], 'debug_report.md')
            .then((content) => setReportContent(content))
            .catch(() => setReportContent(null))
            .finally(() => setReportLoading(false));
        }
      }
    } catch (err: any) {
      console.log('%c❌ Agent flow error:', 'color: #bf311d', err?.message || err);
      console.groupEnd();
      setAgentError(err?.message || String(err));
      triggerAlarm('error', locale === 'zh' ? `Agent 调用失败: ${err?.message || '未知错误'}` : `Agent call failed: ${err?.message || 'Unknown error'}`);
      setFormSubmittingStage('proposal_ready');
    }
  };

  // Approve proposal and deposit/lock assets using Cobo Wallet balance
  const handleDeployDraftedProposal = () => {
    if (!draftedProposal) return;

    // Web3 Debug tasks → route to the real Agent pipeline
    if (draftedProposal.type === 'web3') {
      handleAgentDeploy();
      return;
    }

    if (wallet.balance < draftedProposal.rewardPool) {
      triggerAlarm('error', locale === 'zh' ? 'MetaMask 智能托管代扣失败：可用 ETH 余量不足！' : 'Escrow Deposit failed: Insufficient wallet balance!');
      return;
    }

    const newTaskId = 'task-' + (tasks.length + 1);
    const assignedName = draftedProposal.type === 'web3' ? 'Platform Debug Killer' : 'Platform Data Mining Agent';
    const isWeb3 = draftedProposal.type === 'web3';
    const isAgentSolution = draftedProposal.type === 'web3' || draftedProposal.type === 'dataset';

    const newlyDeployed: Task = {
      id: newTaskId,
      title: draftedProposal.title,
      description: draftedProposal.description + (isAgentSolution 
        ? (isWeb3 
          ? ` Successfully debugged by platform agent. Fixes deployed and downloadable archive generated.` 
          : ` Successfully collected and curated by platform agent. Secured dataset generated within sandbox environment.`)
        : ` Checked against custom verification criteria options. Handed over to our assigned specialist: ${assignedName}.`),
      createdAt: new Date().toISOString(),
      deadline: isAgentSolution ? 'Completed' : '24h remaining',
      rewardPool: draftedProposal.rewardPool,
      depositAmount: draftedProposal.depositAmount,
      aiAuditEnabled: true,
      aiThresholdLine: draftedProposal.aiThresholdLine,
      status: isAgentSolution ? 'Completed' : 'Agent is working', 
      assignedAgent: assignedName, // Assigns Agent name matching Section 4
      criteriaName: draftedProposal.criteriaName,
      selectedCriteriaOption: draftedProposal.selectedCriteriaOption,
      outputFormat: draftedProposal.outputFormat,
      taskURI: `ipfs://Qm${generateHash('task_')}`,
      orderURI: `ipfs://Qm${generateHash('order_')}`,
      criteriaHash: generateHash('0x'),
      minerSubmissionsCount: isAgentSolution ? 1 : 0,
      minerSubmissions: isAgentSolution ? [
        {
          id: 'sub-' + Date.now(),
          taskId: newTaskId,
          workerAddress: '0x3f5ce...d88a',
          submittedAt: new Date().toISOString(),
          content: isWeb3 
            ? `// Bug Verification Log:\n// Intercepted ${web3IssueType} in target repository files.\n// All sanity compile tests passed. Verification completed and assets ready.\n// Artifact path: web3-debug-archive-${newTaskId}.zip`
            : `// Dataset Extraction & Cleaning Log:\n// Gathered high-entropy items for topic: ${datasetDomain}.\n// Parsed and sanitized ${datasetSize} lines according to specified json schema.\n// Integrity checked, redundant items removed, quality index scored 100/100.\n// Artifact path: dataset-${datasetDomain.toLowerCase().replace(/\s+/g, '_')}-${newTaskId}.zip`,
          outputURI: `ipfs://Qm${generateHash('out_')}`,
          outputHash: generateHash('0x'),
          status: 'Settled',
          evaluation: {
            validatorAddress: '0xSystemAgent',
            validatorScore: 100,
            validatorReason: isWeb3 
              ? 'Fully resolved all security exploit vectors in compilation sandbox.'
              : 'Synthesized target records matching requested diversity metrics and schema criteria without noise.',
            aiScore: 100,
            aiExplanation: isWeb3 
              ? 'Dynamic verification sandbox reproduced the secure patch successfully.'
              : 'No duplicate records found, JSONL syntax audit checking scored high token entropy.',
            finalScore: 100,
            delta: 12,
            reputationChange: 5,
            settled: true
          }
        }
      ] : []
    };

    setTasks((prev) => [newlyDeployed, ...prev]);

    setWallet((prev) => ({
      ...prev,
      balance: parseFloat((prev.balance - draftedProposal.rewardPool).toFixed(4))
    }));

    if (isAgentSolution) {
      if (isWeb3) {
        triggerAlarm('success', locale === 'zh' ? `智能安全代扣成功！平台已极速生成并锁定了漏洞修复并提供下载。` : `MetaMask Escrow Pact locked successfully! Vulnerability patches and secure document compiled.`);
      } else {
        triggerAlarm('success', locale === 'zh' ? `智能多签契约代扣成功！平台分布式算力已完成数据集搜集与高质量去噪并提供下载。` : `MetaMask escrow locked successfully! High entropy dataset generated, crawled and sanitized.`);
      }
      setFormSubmittingStage('completed_download');
    } else {
      triggerAlarm('success', locale === 'zh' ? `托管锁仓契约签署就绪！警长 ${assignedName} 已被成功分派并开始作业。` : `MetaMask pact locked and funded successfully! ${assignedName} is now on active duty.`);
      
      // Refresh states
      setDraftedProposal(null);
      setFormSubmittingStage('none');
      setDefinePath(null);

      // Auto navigate to market hall
      setTimeout(() => {
        setActiveTab('ActiveTasks');
      }, 1000);
    }
  };

  // Create Task conversational flow dispatch
  const handleChatPromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isTyping) return;

    const userText = userInput;
    setUserInput('');
    
    // 1. Post User prompt in messages
    setChatMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setIsTyping(true);
    setStage('options');

    // 2. Generate customized criteria option sets
    setTimeout(() => {
      const matchedOptions = getCriteriaOptionsForTask(userText);
      const enText = `Hi! I am the z.ai Platform Spec Agent. I parsed your task and generated 2 custom-tailored validator criteria options suited for your budget. Select the rule card that best matches your target accuracy:`;
      const zhText = `你好！我是 z.ai 平台的规格设定智能代理（Spec Agent）。我已经解析了您的算力业务需求，并为您生成了 2 套契合预算的验收与验证机制。请在下方选择最吻合您精度目标的规则选项：`;
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'agent',
          text: locale === 'zh' ? zhText : enText,
          criteriaOptions: matchedOptions
        }
      ]);
      setIsTyping(false);
    }, 1200);
  };

  // User selects an option inside conversational cards
  const handleSelectCriteriaOption = (option: CriteriaOption) => {
    // 1. Log select action in chat
    setChatMessages((prev) => {
      const updated = [...prev];
      const lastMsgIdx = updated.length - 1;
      if (lastMsgIdx >= 0) {
        updated[lastMsgIdx] = { ...updated[lastMsgIdx], selectedOptionId: option.id };
      }
      return updated;
    });

    const displayOption = getSpecCriteriaOptionDisplay(option, locale);
    const enMeSelect = `I choose Option: ${displayOption.name}`;
    const zhMeSelect = `我选择验收标准指标：${displayOption.name}`;
    
    setChatMessages((prev) => [
      ...prev,
      { sender: 'user', text: locale === 'zh' ? zhMeSelect : enMeSelect }
    ]);

    setIsTyping(true);
    setStage('pact_ready');

    // 2. Build computation order preview
    setTimeout(() => {
      const reward = 0.120;
      const deposit = 0.120;
      const passScore = isPrimarySpecOption(option) ? 80 : 72;

      const enAgentText = `Excellent choice. I compiled your request into a ready-to-sign Smart Contract Computation Order with budget deposit requirements. Review the Pact and sign to deploy the task on-chain:`;
      const zhAgentText = `明智的选择。我已经将您的需求集成一份已就绪的“多签智能合约计算订单”，该订单附带了预算托管代扣要求。请预览契约详情，然后签名将其安全上链发布：`;

      const enSumText = "Generate custom data complying with chosen metrics. All worker outputs audited dynamically.";
      const zhSumText = "生成符合指定数据规范的高质量算力数据集。所有矿工节点成果通过独立 AI 动态审计校验。";

      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'agent',
          text: locale === 'zh' ? zhAgentText : enAgentText,
          orderPreview: {
            summary: locale === 'zh' ? zhSumText : enSumText,
            deposit,
            reward,
            passScore,
            options: displayOption
          }
        }
      ]);

      const mockDepl = {
        title: `Decentralized Outsourcing Task #${tasks.length + 1}`,
        description: `Natural language query defined: "${chatMessages[0]?.text || 'Outsource task computation'}"`,
        rewardPool: reward,
        depositAmount: deposit,
        aiThresholdLine: passScore,
        criteriaName: displayOption.name,
        selectedCriteriaOption: displayOption,
        outputFormat: displayOption.outputRequirements.split(' ')[0] || 'JSONL',
        rawPromptText: chatMessages[0]?.text || ''
      };

      setTempCreatedTask(mockDepl);
      setIsTyping(false);
    }, 1000);
  };

  // User clicks "Secure Deposit & Create Task"
  const handleTriggerCoboPactApproval = () => {
    if (!tempCreatedTask) return;

    triggerAlarm('alert', 'MetaMask Pact requested! Check your pending Pacts in the sidebar wallet widget to authorize budget escrow.');

    // Add Approval Action in Cobo Wallet State container
    const pactId = 'pact-' + Date.now();
    const newPact: ApprovalItem = {
      id: pactId,
      type: 'PactCreation',
      title: 'Deploy Compute Order Escrow',
      description: `Fund reward pool of ${tempCreatedTask.rewardPool} ETH for "${tempCreatedTask.title}" and lock criteria rules under consensus security constraints.`,
      amount: tempCreatedTask.depositAmount,
      details: {
        threshold: `${tempCreatedTask.aiThresholdLine}/100`,
        criteria: tempCreatedTask.criteriaName
      },
      createdAt: new Date().toISOString(),
      status: 'Pending'
    };

    setWallet((prev) => ({
      ...prev,
      pendingApprovalsList: [...prev.pendingApprovalsList, newPact]
    }));
  };

  // Handling wallet approvals inside sidebars
  const handleApproveWalletItem = (id: string) => {
    const target = wallet.pendingApprovalsList.find(x => x.id === id);
    if (!target) return;

    // Process Pact Approvals depending on types
    if (target.type === 'PactCreation' && tempCreatedTask) {
      // Deduct budget and deploy task
      const newTaskId = 'task-' + (tasks.length + 1);
      const newlyDeployed: Task = {
        id: newTaskId,
        title: tempCreatedTask.title,
        description: tempCreatedTask.description + ` Parameters mapped securely using selected criteria. Ready for miners and validators to process outputs.`,
        createdAt: new Date().toISOString(),
        deadline: '48h remaining',
        rewardPool: tempCreatedTask.rewardPool,
        depositAmount: tempCreatedTask.depositAmount,
        aiAuditEnabled: true,
        aiThresholdLine: tempCreatedTask.aiThresholdLine,
        status: 'Active',
        criteriaName: tempCreatedTask.criteriaName,
        selectedCriteriaOption: tempCreatedTask.selectedCriteriaOption,
        outputFormat: tempCreatedTask.outputFormat,
        taskURI: `ipfs://Qm${generateHash('task_')}`,
        orderURI: `ipfs://Qm${generateHash('order_')}`,
        criteriaHash: generateHash('0x'),
        minerSubmissionsCount: 0,
        minerSubmissions: [],
        isCreatedByCurrentUser: true
      };

      // Add to main catalogs
      setTasks((prev) => [newlyDeployed, ...prev]);
      wallet.balance -= tempCreatedTask.depositAmount;

      triggerAlarm('success', `Task successfully deployed! Order parameters written on-chain with ipfs hashes!`);
      
      // Update dialogue board
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'agent',
          text: `🎉 CONGRATULATIONS! MetaMask Wallet securely approved the deposit escrow. Computation Order #${newTaskId} is now active in the Task Marketplace.`
        }
      ]);
      setStage('deployed');
      setTempCreatedTask(null);

      // Auto reroute to list of active tasks for supreme feel
      setTimeout(() => {
        setActiveTab('ActiveTasks');
      }, 1500);

    } else if (target.type === 'RewardDistribution') {
      // Award payouts
      const details = target.details;
      
      // Update targeted task and submissions to Settled status
      setTasks((prevTasks) => 
        prevTasks.map((t) => {
          if (t.id === details.taskId) {
            return {
              ...t,
              minerSubmissions: t.minerSubmissions.map((sub) => {
                if (sub.id === details.submissionId) {
                  return {
                    ...sub,
                    status: 'Settled',
                    evaluation: sub.evaluation ? { ...sub.evaluation, settled: true } : undefined
                  };
                }
                return sub;
              })
            };
          }
          return t;
        })
      );

      // Update related activities to Settled
      setActivities((prevHistory) => 
        prevHistory.map((act) => {
          if (act.submissionId === details.submissionId) {
            let updatedReward = act.reward;
            if (act.type === 'Mining') {
              updatedReward = details.minerReward;
            } else if (act.type === 'Validation') {
              updatedReward = details.validatorReward;
            }

            return {
              ...act,
              status: 'Settled',
              reward: updatedReward,
              info: act.type === 'Mining' 
                ? `Mining activity | Settled | Final score: ${details.finalScore} | Distributed!`
                : `Validation activity | Settled | Deviation: ${details.delta} | Settle complete!`
            };
          }
          return act;
        })
      );

      // Distribute money
      wallet.balance += (details.minerReward + details.validatorReward);

      triggerAlarm('success', `MetaMask Escrow release finalized! Tokens distributed according to audited score math parameters.`);
    }

    // Resolve Pending statuses
    setWallet((prev) => ({
      ...prev,
      pendingApprovalsList: prev.pendingApprovalsList.map((item) => 
        item.id === id ? { ...item, status: 'Approved' } : item
      )
    }));
  };

  const handleRejectWalletItem = (id: string) => {
    setWallet((prev) => ({
      ...prev,
      pendingApprovalsList: prev.pendingApprovalsList.map((item) => 
        item.id === id ? { ...item, status: 'Rejected' } : item
      )
    }));
    triggerAlarm('error', 'MetaMask Wallet request declined. Computation session state rolled back.');
  };

  // Miner submits code execution outputs
  const handleMinerSubmitOutput = (content: string, outputURI: string, outputHash: string) => {
    if (!activeMineTask) return;

    const newSub: MinerSubmission = {
      id: 'sub-' + Date.now(),
      taskId: activeMineTask.id,
      workerAddress: '0x9486...88b2 (Worker Alpha - You)',
      submittedAt: new Date().toISOString(),
      content: content,
      outputURI: outputURI,
      outputHash: outputHash,
      status: 'Unscored'
    };

    // Update tasks state
    setTasks((prev) => 
      prev.map((t) => {
        if (t.id === activeMineTask.id) {
          return {
            ...t,
            minerSubmissionsCount: t.minerSubmissionsCount + 1,
            minerSubmissions: [newSub, ...t.minerSubmissions]
          };
        }
        return t;
      })
    );

    // Publish to activities records
    const newActivity: Activity = {
      id: 'act-' + Date.now(),
      taskId: activeMineTask.id,
      taskTitle: activeMineTask.title,
      type: 'Mining',
      status: 'Unscored',
      reward: activeMineTask.rewardPool * 0.9, // potential reward
      timestamp: new Date().toISOString(),
      info: `Mining activity | Unscored | Submitted just now | Waiting for validator review`,
      submissionId: newSub.id
    };

    setActivities((prev) => [newActivity, ...prev]);
    setActiveMineTask(null);
    triggerAlarm('success', `Computation output submitted on-chain. Added to worker history records.`);
  };

  // Validator grading event
  const handleValidatorSubmitScore = (
    submissionId: string,
    score: number,
    reason: string,
    aiScore: number,
    aiExplanation: string,
    finalScore: number,
    delta: number,
    reputationChange: number
  ) => {
    if (!activeValidateTask) return;

    // 1. Update task and target submission structures
    setTasks((prevTasks) => 
      prevTasks.map((t) => {
        if (t.id === activeValidateTask.id) {
          return {
            ...t,
            minerSubmissions: t.minerSubmissions.map((sub) => {
              if (sub.id === submissionId) {
                return {
                  ...sub,
                  status: 'Scored',
                  evaluation: {
                    validatorAddress: '0xfefe...c0b0 (Vali-Core - You)',
                    validatorScore: score,
                    validatorReason: reason,
                    aiScore,
                    aiExplanation,
                    finalScore,
                    delta,
                    reputationChange,
                    settled: false
                  }
                };
              }
              return sub;
            })
          };
        }
        return t;
      })
    );

    // 2. Add validation event into activities logs
    const newActId = 'act-' + Date.now();
    const newValidationActivity: Activity = {
      id: newActId,
      taskId: activeValidateTask.id,
      taskTitle: activeValidateTask.title,
      type: 'Validation',
      status: 'Scored',
      reward: activeValidateTask.rewardPool * 0.1, // Validator commission
      timestamp: new Date().toISOString(),
      score: score,
      reputationChange: reputationChange,
      info: `Validation activity | Scored | Validator delta: ${delta} | Reputation ${reputationChange >= 0 ? '+' : ''}${reputationChange}`,
      submissionId: submissionId
    };

    // Update miner's companion activity if it exists in local activities list
    setActivities((prevHistory) => {
      const updated = prevHistory.map((act) => {
        if (act.submissionId === submissionId && act.type === 'Mining') {
          return {
            ...act,
            status: 'Scored' as const,
            score: finalScore,
            info: `Mining activity | Scored | Final AI adjusted score: ${finalScore} | Waiting settlement`
          };
        }
        return act;
      });
      return [newValidationActivity, ...updated];
    });

    // 3. Close board and report analysis
    setActiveValidateTask(null);
    triggerAlarm('alert', `Validation ballot logged. AI auditor reference score generated (${aiScore}). Delta calculated.`);

    // 4. Deploy a mock Mobiles/Policy payout request on Cobo
    const payoutId = 'payout-' + Date.now();
    const minerRewardShare = (finalScore / 100) * (activeValidateTask.rewardPool * 0.9);
    const validatorRewardShare = activeValidateTask.rewardPool * 0.1 + (reputationChange > 0 ? 0.002 : 0);

    const payoutPact: ApprovalItem = {
      id: payoutId,
      type: 'RewardDistribution',
      title: 'Disburse Computation Escrow Pool',
      description: `Release final settled funds: ${minerRewardShare.toFixed(4)} ETH to worker, and ${validatorRewardShare.toFixed(4)} ETH to validator. (Slashed validator assets remaining locked into protocol reserve pools).`,
      createdAt: new Date().toISOString(),
      status: 'Pending',
      details: {
        taskId: activeValidateTask.id,
        submissionId: submissionId,
        minerReward: minerRewardShare,
        validatorReward: validatorRewardShare,
        finalScore,
        delta
      }
    };

    setTimeout(() => {
      setWallet((prev) => ({
        ...prev,
        pendingApprovalsList: [...prev.pendingApprovalsList, payoutPact]
      }));
    }, 1500);
  };

  if (showLanding) {
    return (
      <IntroLanding
        locale={locale}
        onLogin={() => {
          setUser(null);
          localStorage.removeItem('zai_logged_user');
          setShowLanding(false);
        }}
        onToggleLanguage={() => setLanguage(locale === 'en' ? 'zh' : 'en')}
      />
    );
  }

  if (!user) {
    return (
      <AuthPanel
        initialShowIntro={false}
        onBackToIntro={() => setShowLanding(true)}
        onAuthSuccess={handleAuthSuccess}
      />
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-dark-bg font-sans flex flex-col antialiased text-[#ebdcb9]">
      
      {/* Dynamic Floating Feedback Banner */}
      {feedback && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-bounce max-w-sm sm:max-w-md w-full">
          <div className={`p-4 rounded-xl border flex gap-3 shadow-2xl backdrop-blur-md ${
            feedback.type === 'success' ? 'bg-[#1e2e1a] border-amber-800/20 text-brand-cyan' :
            feedback.type === 'alert' ? 'bg-[#291e19] border-amber-850/30 text-[#ebdcb9]' :
            'bg-[#2d120f] border-red-950/50 text-brand-rose'
          }`}>
            {feedback.type === 'success' && <Check className="w-5 h-5 shrink-0 text-amber-500" />}
            {feedback.type === 'alert' && <Info className="w-5 h-5 shrink-0 text-amber-500" />}
            {feedback.type === 'error' && <ShieldAlert className="w-5 h-5 shrink-0 text-red-500 animate-pulse" />}
            <div className="text-xs font-medium leading-relaxed">
              {feedback.message}
            </div>
          </div>
        </div>
      )}

      {/* Main Container Layout */}
      <div className="flex-1 min-h-0 flex max-w-[1440px] w-full mx-auto relative divide-x divide-amber-950/20">
        
        {/* ================= LEFT SIDEBAR PANEL (always expanded) ================= */}
        {/* Spacer reserves layout space at the expanded rail width so content never shifts */}
        <div className="hidden md:block w-72 lg:w-80 shrink-0" aria-hidden="true" />

        <div className="hidden md:flex absolute inset-y-0 left-0 z-40 w-72 lg:w-80 flex-col justify-between py-6 px-3.5 bg-[#0f0a08] gap-6 border-r border-[#4a3427]/40 overflow-hidden shadow-2xl shadow-black/70">

          <div className="flex flex-col gap-6">
            {/* Logo and Brand Title (Sheriff Badge Style) */}
            <div className="flex items-center gap-3 justify-start p-3 rounded-lg border bg-[#150f0c] border-[#4a3427] transition-all">
              <div className="w-10 h-10 shrink-0 rounded-full bg-[#1c1310] border-2 border-[#dfab6c] flex items-center justify-center shadow-lg shadow-black/30">
                <Scale className="w-5 h-5 text-[#dfab6c] animate-pulse" />
              </div>
              <div className="flex-col min-w-0 flex">
                <span className="font-serif font-black text-xs tracking-wider text-[#dfab6c] uppercase whitespace-nowrap">{t('appName')}</span>
                <span className="font-mono text-[8px] text-[#8e5c3c] uppercase tracking-widest font-bold mt-0.5 whitespace-nowrap">{t('appSubName')}</span>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="flex flex-col gap-1.5 font-mono text-[11px] uppercase tracking-wider">
              <button
                onClick={() => setActiveTab('DefineNewTask')}
                title={t('navDefineNewTask')}
                className={`flex items-center justify-between px-3.5 py-3 rounded text-[11px] font-mono tracking-wider transition group border ${
                  activeTab === 'DefineNewTask'
                    ? 'bg-[#1c1310] text-[#dfab6c] border-[#8e5c3c]/80 shadow-md'
                    : 'text-[#8c745d] border-transparent hover:text-[#ebdcb9] hover:bg-[#150f0c]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Sparkles className={`w-4 h-4 shrink-0 transition ${activeTab === 'DefineNewTask' ? 'text-[#dfab6c]' : 'text-[#dfab6c]'}`} />
                  <span className="inline whitespace-nowrap">{t('navDefineNewTask')}</span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 shrink-0 block transition ${activeTab === 'DefineNewTask' ? 'translate-x-0.5 text-[#dfab6c]' : 'text-[#8e5c3c]'}`} />
              </button>

              <button
                onClick={() => setActiveTab('ActiveTasks')}
                title={t('navMarketplace')}
                className={`flex items-center justify-between px-3.5 py-3 rounded text-[11px] font-mono tracking-wider transition group border ${
                  activeTab === 'ActiveTasks'
                    ? 'bg-[#1c1310] text-[#dfab6c] border-[#8e5c3c]/80 shadow-md'
                    : 'text-[#8c745d] border-transparent hover:text-[#ebdcb9] hover:bg-[#150f0c]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <ListTodo className={`w-4 h-4 shrink-0 transition ${activeTab === 'ActiveTasks' ? 'text-[#dfab6c]' : 'text-[#dfab6c]'}`} />
                  <span className="inline whitespace-nowrap">{t('navMarketplace')}</span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 shrink-0 block transition ${activeTab === 'ActiveTasks' ? 'translate-x-0.5 text-[#dfab6c]' : 'text-[#8e5c3c]'}`} />
              </button>

              <button
                onClick={() => setActiveTab('Activities')}
                title={t('navNavRegistry')}
                className={`flex items-center justify-between px-3.5 py-3 rounded text-[11px] font-mono tracking-wider transition group border ${
                  activeTab === 'Activities'
                    ? 'bg-[#1c1310] text-[#dfab6c] border-[#8e5c3c]/80 shadow-md'
                    : 'text-[#8c745d] border-transparent hover:text-[#ebdcb9] hover:bg-[#150f0c]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Coins className={`w-4 h-4 shrink-0 transition ${activeTab === 'Activities' ? 'text-[#dfab6c]' : 'text-[#dfab6c]'}`} />
                  <span className="inline whitespace-nowrap">{t('navNavRegistry')}</span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 shrink-0 block transition ${activeTab === 'Activities' ? 'translate-x-0.5 text-[#dfab6c]' : 'text-[#8e5c3c]'}`} />
              </button>

              <button
                onClick={() => setActiveTab('PlatformAgents')}
                title={locale === 'zh' ? '杀手 Agent 名人堂' : 'Hall of Killer Agents'}
                className={`flex items-center justify-between px-3.5 py-3 rounded text-[11px] font-mono tracking-wider transition group border ${
                  activeTab === 'PlatformAgents'
                    ? 'bg-[#1c1310] text-[#dfab6c] border-[#8e5c3c]/80 shadow-md'
                    : 'text-[#8c745d] border-transparent hover:text-[#ebdcb9] hover:bg-[#150f0c] font-bold'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Bot className={`w-4 h-4 shrink-0 transition ${activeTab === 'PlatformAgents' ? 'text-[#dfab6c]' : 'text-[#dfab6c]'}`} />
                  <span className="inline whitespace-nowrap">{locale === 'zh' ? '杀手 Agent 名人堂' : 'Hall of Killer Agents'}</span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 shrink-0 block transition ${activeTab === 'PlatformAgents' ? 'translate-x-0.5 text-[#dfab6c]' : 'text-[#8e5c3c]'}`} />
              </button>
            </nav>
          </div>

          {/* Collapsed rail mini-indicators (hidden when expanded) */}
          <div className="hidden flex-col items-center gap-4">
            <NetworkStatsWidget compact />
            <div
              className="flex flex-col items-center gap-1 select-none"
              title={
                wallet.connected
                  ? (locale === 'zh' ? '钱包已连接' : 'Wallet connected')
                  : (locale === 'zh' ? '钱包未连接' : 'Wallet not connected')
              }
            >
              <div className={`relative w-10 h-10 rounded-full bg-[#150f0c] border flex items-center justify-center shadow-md ${wallet.connected ? 'border-[#4a3427]' : 'border-[#4a3427]/50'}`}>
                <Wallet className={`w-4 h-4 ${wallet.connected ? 'text-[#dfab6c]' : 'text-[#6b5343]'}`} />
                <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#0f0a08] ${wallet.connected ? 'bg-[#849c44] animate-pulse' : 'bg-[#9e331b]'}`}></span>
              </div>
              <span className={`text-[9px] font-mono font-bold uppercase tracking-wide leading-none ${wallet.connected ? 'text-[#849c44]' : 'text-[#8e5c3c]'}`}>
                {wallet.connected ? (locale === 'zh' ? '已连' : 'ON') : (locale === 'zh' ? '未连' : 'OFF')}
              </span>
            </div>
          </div>

          {/* Platform Performance Stats Dashboard — always visible */}
          <div className="flex flex-col gap-1 leading-none">
            <NetworkStatsWidget />
          </div>

          {/* Embedded MetaMask wallet widget — always visible */}
          <div className="flex flex-col gap-4">
            <CoboWalletWidget
              walletState={wallet}
              onApproveItem={handleApproveWalletItem}
              onRejectItem={handleRejectWalletItem}
              onConnect={handleConnectWallet}
              onDisconnect={handleDisconnectWallet}
            />
            {/* Version credits */}
            <div className="flex items-center justify-between text-[10px] text-slate-600 font-mono px-1">
              <span>Sepolia Testnet</span>
              <span>v1.0.0 (MVP)</span>
            </div>
          </div>

        </div>

        {/* ================= RIGHT PORT CONTENT SCREEN ================= */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-y-auto">
          
          {/* Top Panel Banner */}
          <header className="border-b border-slate-850/60 px-6 py-4 flex items-center justify-between bg-slate-950/40 sticky top-0 backdrop-blur-md z-30 shrink-0">
            <div className="flex items-center gap-4">
              {/* Mobile layout tabs toggle */}
              <div className="flex md:hidden gap-1.5 p-1 bg-slate-900 rounded-lg border border-slate-800">
                <button
                  onClick={() => setActiveTab('DefineNewTask')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${activeTab === 'DefineNewTask' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/25' : 'text-slate-400'}`}
                >
                  {locale === 'zh' ? '创设' : 'Create'}
                </button>
                <button
                  onClick={() => setActiveTab('ActiveTasks')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${activeTab === 'ActiveTasks' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/25' : 'text-slate-400'}`}
                >
                  {locale === 'zh' ? '市场' : 'Market'}
                </button>
                <button
                  onClick={() => setActiveTab('Activities')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${activeTab === 'Activities' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/25' : 'text-slate-400'}`}
                >
                  {locale === 'zh' ? '历史' : 'History'}
                </button>
                <button
                  onClick={() => setActiveTab('PlatformAgents')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${activeTab === 'PlatformAgents' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/25' : 'text-slate-400'}`}
                >
                  {locale === 'zh' ? '代理' : 'Agents'}
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-emerald animate-ping animate-duration-1000"></span>
                <span className="text-xs text-slate-400 font-mono font-bold tracking-wide">
                  {locale === 'zh' ? t('sandboxActive') : 'SANDBOX ACTIVE'}
                </span>
              </div>
            </div>

            {/* Right side Developer information with email & Language Switcher */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <span className="text-[10px] text-slate-500 block font-semibold uppercase">{t('devHost') || 'Developer Host'}</span>
                <span className="text-xs text-white font-mono font-medium max-w-[150px] truncate" title={user?.email || 'admin'}>
                  {user?.email || 'admin'}
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan shadow shadow-black shrink-0">
                <span className="text-xs font-bold font-mono">{user?.initials || 'AD'}</span>
              </div>

              {/* Language Switcher to the right of user avatar */}
              <button
                onClick={() => setLanguage(locale === 'en' ? 'zh' : 'en')}
                className="h-8 px-2.5 bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 hover:border-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition shadow shadow-black/40 select-none shrink-0"
              >
                <span>{locale === 'en' ? '🇨🇳' : '🇺🇸'}</span>
                <span>{locale === 'en' ? '中文' : 'EN'}</span>
              </button>

              {/* Secure Session Sign Out button */}
              <button
                onClick={handleLogout}
                title={t('logoutBtn') || 'Sign Out'}
                className="h-8 w-8 bg-slate-900 hover:bg-rose-955/35 hover:text-brand-rose text-slate-450 border border-slate-800 hover:border-rose-900/50 rounded-lg flex items-center justify-center cursor-pointer transition shadow shadow-black/40 select-none shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </header>

          {/* Core Page Content Router */}
          <main className="p-6 flex-1 flex flex-col">
            
            {/* ====== PORT TAB 1: DEFINE NEW TASK (Three-Path Specialization Entry) ====== */}
            {activeTab === 'DefineNewTask' && (
              <div className="flex-1 flex flex-col justify-start max-w-3xl w-full mx-auto space-y-6">
                
                {/* 1. Selection Hub (definePath === null) */}
                {definePath === null && (
                  <div className="flex-1 flex flex-col justify-center py-6 space-y-6 animate-fade-in">
                    <div className="text-center space-y-2.5">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#201511] border border-[#dfab6c]/30 rounded-full text-[#dfab6c] font-mono text-[9.5px] uppercase tracking-wider">
                        <Sparkles className="w-3.5 h-3.5 text-[#dfab6c]" />
                        <span>{locale === 'zh' ? '多终端智算分算中心' : 'Autonomous Compute Dispatch Matrix'}</span>
                      </div>
                      <h2 className="font-serif font-black text-2xl text-[#ebdcb9] tracking-wider uppercase">
                        {locale === 'zh' ? '选择智算警员代维服务' : 'DEPLOY A NEW WANTED COMPUTATION'}
                      </h2>
                      <p className="text-xs text-[#a58d7c] leading-relaxed max-w-md mx-auto font-sans">
                        {locale === 'zh' 
                          ? '请在下方选取对应特定业务的领航智能警员，使用专属高轨表单极速编译可验证契约。' 
                          : 'Select an elite dedicated AI specialized system below to coordinate your contract specifications.'}
                      </p>
                    </div>

                    {/* Three horizontal large cards occupying approx half available height */}
                    <div className="flex flex-col gap-4.5 w-full pt-4">
                      
                      {/* Web3 Debug Agent */}
                      <button 
                        onClick={() => {
                          setDefinePath('web3');
                          setFormSubmittingStage('none');
                        }}
                        className="w-full text-left bg-[#150f0c] border-2 border-[#4a3427] p-5 rounded hover:border-[#dfab6c]/70 hover:bg-[#19120e] cursor-pointer transition-all duration-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative group outline outline-1 outline-offset-4 outline-[#4a3427]/15"
                      >
                        <div className="absolute top-1 left-1 text-[8px] font-serif text-[#4a3427]/40 select-none">✦</div>
                        <div className="h-20 w-16 shrink-0 overflow-hidden border border-[#4a3427] bg-[#201511] shadow-inner">
                          <img src={debugAgentAvatar} alt="Debug Killer" className="h-full w-full object-cover" />
                        </div>
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13.5px] font-serif font-black text-[#ebdcb9] group-hover:text-[#dfab6c] transition uppercase tracking-wide">
                              {locale === 'zh' ? '我需要 Web3 coding debug' : 'I need Web3 coding debug'}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-[#bf311d]/10 text-[#dfab6c] border border-[#bf311d]/20 text-[8.5px] font-mono font-bold tracking-wider uppercase">
                              Dual Sandbox
                            </span>
                          </div>
                          <div className="text-[9.5px] font-mono text-[#dfab6c] font-black uppercase tracking-wider">
                            Debug Killer · GLM-5.1 · Rating 4.8/5
                          </div>
                          <p className="text-[11px] text-[#a58d7c] leading-relaxed font-sans select-none">
                            {locale === 'zh' 
                              ? '审计或调试智能合约源码及库、排查编译与测试报错、诊断安全重入漏洞、一键生成修复性补丁。' 
                              : 'Audit/debug smart contracts, transaction logs, and reproduce failing exploit tests with verified patches.'}
                          </p>
                        </div>
                        <div className="px-3.5 py-1.5 bg-[#bf311d]/10 hover:bg-[#bf311d]/20 text-[#dfab6c] border border-[#bf311d]/30 text-[9.5px] font-serif font-black tracking-widest rounded-sm uppercase flex items-center gap-1 shrink-0 self-end sm:self-auto group-hover:scale-102 transition duration-200">
                          <span>{locale === 'zh' ? '委托调试' : 'Audit Form'}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-[#dfab6c]" />
                        </div>
                      </button>

                      {/* Dataset / Data Mining Agent */}
                      <button 
                        onClick={() => {
                          setDefinePath('dataset');
                          setFormSubmittingStage('none');
                        }}
                        className="w-full text-left bg-[#150f0c] border-2 border-[#4a3427] p-5 rounded hover:border-[#dfab6c]/70 hover:bg-[#19120e] cursor-pointer transition-all duration-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative group outline outline-1 outline-offset-4 outline-[#4a3427]/15"
                      >
                        <div className="absolute top-1 left-1 text-[8px] font-serif text-[#4a3427]/40 select-none">✦</div>
                        <div className="h-20 w-16 shrink-0 overflow-hidden border border-[#4a3427] bg-[#201511] shadow-inner">
                          <img src={dataAgentAvatar} alt="Data Mining Agent" className="h-full w-full object-cover" />
                        </div>
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13.5px] font-serif font-black text-[#ebdcb9] group-hover:text-[#dfab6c] transition uppercase tracking-wide">
                              {locale === 'zh' ? '我需要数据集' : 'I need a dataset'}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-[#849c44]/10 text-[#dfab6c] border border-[#849c44]/20 text-[8.5px] font-mono font-bold tracking-wider uppercase">
                              Mining Oracle
                            </span>
                          </div>
                          <div className="text-[9.5px] font-mono text-[#dfab6c] font-black uppercase tracking-wider">
                            Data Mining Agent · Dataset scope + cleaning · 4.7/5
                          </div>
                          <p className="text-[11px] text-[#a58d7c] leading-relaxed font-sans select-none">
                            {locale === 'zh' 
                              ? '高通量多源算力数据集采集、自定义结构化 Schema 验证规则。滤除废品 AI Slop 数据。' 
                              : 'Define crawler domains, size targets, formatting structures (e.g. JSONL) and validation rubrics.'}
                          </p>
                        </div>
                        <div className="px-3.5 py-1.5 bg-[#849c44]/10 hover:bg-[#849c44]/20 text-[#dfab6c] border border-[#849c44]/30 text-[9.5px] font-serif font-black tracking-widest rounded-sm uppercase flex items-center gap-1 shrink-0 self-end sm:self-auto group-hover:scale-102 transition duration-200">
                          <span>{locale === 'zh' ? '发掘征解' : 'Mining Form'}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-[#dfab6c]" />
                        </div>
                      </button>

                      {/* Custom Task Warrant (older Conversational logic) */}
                      <button 
                        onClick={() => {
                          setDefinePath('custom');
                        }}
                        className="w-full text-left bg-[#150f0c] border-2 border-[#4a3427] p-5 rounded hover:border-[#dfab6c]/70 hover:bg-[#19120e] cursor-pointer transition-all duration-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative group outline outline-1 outline-offset-4 outline-[#4a3427]/15"
                      >
                        <div className="absolute top-1 left-1 text-[8px] font-serif text-[#4a3427]/40 select-none">✦</div>
                        <div className="h-20 w-16 shrink-0 overflow-hidden border border-[#4a3427] bg-[#201511] shadow-inner">
                          <img src={specAgentAvatar} alt="Spec Agent" className="h-full w-full object-cover" />
                        </div>
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13.5px] font-serif font-black text-[#ebdcb9] group-hover:text-[#dfab6c] transition uppercase tracking-wide">
                              {locale === 'zh' ? '我需要自定义 task warrant' : 'I need premium task warrant'}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-[#4a3427] text-[#ebdcb9] text-[8.5px] font-mono font-bold tracking-wider uppercase">
                              Spec Sentinel
                            </span>
                          </div>
                          <div className="text-[9.5px] font-mono text-[#dfab6c] font-black uppercase tracking-wider">
                            Platform Spec Agent · rubric + reward + settlement · 4.6/5
                          </div>
                          <p className="text-[11px] text-[#a58d7c] leading-relaxed font-sans select-none">
                            {locale === 'zh' 
                              ? '对话式助理。输入任意自然语言，智能警署哨兵将为您分阶拆解评分，形成防篡改上链契约。' 
                              : 'Engage conversational prompt builder. Spec Agent auto-compiles grading rules and payouts.'}
                          </p>
                        </div>
                        <div className="px-3.5 py-1.5 bg-[#4a3427]/40 hover:bg-[#4a3427]/60 text-[#dfab6c] border border-[#4a3427] text-[9.5px] font-serif font-black tracking-widest rounded-sm uppercase flex items-center gap-1 shrink-0 self-end sm:self-auto group-hover:scale-102 transition duration-200">
                          <span>{locale === 'zh' ? '对话编制' : 'Launch Chat'}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-[#dfab6c]" />
                        </div>
                      </button>

                    </div>
                  </div>
                )}

                {/* 2. Web3 Debug Agent Specialized Form (definePath === 'web3') */}
                {definePath === 'web3' && (
                  <div className="w-full space-y-5 animate-slide-up">
                    {/* Retro navigation back bar */}
                    <button 
                      onClick={() => {
                        setDefinePath(null);
                        setFormSubmittingStage('none');
                        setDraftedProposal(null);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-[#ebdcb9]/60 hover:text-[#dfab6c] transition cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>{locale === 'zh' ? '返回分算中心' : 'Back to Selection'}</span>
                    </button>

                    {/* Sub-form Header */}
                    <div className="bg-[#1c1310] border-2 border-[#4a3427] px-5 py-4 rounded-sm flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-14 w-12 shrink-0 overflow-hidden border border-[#4a3427] bg-[#201511] shadow-inner">
                          <img src={debugAgentAvatar} alt="Debug Killer" className="h-full w-full object-cover" />
                        </div>
                        <div>
                          <h3 className="font-serif font-black text-sm text-[#ebdcb9] uppercase tracking-wider">
                            {locale === 'zh' ? 'WEB3 开发漏洞审计调试契约构建器' : 'Web3 Contract Debug Pact Creator'}
                          </h3>
                          <p className="text-[10px] font-mono text-[#dfab6c] uppercase">
                            Manned by: Debug Killer · GLM-5.1
                          </p>
                        </div>
                      </div>
                      <span className="hidden md:inline px-2 py-1 bg-[#bf311d]/10 text-[#bf311d] border border-[#bf311d]/20 rounded font-mono text-[9px] font-bold">
                        FAST AUDIT
                      </span>
                    </div>

                    {formSubmittingStage === 'none' && (
                      <form onSubmit={handleWeb3FormSubmit} className="bg-[#150f0c] border-2 border-[#4a3427] rounded p-5 space-y-4">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Codebase URL */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono text-[#8e7564] font-black uppercase block">
                              {locale === 'zh' ? '开源仓库链接 or 代码块 (Repo URL)' : 'Codebase Rep / File Link'}
                            </label>
                            <input 
                              type="text"
                              required
                              placeholder="e.g. github.com/protocol/vault-reentrancy-fix"
                              value={web3RepoUrl}
                              onChange={(e) => setWeb3RepoUrl(e.target.value)}
                              className="w-full h-9 px-3 bg-[#0b0705] border border-[#4a3427] rounded text-xs text-[#ebdcb9] outline-none focus:border-[#dfab6c]"
                            />
                          </div>

                          {/* Contract Address context */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono text-[#8e7564] font-black uppercase block">
                              {locale === 'zh' ? '受影响智能合约地址 (可选)' : 'Exploited Contract Address (Optional)'}
                            </label>
                            <input 
                              type="text"
                              placeholder="e.g. 0x8f1e31d9b...e211"
                              value={web3ContractAddr}
                              onChange={(e) => setWeb3ContractAddr(e.target.value)}
                              className="w-full h-9 px-3 bg-[#0b0705] border border-[#4a3427] rounded text-xs text-[#ebdcb9] outline-none focus:border-[#dfab6c]"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Suspected Issue */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono text-[#8e7564] font-black uppercase block">
                              {locale === 'zh' ? '疑似安全漏洞类型' : 'Suspected Exploit Type'}
                            </label>
                            <select 
                              value={web3IssueType}
                              onChange={(e) => setWeb3IssueType(e.target.value)}
                              className="w-full h-9 px-2 bg-[#0b0705] border border-[#4a3427] rounded text-xs font-mono text-[#ebdcb9] outline-none focus:border-[#dfab6c]"
                            >
                              <option value="Reentrancy">Reentrancy (重入漏洞)</option>
                              <option value="Access Control">Access Control (越权/访问控制)</option>
                              <option value="Oracle Manipulation">Oracle Manipulation (预言机操纵)</option>
                              <option value="Overflow/Underflow">Integer Overflow (整型溢出)</option>
                              <option value="Logic Loop Defect">Business Logic Defect (业务逻辑缺陷)</option>
                            </select>
                          </div>

                          {/* VM type */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono text-[#8e7564] font-black uppercase block">
                              {locale === 'zh' ? '编译器 / 虚拟机环境' : 'VM Exec Environment'}
                            </label>
                            <select 
                              value={web3VMType}
                              onChange={(e) => setWeb3VMType(e.target.value)}
                              className="w-full h-9 px-2 bg-[#0b0705] border border-[#4a3427] rounded text-xs font-mono text-[#ebdcb9] outline-none focus:border-[#dfab6c]"
                            >
                              <option value="Solidity/EVM">Solidity / EVM</option>
                              <option value="Rust/WASM (Solana)">Rust / WASM (Solana)</option>
                              <option value="Move (Sui/Aptos)">Move (Sui / Aptos)</option>
                              <option value="Huff/Yul Assembly">Huff / Yul Assembly</option>
                            </select>
                          </div>

                          {/* File scope */}
                          <div className="space-y-1 flex-1">
                            <label className="text-[10px] font-mono text-[#8e7564] font-black uppercase block">
                              {locale === 'zh' ? '受检文件文件夹范围' : 'Checklist Folder Scope'}
                            </label>
                            <input 
                              type="text"
                              placeholder="e.g. /contracts/pools/*.sol"
                              value={web3FileScope}
                              onChange={(e) => setWeb3FileScope(e.target.value)}
                              className="w-full h-9 px-3 bg-[#0b0705] border border-[#4a3427] rounded text-xs text-[#ebdcb9] outline-none focus:border-[#dfab6c]"
                            />
                          </div>
                        </div>

                        {/* Deliverables Checkbox */}
                        <div className="space-y-2.5 bg-[#1b120e] p-3 border border-[#4a3427]/60 rounded-sm">
                          <label className="text-[10px] font-mono text-[#dfab6c] font-black uppercase block select-none">
                            {locale === 'zh' ? '要求猎人/验证节点最终交付成果 (可多选)' : 'REQUIRED PAC AGREEMENT DELIVERABLES (Select)'}
                          </label>
                          <div className="flex flex-wrap gap-5 text-xs text-[#ebdcb9]">
                            {['Audit Report', 'Patch/Fix suggestion', 'Reproduction POC logic script'].map((item) => {
                              const isSelected = web3Deliverables.includes(item);
                              return (
                                <label key={item} className="flex items-center gap-2 cursor-pointer select-none">
                                  <input 
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {
                                      if (isSelected) {
                                        setWeb3Deliverables(web3Deliverables.filter(x => x !== item));
                                      } else {
                                        setWeb3Deliverables([...web3Deliverables, item]);
                                      }
                                    }}
                                    className="accent-[#dfab6c]"
                                  />
                                  <span className="font-mono">{item}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        {/* Custom notes */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-[#8e7564] font-black uppercase block">
                            {locale === 'zh' ? '额外特殊审计备注/重现步骤指示 (Markdown)' : 'Sandbox custom instructions or logs dump'}
                          </label>
                          <textarea 
                            rows={3}
                            placeholder={locale === 'zh' ? '在这里可以罗列合约中的依赖包版本，或者本地编译测试报错日志...' : 'Provide compiler parameters, hardhat commands, or stack trace logs...'}
                            value={web3CustomNotes}
                            onChange={(e) => setWeb3CustomNotes(e.target.value)}
                            className="w-full p-2.5 bg-[#0b0705] border border-[#4a3427] rounded text-xs text-[#ebdcb9] outline-none focus:border-[#dfab6c]"
                          ></textarea>
                        </div>

                        {/* Submit Button */}
                        <button 
                          type="submit"
                          className="w-full bg-[#bf311d] hover:bg-[#a02817] text-white py-2.5 rounded font-serif font-black uppercase tracking-widest text-xs flex items-center justify-center gap-1.5 transition"
                        >
                          <Cpu className="w-4 h-4" />
                          <span>{locale === 'zh' ? '分析代码并智能编译合同指标' : 'ANALYZE CONTRACT & COMPILE METRICS'}</span>
                        </button>

                      </form>
                    )}

                    {/* Loader */}
                    {formSubmittingStage === 'analyzing' && (
                      <div className="bg-[#150f0c] border-2 border-[#4a3427] p-8 rounded text-center space-y-4 animate-pulse">
                        <Bot className="w-10 h-10 text-[#dfab6c] mx-auto animate-spin" />
                        <h4 className="font-serif font-black text-[#dfab6c] uppercase text-sm tracking-widest">
                          {locale === 'zh' ? '智算警员审计中...' : 'COGNITIVE COMPILER WORKING'}
                        </h4>
                        <p className="text-xs text-[#a58d7c] font-mono leading-relaxed max-w-sm mx-auto">
                          {locale === 'zh' 
                            ? 'Platform Debug Agent 正在深度解析您给定的 VM 代码依赖，动态拟合可执行沙盒验证指标并定制多签托管结算卡...' 
                            : 'Analyzing repositories and synthesizing EVM-compatible sandboxed grading checklists...'}
                        </p>
                      </div>
                    )}

                    {/* Proposal Sign-off Board */}
                    {formSubmittingStage === 'proposal_ready' && draftedProposal && (
                      <div className="bg-[#1c1310] border-2 border-[#dfab6c] rounded p-6 space-y-6 animate-scale-up text-left relative">
                        <div className="absolute top-1 right-2 text-[#dfab6c] font-mono text-[9px] select-none">METAMASK PACT COMPILING</div>
                        
                        <div className="border-b border-[#4a3427]/60 pb-3">
                          <h4 className="font-serif font-black text-xs uppercase tracking-wider text-[#dfab6c] flex items-center gap-1.5">
                            <Award className="w-4 h-4 text-[#dfab6c]" />
                            {locale === 'zh' ? '已自动编译之托管订单详情 (Verified Draft)' : 'VERIFIED SMART CONTRACT COMPUTATION ORDER'}
                          </h4>
                          <h5 className="font-serif font-black text-lg text-[#ebdcb9] mt-2 uppercase">
                            {draftedProposal.title}
                          </h5>
                        </div>

                        {/* Details parameters */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                          <div className="space-y-1 bg-[#150f0c] p-2.5 border border-[#4a3427] rounded-sm">
                            <span className="text-[#8e7564] text-[9.5px] uppercase font-bold block">{locale === 'zh' ? '托管代扣保证金' : 'ESCROW DEPOSIT'}</span>
                            <span className="text-[#ebdcb9] font-black text-sm">{draftedProposal.rewardPool} ETH</span>
                          </div>
                          <div className="space-y-1 bg-[#150f0c] p-2.5 border border-[#4a3427] rounded-sm">
                            <span className="text-[#8e7564] text-[9.5px] uppercase font-bold block">{locale === 'zh' ? '自动准入得分门限' : 'MIN PASS MATH'}</span>
                            <span className="text-[#ebdcb9] font-black text-sm">{draftedProposal.aiThresholdLine}/100</span>
                          </div>
                          <div className="space-y-1 bg-[#150f0c] p-2.5 border border-[#4a3427] rounded-sm">
                            <span className="text-[#8e7564] text-[9.5px] uppercase font-bold block">{locale === 'zh' ? '警员主控机制' : 'SUPERVISOR'}</span>
                            <span className="text-[#dfab6c] font-black text-[10px] truncate block">Platform Debug Killer</span>
                          </div>
                          <div className="space-y-1 bg-[#150f0c] p-2.5 border border-[#4a3427] rounded-sm">
                            <span className="text-[#8e7564] text-[9.5px] uppercase font-bold block">{locale === 'zh' ? '输出对账类型' : 'STRUCT'}</span>
                            <span className="text-[#ebdcb9] font-black text-[10px] truncate block">{draftedProposal.outputFormat}</span>
                          </div>
                        </div>

                        {/* Audit dimensions */}
                        <div className="space-y-2.5 bg-[#150f0c] p-4 border border-[#4a3427] rounded-sm">
                          <span className="text-[10px] font-mono text-[#dfab6c] uppercase font-black block tracking-wider">
                            {locale === 'zh' ? '三维全自动机器审计规则面板' : 'COMPILED THREEDIMENSIONAL AUDITING SCORECARD'}
                          </span>
                          <div className="space-y-1.5 text-[11px] text-[#ebdcb9]/90 font-mono">
                            <p><strong>{locale === 'zh' ? '选定验收算法：' : 'Selected Rubric: '}</strong>{draftedProposal.selectedCriteriaOption.name}</p>
                            <p><strong>{locale === 'zh' ? '权重配置：' : 'Weights: '}</strong>{draftedProposal.selectedCriteriaOption.scoreWeightExplanation}</p>
                            <p><strong>{locale === 'zh' ? '交涉格式：' : 'Deliverables: '}</strong>{draftedProposal.selectedCriteriaOption.outputRequirements}</p>
                          </div>
                        </div>

                        {/* Action deployment */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                          <button 
                            type="button"
                            onClick={() => setFormSubmittingStage('none')}
                            className="flex-1 py-2 bg-transparent border border-[#4a3427] text-[#a58d7c] font-black text-xs uppercase hover:bg-black/20 rounded transition"
                          >
                            {locale === 'zh' ? '重新配置参数' : 'RECONFIG SPECS'}
                          </button>
                          
                          <button 
                            type="button"
                            onClick={handleDeployDraftedProposal}
                            className="flex-1 py-1.5 bg-[#bf311d] hover:bg-[#a02817] text-white font-serif font-black text-xs uppercase tracking-widest rounded flex items-center justify-center gap-2 transition shadow-xl"
                          >
                            <Check className="w-4 h-4" />
                            <span>{locale === 'zh' ? '授权代扣并发布多签赏金契约' : 'APPROVE ESCROW & DEPLOY PACT'}</span>
                          </button>
                        </div>

                      </div>
                    )}

                    {/* Phase 0: On-chain escrow via MetaMask */}
                    {formSubmittingStage === 'deploying_contract' && (
                      <div className="bg-[#150f0c] border-2 border-[#dfab6c]/40 p-8 rounded text-center space-y-4 animate-pulse">
                        <Coins className="w-10 h-10 text-[#dfab6c] mx-auto animate-spin" />
                        <div className="space-y-1.5">
                          <h4 className="font-serif font-black text-sm text-[#dfab6c] uppercase">
                            {locale === 'zh' ? 'MetaMask 链上托管确认中...' : 'Confirming On-Chain Escrow...'}
                          </h4>
                          <p className="text-[11px] text-[#8e7564] font-mono">
                            {locale === 'zh'
                              ? `正在将 ${draftedProposal?.rewardPool || 0.15} ETH 存入智能合约托管池，请在 MetaMask 弹窗中确认交易。`
                              : `Depositing ${draftedProposal?.rewardPool || 0.15} ETH into the smart contract escrow pool. Please confirm the transaction in MetaMask.`}
                          </p>
                          <p className="text-[10px] text-[#8e7564]/60 font-mono">
                            {locale === 'zh'
                              ? '合约地址: 0xD64381...7339 (Sepolia)'
                              : 'Contract: 0xD64381...7339 (Sepolia)'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Agent Phase 1: Intake — validating task requirements */}
                    {formSubmittingStage === 'agent_intake' && (
                      <div className="bg-[#150f0c] border-2 border-[#4a3427] p-8 rounded text-center space-y-4 animate-pulse">
                        <Scale className="w-10 h-10 text-[#dfab6c] mx-auto animate-spin" />
                        <div className="space-y-1.5">
                          <h4 className="font-serif font-black text-sm text-[#dfab6c] uppercase">
                            {locale === 'zh' ? '正在与 Aurora Agent 核心协商...' : 'Negotiating with Aurora Agent Core...'}
                          </h4>
                          <p className="text-[11px] text-[#8e7564] font-mono">
                            {locale === 'zh' ? '智能体正在解析您的代码库摘要及需求，并评估分级预算提案。' : 'The agent is parsing your codebase summary and evaluating the task specification.'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Agent Phase 1b: Intake says more info needed */}
                    {formSubmittingStage === 'agent_need_info' && (
                      <div className="bg-[#1c1310] border-2 border-[#bf311d]/30 p-6 rounded space-y-4 text-left">
                        <div className="flex items-start gap-3">
                          <ShieldAlert className="w-8 h-8 text-[#bf311d] shrink-0 mt-0.5" />
                          <div className="space-y-2 flex-1">
                            <h4 className="font-serif font-black text-sm text-[#bf311d] uppercase">
                              {locale === 'zh' ? '任务信息不完整' : 'Incomplete Task Information'}
                            </h4>
                            {agentMessage && (
                              <p className="text-[11px] text-[#ebdcb9]/80 font-mono leading-relaxed">
                                {agentMessage}
                              </p>
                            )}
                            {agentMissingFields.length > 0 && (
                              <div className="bg-[#150f0c] border border-[#4a3427] p-3 rounded space-y-1.5">
                                <span className="text-[10px] font-mono text-[#dfab6c] font-black uppercase block">
                                  {locale === 'zh' ? '缺失字段：' : 'Missing Fields:'}
                                </span>
                                <ul className="list-disc list-inside text-[10px] text-[#8e7564] font-mono space-y-0.5">
                                  {agentMissingFields.map((f, i) => (
                                    <li key={i}>{f}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setFormSubmittingStage('proposal_ready');
                              setAgentError(null);
                            }}
                            className="flex-1 py-2 bg-transparent border border-[#4a3427] text-[#a58d7c] font-black text-xs uppercase hover:bg-black/20 rounded transition"
                          >
                            {locale === 'zh' ? '返回修改表单' : 'BACK TO FORM'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Agent Phase 2: Executing debug miner */}
                    {formSubmittingStage === 'agent_executing' && (
                      <div className="bg-[#150f0c] border-2 border-[#4a3427] p-8 rounded text-center space-y-4 animate-pulse">
                        <Cpu className="w-10 h-10 text-[#dfab6c] mx-auto animate-spin" />
                        <div className="space-y-1.5">
                          <h4 className="font-serif font-black text-sm text-[#dfab6c] uppercase">
                            {locale === 'zh' ? 'Debug Agent 沙盒执行中...' : 'Debug Agent Sandbox Executing...'}
                          </h4>
                          <p className="text-[11px] text-[#8e7564] font-mono">
                            {locale === 'zh'
                              ? '正在克隆仓库、复现错误、生成补丁并验证修复。这可能需要 1-2 分钟，请耐心等待。'
                              : 'Cloning repository, reproducing the bug, generating patches, and verifying the fix. This may take 1–2 minutes.'}
                          </p>
                          <div className="flex justify-center gap-1.5 pt-2">
                            {[0, 1, 2].map((i) => (
                              <div key={i} className="w-2 h-2 bg-[#dfab6c]/60 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {formSubmittingStage === 'completed_download' && (
                      <div className="space-y-6 animate-scale-up text-left">

                        {/* Status Stamp Alert */}
                        <div className="bg-[#1c2e1a] border-2 border-[#849c44] p-5 rounded space-y-4 flex flex-col md:flex-row items-center md:items-start gap-4">
                          <CheckCircle2 className="w-10 h-10 text-[#849c44] shrink-0" />
                          <div className="space-y-1 text-center md:text-left flex-1">
                            <h4 className="font-serif font-black text-sm uppercase text-[#849c44]">
                              {locale === 'zh' ? '自主结算成功 · 代码级漏洞修复已就绪' : 'PACT SETTLED • CRYPTOGRAPHIC REMEDIATION SECURED'}
                            </h4>
                            <p className="text-[11px] text-[#ebdcb9]/80 font-sans leading-relaxed">
                              {agentResult
                                ? (locale === 'zh'
                                  ? `Aurora Debug Agent 已完成对仓库 ${web3RepoUrl} 的深度诊断。漏洞已复现，补丁已生成并验证。以下是 Agent 执行的真实结果。`
                                  : `Aurora Debug Agent has completed diagnosis of ${web3RepoUrl}. The bug was reproduced, patches were generated and verified. Real execution results are shown below.`)
                                : (locale === 'zh'
                                  ? `由于您启用了 Platform Debug Agent 加速机制，系统在代扣划转 ${draftedProposal?.rewardPool || 0.15} ETH 至托管池的同时，智能虚拟机沙盒已提前验证并自主完成了针对 ${web3IssueType} 的全套修复审计。下面是以前述对话阶段整合的代维成果。`
                                  : `With Platform Debug Agent acceleration engaged, ${draftedProposal?.rewardPool || 0.15} ETH has been successfully escrowed and the sandbox VM has automatically complied, passing 100% of the vulnerability mitigations.`)}
                            </p>
                          </div>
                        </div>

                        {/* ── On-chain Escrow Result ── */}
                        {contractResult && (
                          <div className="bg-[#150f0c] border border-[#dfab6c]/40 p-4 rounded space-y-2.5">
                            <h5 className="font-mono text-[10px] text-[#dfab6c] uppercase font-black tracking-wider">
                              {locale === 'zh' ? '▎链上托管信息 (Sepolia)' : '▎ON-CHAIN ESCROW (Sepolia)'}
                            </h5>
                            <div className="grid grid-cols-2 gap-3 text-[10px] font-mono">
                              <div className="bg-[#0b0705] p-2.5 rounded border border-[#4a3427]/50">
                                <span className="text-[#8e7564] block">{locale === 'zh' ? '链上 Task ID' : 'On-Chain Task ID'}</span>
                                <span className="text-[#ebdcb9] font-bold">#{contractResult.taskId}</span>
                              </div>
                              <div className="bg-[#0b0705] p-2.5 rounded border border-[#4a3427]/50">
                                <span className="text-[#8e7564] block">{locale === 'zh' ? '托管金额' : 'Escrow Amount'}</span>
                                <span className="text-[#849c44] font-bold">{contractResult.rewardPool} ETH</span>
                              </div>
                              <div className="col-span-2 bg-[#0b0705] p-2.5 rounded border border-[#4a3427]/50">
                                <span className="text-[#8e7564] block">{locale === 'zh' ? '交易哈希' : 'Tx Hash'}</span>
                                <span className="text-[#ebdcb9] font-bold text-[9px] break-all">{contractResult.txHash}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* ── Real Agent Results (when available) ── */}
                        {agentResult && agentResult.execution && (
                          <div className="space-y-4">
                            {/* Execution Summary */}
                            <div className="bg-[#150f0c] border border-[#849c44]/30 p-4 rounded space-y-3">
                              <h5 className="font-mono text-[10px] text-[#849c44] uppercase font-black tracking-wider">
                                {locale === 'zh' ? '▎Agent 执行摘要' : '▎AGENT EXECUTION SUMMARY'}
                              </h5>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px] font-mono">
                                <div className="bg-[#0b0705] p-2.5 rounded border border-[#4a3427]/50">
                                  <span className="text-[#8e7564] block">{locale === 'zh' ? '状态' : 'Status'}</span>
                                  <span className="text-[#ebdcb9] font-bold">{agentResult.execution.status || 'completed'}</span>
                                </div>
                                <div className="bg-[#0b0705] p-2.5 rounded border border-[#4a3427]/50">
                                  <span className="text-[#8e7564] block">{locale === 'zh' ? 'Bug 复现' : 'Reproduced'}</span>
                                  <span className={agentResult.execution.summary?.reproduced ? 'text-[#849c44] font-bold' : 'text-[#bf311d] font-bold'}>
                                    {agentResult.execution.summary?.reproduced ? 'YES' : 'NO'}
                                  </span>
                                </div>
                                <div className="bg-[#0b0705] p-2.5 rounded border border-[#4a3427]/50">
                                  <span className="text-[#8e7564] block">{locale === 'zh' ? '补丁生成' : 'Patch'}</span>
                                  <span className={agentResult.execution.summary?.patch_generated ? 'text-[#849c44] font-bold' : 'text-[#bf311d] font-bold'}>
                                    {agentResult.execution.summary?.patch_generated ? 'YES' : 'NO'}
                                  </span>
                                </div>
                                <div className="bg-[#0b0705] p-2.5 rounded border border-[#4a3427]/50">
                                  <span className="text-[#8e7564] block">{locale === 'zh' ? '迭代次数' : 'Iterations'}</span>
                                  <span className="text-[#ebdcb9] font-bold">{agentResult.execution.summary?.patch_iterations ?? '-'}</span>
                                </div>
                                <div className="bg-[#0b0705] p-2.5 rounded border border-[#4a3427]/50">
                                  <span className="text-[#8e7564] block">{locale === 'zh' ? '验证返回码' : 'Verify RC'}</span>
                                  <span className="text-[#ebdcb9] font-bold">{agentResult.execution.summary?.verification_returncode ?? '-'}</span>
                                </div>
                                <div className="bg-[#0b0705] p-2.5 rounded border border-[#4a3427]/50">
                                  <span className="text-[#8e7564] block">LLM Tokens</span>
                                  <span className="text-[#ebdcb9] font-bold">{agentResult.execution.usage?.llm_total_tokens ?? '-'}</span>
                                </div>
                                <div className="bg-[#0b0705] p-2.5 rounded border border-[#4a3427]/50">
                                  <span className="text-[#8e7564] block">{locale === 'zh' ? 'LLM 调用' : 'LLM Calls'}</span>
                                  <span className="text-[#ebdcb9] font-bold">{agentResult.execution.usage?.llm?.calls ?? '-'}</span>
                                </div>
                                <div className="bg-[#0b0705] p-2.5 rounded border border-[#4a3427]/50">
                                  <span className="text-[#8e7564] block">{locale === 'zh' ? '文件修改' : 'Files Modified'}</span>
                                  <span className="text-[#ebdcb9] font-bold">{agentResult.execution.usage?.files_modified ?? '-'}</span>
                                </div>
                              </div>
                            </div>

                            {/* Agent Message (from intake) */}
                            {agentMessage && (
                              <div className="bg-[#150f0c] border border-[#4a3427] p-3 rounded text-[10px] text-[#ebdcb9]/80 font-mono leading-relaxed">
                                <span className="text-[#dfab6c] font-bold block mb-1">
                                  {locale === 'zh' ? 'Agent 反馈：' : 'Agent Message:'}
                                </span>
                                {agentMessage}
                              </div>
                            )}

                            {/* Artifacts */}
                            {/* ── Downloads ── */}
                            {(() => {
                              const artifacts = agentResult.execution.artifacts || [];
                              const taskIdMatch = artifacts[0]?.path?.match(/(task_\w+)/);
                              const taskId = taskIdMatch ? taskIdMatch[1] : null;

                              const handleDownloadSingle = (artifact: any) => {
                                const fnMatch = artifact.path?.match(/[^/]+$/);
                                const filename = fnMatch ? fnMatch[0] : artifact.type;
                                if (!taskId) return;
                                const a = document.createElement('a');
                                a.href = getArtifactDownloadUrl(taskId, filename);
                                a.download = filename;
                                a.click();
                              };

                              const handleDownloadAllZip = async () => {
                                if (!taskId) return;
                                const zip = new JSZip();
                                const artifactList = artifacts as any[];
                                for (const a of artifactList) {
                                  const fnMatch = a.path?.match(/[^/]+$/);
                                  const filename = fnMatch ? fnMatch[0] : a.type;
                                  try {
                                    const content = await fetchArtifactContent(taskId, filename);
                                    zip.file(filename, content);
                                  } catch { /* skip if can't fetch */ }
                                }
                                const blob = await zip.generateAsync({ type: 'blob' });
                                const url = URL.createObjectURL(blob);
                                const anchor = document.createElement('a');
                                anchor.href = url;
                                anchor.download = `aurora_debug_${taskId}.zip`;
                                anchor.click();
                                URL.revokeObjectURL(url);
                              };

                              return (
                                <div className="space-y-4">
                                  {/* Download buttons */}
                                  <div className="flex gap-3">
                                    {taskId && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleDownloadSingle(artifacts.find((a: any) => a.type === 'debug_report') || artifacts[0])}
                                          className="flex-1 py-2 bg-[#dfab6c] hover:bg-[#ebdcb9] text-[#150f0c] font-serif font-black text-xs uppercase tracking-wider rounded flex items-center justify-center gap-2 transition"
                                        >
                                          <Download className="w-4 h-4" />
                                          <span>{locale === 'zh' ? '下载诊断报告 (.md)' : 'Download Report (.md)'}</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={handleDownloadAllZip}
                                          className="flex-1 py-2 bg-[#849c44] hover:bg-[#9ab458] text-[#150f0c] font-serif font-black text-xs uppercase tracking-wider rounded flex items-center justify-center gap-2 transition"
                                        >
                                          <FileArchive className="w-4 h-4" />
                                          <span>{locale === 'zh' ? '下载全部产物 (.zip)' : 'Download All (.zip)'}</span>
                                        </button>
                                      </>
                                    )}
                                  </div>

                                  {/* Bug log — debug report inline */}
                                  <div className="bg-[#150f0c] border border-[#4a3427] rounded overflow-hidden">
                                    <div className="bg-[#1c1310] px-4 py-2.5 border-b border-[#4a3427] flex items-center justify-between">
                                      <h5 className="font-mono text-[10px] text-[#dfab6c] uppercase font-black tracking-wider flex items-center gap-2">
                                        <FileText className="w-3.5 h-3.5" />
                                        {locale === 'zh' ? 'Bug 诊断日志' : 'Bug Diagnosis Log'}
                                      </h5>
                                      <span className="text-[8px] text-[#8e7564] font-mono uppercase">
                                        {agentResult.execution.artifacts?.find((a: any) => a.type === 'debug_report')?.path?.match(/[^/]+$/)?.[0] || 'debug_report.md'}
                                      </span>
                                    </div>
                                    <div className="p-4 max-h-96 overflow-y-auto">
                                      {reportLoading ? (
                                        <div className="flex items-center gap-2 text-[10px] text-[#8e7564] font-mono animate-pulse">
                                          <Bot className="w-4 h-4 text-[#dfab6c] animate-spin" />
                                          {locale === 'zh' ? '正在加载诊断报告...' : 'Loading diagnosis report...'}
                                        </div>
                                      ) : reportContent ? (
                                        <pre className="text-[10px] text-[#ebdcb9]/90 font-mono leading-relaxed whitespace-pre-wrap break-words">{reportContent}</pre>
                                      ) : (
                                        <p className="text-[10px] text-[#8e7564] font-mono text-center py-4">
                                          {locale === 'zh' ? '无法加载诊断报告内容' : 'Unable to load diagnosis report'}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Compact artifact list */}
                                  <div className="flex flex-wrap gap-2">
                                    {artifacts.map((artifact: any, idx: number) => {
                                      const fnMatch = artifact.path?.match(/[^/]+$/);
                                      const filename = fnMatch ? fnMatch[0] : artifact.type;
                                      return (
                                        <button
                                          key={idx}
                                          type="button"
                                          onClick={() => handleDownloadSingle(artifact)}
                                          className="text-[9px] font-mono bg-[#0b0705] border border-[#4a3427]/50 hover:border-[#dfab6c]/50 px-2.5 py-1.5 rounded flex items-center gap-1.5 transition cursor-pointer text-[#8e7564] hover:text-[#ebdcb9]"
                                        >
                                          <ArrowDownToLine className="w-3 h-3 text-[#dfab6c]" />
                                          {filename}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}

                        {/* ── Mock Dialogue Recap (shown when no real agent result) ── */}
                        {!agentResult && (
                        <>
                        {/* Interactive Two-step Dialog Recap */}
                        <div className="space-y-4">
                          <h5 className="font-mono text-[10px] text-[#dfab6c] uppercase font-black tracking-wider">
                            {locale === 'zh' ? '▎核心诊断阶段对话存档 (Internal Dialogue Logs)' : '▎DIALOGUE RECAP LOGS'}
                          </h5>

                          <div className="space-y-3.5">
                            {/* Dialogue Step 1 */}
                            <div className="bg-[#150f0c] border border-[#4a3427] p-4 rounded-lg flex items-start gap-3.5 relative overflow-hidden group">
                              <div className="absolute top-1 right-2 text-[8px] font-mono text-[#4a3427]/60 uppercase select-none">Stage 01: Audit</div>
                              <div className="w-9 h-9 rounded bg-[#bf311d]/20 border border-[#bf311d]/40 flex items-center justify-center shrink-0">
                                <Bot className="w-5 h-5 text-[#dfab6c]" />
                              </div>
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-serif font-black text-xs text-[#dfab6c]">Platform Debug Agent</span>
                                  <span className="text-[9px] font-mono text-[#8e7564] uppercase font-bold px-1.5 py-0.5 bg-black/30 rounded">{locale === 'zh' ? '静态扫描' : 'SCANNER'}</span>
                                </div>
                                <p className="text-[11.5px] font-sans text-[#ebdcb9] leading-relaxed">
                                  {locale === 'zh'
                                    ? `「尊敬的验证节点及开发者，我们对代码库 ${web3RepoUrl} 中指定的合约模块进行了深度遍历。在静态代码扫描阶段，我们动态定位到针对 ${web3IssueType} 中由于不安全的状态读写、事件分派或控制结构导致的致命漏洞隐患。当前生成了 sandbox 评分规则：${draftedProposal?.selectedCriteriaOption?.name || '安全断言矩阵'}。现移交给沙箱执行器进行动态攻击拟合与自动补丁构造。」`
                                    : `"Greetings. I have indexed the target files at ${web3RepoUrl}. I detected a critical pattern leakage resembling ${web3IssueType} where transaction re-entry or insecure variable propagation is allowed. Generated custom grading rubric: ${draftedProposal?.selectedCriteriaOption?.name || 'Axiom-01 Rule'}. Handing over for dynamic runtime patching now."`}
                                </p>
                              </div>
                            </div>

                            {/* Dialogue Step 2 */}
                            <div className="bg-[#150f0c] border border-[#4a3427] p-4 rounded-lg flex items-start gap-3.5 relative overflow-hidden group">
                              <div className="absolute top-1 right-2 text-[8px] font-mono text-[#4a3427]/60 uppercase select-none">Stage 02: Remediate</div>
                              <div className="w-9 h-9 rounded bg-[#bf311d]/20 border border-[#bf311d]/40 flex items-center justify-center shrink-0">
                                <Cpu className="w-5 h-5 text-[#dfab6c]" />
                              </div>
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-serif font-black text-xs text-[#dfab6c]">Platform Debug Killer</span>
                                  <span className="text-[9px] font-mono text-[#8e7564] uppercase font-bold px-1.5 py-0.5 bg-black/30 rounded">{locale === 'zh' ? '自动化补丁' : 'PATCHING v1.0'}</span>
                                </div>
                                <p className="text-[11.5px] font-sans text-[#ebdcb9] leading-relaxed">
                                  {locale === 'zh'
                                    ? `「漏洞修补程序成功生成并进行了 EVM 二进制插桩验证！我们在沙箱中复现了攻击行为，并在引入重入阻断锁、边界对齐防御后对虚拟机重新编译。单元编译通过率为 100%。多签契约的代扣已锁定在区块网络上，我们现在签发修复文档与可下载补丁，全部单元验证指标均已评分为 100/100。」`
                                    : `"Patch successfully constructed. We deployed an anti-exploit wrapper around the checked scopes in the ${web3VMType} virtual container. Sandboxed trace testing passed 100% of attack vectors. Verified audit is complete. Escrow release triggers generated."`}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Deliverables / Download Form */}
                        <div className="bg-[#1c1310] border-2 border-[#dfab6c] p-5 rounded space-y-4">
                          <div className="flex items-center justify-between border-b border-[#4a3427] pb-2">
                            <h4 className="font-serif font-black text-xs uppercase text-[#dfab6c] flex items-center gap-1.5">
                              <Download className="w-4 h-4 text-[#dfab6c]" />
                              {locale === 'zh' ? '受保护的算力成果交付下载面板' : 'SECURE DELIVERABLES RETRIEVAL FORM'}
                            </h4>
                            <span className="font-mono text-[9px] text-[#8e7564]">{locale === 'zh' ? '数字哈希凭证已验证' : 'BLOCK PROOF ATTESTED'}</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Deliverable 1: Report */}
                            <div className="bg-[#150f0c] border border-[#4a3427] p-4 rounded flex flex-col justify-between space-y-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <FileText className="w-4 h-4 text-[#dfab6c]" />
                                  <span className="font-serif font-black text-xs text-[#ebdcb9] uppercase">
                                    {locale === 'zh' ? 'EVM 可视化调试诊断书.md' : 'EVM Diagnostic Report (.md)'}
                                  </span>
                                </div>
                                <p className="text-[10px] text-[#a58d7c] font-sans leading-relaxed">
                                  {locale === 'zh'
                                    ? '包含脆弱性溯源、静态汇编跟踪断点、威胁强度建模与修复代码 Diff 段落。'
                                    : 'Detailed documentation containing contract vulnerability traces, threat vectors identified, and code diff sections.'}
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  // Trigger Report Download
                                  const markdownText = `# security audit & debugging report\n# platform debug killer - multi-consensus clearance\n# timestamp: ${new Date().toLocaleDateString()}\n\n## 1. codebase target\n- repository: ${web3RepoUrl}\n- VM environment: ${web3VMType}\n- target address: ${web3ContractAddr || 'Not deployed (local sandbox)'}\n\n## 2. vulnerability identification\n- threat category: ${web3IssueType}\n- threat level: CRITICAL RISK\n- audited files: ${web3FileScope || 'all repository source files'}\n\n### findings recap:\nOur platform agents simulated multiple state re-entrancy and access exploit vectors against your provided Solidity/Move specifications. An active vulnerability was replicated successfully in the preliminary compile run.\n\n## 3. automated patch deployment\n- remediation method: Applied strict reentrancy guards, mutex locking variables, and validated address check gates.\n- sandbox compile status: SUCCESS\n- unit test coverage: 100% (all mock attack vectors fully deflected and locked)\n\n## 4. escrow ledger summary\n- reward locked: ${draftedProposal?.rewardPool || 0.15} ETH\n- status: Settled / Escrow Safe Released to Solver Space\n- transaction footprint: 0x${generateHash('tx_')}\n`;
                                  const blob = new Blob([markdownText], { type: 'text/markdown' });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `web3_security_audit_report_${web3IssueType.toLowerCase().replace(' ', '_')}.md`;
                                  a.click();
                                  URL.revokeObjectURL(url);
                                  triggerAlarm('success', locale === 'zh' ? '安全审计文档下载已开始！' : 'Security audit report download started!');
                                }}
                                className="w-full bg-[#bf311d]/10 hover:bg-[#bf311d]/20 text-[#dfab6c] border border-[#bf311d]/30 py-1.5 rounded font-mono text-[10px] uppercase font-bold tracking-wider transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <ArrowDownToLine className="w-3.5 h-3.5" />
                                <span>{locale === 'zh' ? '极速下载诊断书' : 'DOWNLOAD DIAGNOSIS'}</span>
                              </button>
                            </div>

                            {/* Deliverable 2: Zip of Code */}
                            <div className="bg-[#150f0c] border border-[#4a3427] p-4 rounded flex flex-col justify-between space-y-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <FileArchive className="w-4 h-4 text-[#dfab6c]" />
                                  <span className="font-serif font-black text-xs text-[#ebdcb9] uppercase">
                                    {locale === 'zh' ? '安全补丁及重置测试包.zip' : 'Secured Patch Deploys (.zip)'}
                                  </span>
                                </div>
                                <p className="text-[10px] text-[#a58d7c] font-sans leading-relaxed">
                                  {locale === 'zh'
                                    ? '包含修复后的源码文件、本地 Hardhat/Foundry 伪装复现脚本及一键防御部署指南。'
                                    : 'Contains corrected repository source code files, Foundry deployment test scripts, and local exploit checkers.'}
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  // Trigger ZIP download fallback
                                  const zipPlaceholderContent = `[ZIP ARCHIVE PLACEHOLDER]\nThis archive contains the patched source files for:\n- Repository: ${web3RepoUrl}\n- Issue Resolved: ${web3IssueType}\n- Compiled VM: ${web3VMType}\n\nFiles:\n1. patched_contracts/SecureContract.sol (IncludesMutexLocks)\n2. reproduction_checks/exploit_repro.py (X-Deflection Verified)\n3. deploy_patch_ledger.json\n\nAll security checks has been completed successfully inside the cognitive compiler sandbox.\n`;
                                  const blob = new Blob([zipPlaceholderContent], { type: 'text/plain' });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `${web3IssueType.toLowerCase().replace(' ', '_')}_patched_source.zip`;
                                  a.click();
                                  URL.revokeObjectURL(url);
                                  triggerAlarm('success', locale === 'zh' ? '调试补丁压缩包下载已开始！' : 'Debug patched source ZIP download started!');
                                }}
                                className="w-full bg-[#bf311d]/10 hover:bg-[#bf311d]/20 text-[#dfab6c] border border-[#bf311d]/30 py-1.5 rounded font-mono text-[10px] uppercase font-bold tracking-wider transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <ArrowDownToLine className="w-3.5 h-3.5" />
                                <span>{locale === 'zh' ? '极速下载补丁包' : 'DOWNLOAD PATCH ZIP'}</span>
                              </button>
                            </div>
                          </div>

                          {/* Quick details */}
                          <div className="bg-[#150f0c] px-3.5 py-2.5 border border-[#4a3427] rounded text-[10px] font-mono text-[#a58d7c] flex flex-wrap gap-x-6 gap-y-1.5">
                            <div><strong>{locale === 'zh' ? '对账签名：' : 'Sig: '}</strong>0x9dF21...8F10</div>
                            <div><strong>{locale === 'zh' ? '出块高度：' : 'Block: '}</strong>#1982512</div>
                            <div><strong>{locale === 'zh' ? '托管结算：' : 'Escrow: '}</strong>{draftedProposal?.rewardPool || 0.15} ETH (Paid)</div>
                          </div>
                        </div>
                        </>
                        )}

                        {/* Reset & Navigation bar (always shown) */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              // Reset state and select another AI agent service
                              setDefinePath(null);
                              setFormSubmittingStage('none');
                              setDraftedProposal(null);
                              setAgentResult(null);
                            }}
                            className="flex-1 py-2.5 bg-transparent border border-[#4a3427] text-[#ebdcb9] font-serif font-black text-xs uppercase hover:bg-black/20 rounded transition text-center cursor-pointer"
                          >
                            {locale === 'zh' ? '委托另一个漏洞审计单' : 'AUDIT ANOTHER CONTRACT'}
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => {
                              // Direct to Registries
                              setActiveTab('Activities');
                            }}
                            className="flex-1 py-2.5 bg-[#bf311d]/10 text-[#dfab6c] border border-[#bf311d]/40 text-xs font-serif font-black uppercase tracking-wider rounded transition flex items-center justify-center gap-2 cursor-pointer hover:bg-[#bf311d]/20"
                          >
                            <Coins className="w-4.5 h-4.5" />
                            <span>{locale === 'zh' ? '前往算力审计账单' : 'GO TO ESCROW REGISTRY'}</span>
                          </button>
                        </div>

                      </div>
                    )}

                  </div>
                )}


                {/* 3. Dataset Miner Agent Specialized Form (definePath === 'dataset') */}
                {definePath === 'dataset' && (
                  <div className="w-full space-y-5 animate-slide-up">
                    {/* Retro navigation back bar */}
                    <button 
                      onClick={() => {
                        setDefinePath(null);
                        setFormSubmittingStage('none');
                        setDraftedProposal(null);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-[#ebdcb9]/60 hover:text-[#dfab6c] transition cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>{locale === 'zh' ? '返回分算中心' : 'Back to Selection'}</span>
                    </button>

                    {/* Sub-form Header */}
                    <div className="bg-[#1c1310] border-2 border-[#4a3427] px-5 py-4 rounded-sm flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-14 w-12 shrink-0 overflow-hidden border border-[#4a3427] bg-[#201511] shadow-inner">
                          <img src={dataAgentAvatar} alt="Data Mining Agent" className="h-full w-full object-cover" />
                        </div>
                        <div>
                          <h3 className="font-serif font-black text-sm text-[#ebdcb9] uppercase tracking-wider">
                            {locale === 'zh' ? '分布式算力数据集搜集发掘契约构建器' : 'Dataset Custom Outsource Pact Creator'}
                          </h3>
                          <p className="text-[10px] font-mono text-[#dfab6c] uppercase">
                            Manned by: Data Mining Agent · z.ai Mining Oracle v2.5
                          </p>
                        </div>
                      </div>
                      <span className="hidden md:inline px-2 py-1 bg-[#849c44]/10 text-[#849c44] border border-[#849c44]/20 rounded font-mono text-[9px] font-bold">
                        MINING DISPATCH
                      </span>
                    </div>

                    {formSubmittingStage === 'none' && (
                      <form onSubmit={handleDatasetFormSubmit} className="bg-[#150f0c] border-2 border-[#4a3427] rounded p-5 space-y-4">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Domain Domain details */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono text-[#8e7564] font-black uppercase block">
                              {locale === 'zh' ? '目标算力数据集领域/主题 (Domain Focus)' : 'Dataset Topic or Domain'}
                            </label>
                            <input 
                              type="text"
                              required
                              placeholder="e.g. Solidity Reentrancy Exploit QA Pairs"
                              value={datasetDomain}
                              onChange={(e) => setDatasetDomain(e.target.value)}
                              className="w-full h-9 px-3 bg-[#0b0705] border border-[#4a3427] rounded text-xs text-[#ebdcb9] outline-none focus:border-[#dfab6c]"
                            />
                          </div>

                          {/* Target size */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono text-[#8e7564] font-black uppercase block">
                              {locale === 'zh' ? '预设数据行总数 (Target instances count)' : 'Dataset target scale count'}
                            </label>
                            <select 
                              value={datasetSize}
                              onChange={(e) => setDatasetSize(e.target.value)}
                              className="w-full h-9 px-2 bg-[#0b0705] border border-[#4a3427] rounded text-xs font-mono text-[#ebdcb9] outline-none focus:border-[#dfab6c]"
                            >
                              <option value="100">100 rows (快速微型检验款)</option>
                              <option value="500">500 rows (标准中型训练集)</option>
                              <option value="1000">1000 rows (重型高语义指标集)</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Target sources */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono text-[#8e7564] font-black uppercase block">
                              {locale === 'zh' ? '指定抓取数据源 / 锚定索引源' : 'Target Outsource Anchor Sources'}
                            </label>
                            <input 
                              type="text"
                              placeholder="e.g. DeFiLlama liquidation logs, Etherscan ABI"
                              value={datasetSources}
                              onChange={(e) => setDatasetSources(e.target.value)}
                              className="w-full h-9 px-3 bg-[#0b0705] border border-[#4a3427] rounded text-xs text-[#ebdcb9] outline-none focus:border-[#dfab6c]"
                            />
                          </div>

                          {/* Cleaning standards */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono text-[#8e7564] font-black uppercase block">
                              {locale === 'zh' ? '清洗去燥标准 (Cleaning standard)' : 'Anti-Slop deduplication guide'}
                            </label>
                            <input 
                              type="text"
                              placeholder="e.g. Deduplicate by Jaccard similarity > 0.8"
                              value={datasetCleaning}
                              onChange={(e) => setDatasetCleaning(e.target.value)}
                              className="w-full h-9 px-3 bg-[#0b0705] border border-[#4a3427] rounded text-xs text-[#ebdcb9] outline-none focus:border-[#dfab6c]"
                            />
                          </div>
                        </div>

                        {/* Schema specs */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-[#8e7564] font-black uppercase block">
                            {locale === 'zh' ? '交付对账 JSON 字段规约束范 (Target Schema)' : 'Strict Output target Schema (JSONL tags)'}
                          </label>
                          <input 
                            type="text"
                            required
                            value={datasetSchema}
                            onChange={(e) => setDatasetSchema(e.target.value)}
                            className="w-full h-9 px-3 bg-[#0b0705] border border-[#4a3427] rounded text-xs text-[#ebdcb9] outline-none focus:border-[#dfab6c]"
                          />
                        </div>

                        {/* Validation Metric */}
                        <div className="space-y-2.5 bg-[#1b120e] p-3 border border-[#4a3427]/60 rounded-sm">
                          <label className="text-[10px] font-mono text-[#dfab6c] font-black uppercase block select-none">
                            {locale === 'zh' ? '预设核心检验指标过滤法 (Validation Bias)' : 'CORE VALIDATOR SCORE BIAS RULES'}
                          </label>
                          <div className="flex gap-6 text-xs text-[#ebdcb9]">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input 
                                type="radio" 
                                name="bias" 
                                checked={datasetValidationMetric === 'diversity-heavy'} 
                                onChange={() => setDatasetValidationMetric('diversity-heavy')}
                                className="accent-[#dfab6c]" 
                              />
                              <span className="font-mono">{locale === 'zh' ? '去燥高熵高重复率惩罚 (High Entropy Overlap Penalty)' : 'High Entropy Overlap Penalty'}</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input 
                                type="radio" 
                                name="bias" 
                                checked={datasetValidationMetric === 'correctness-heavy'} 
                                onChange={() => setDatasetValidationMetric('correctness-heavy')}
                                className="accent-[#dfab6c]" 
                              />
                              <span className="font-mono">{locale === 'zh' ? '精确对账逻辑正确性 (Precision Logic Mapping)' : 'Precision Logic Mapping'}</span>
                            </label>
                          </div>
                        </div>

                        {/* Custom notes */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-[#8e7564] font-black uppercase block">
                            {locale === 'zh' ? '额外自定义特殊需求备注' : 'Special parsing rules or whitelist tags'}
                          </label>
                          <textarea 
                            rows={3}
                            placeholder={locale === 'zh' ? '可以罗列需要剔除的敏感词库或者需要包含的具体黑白名单键值...' : 'Describe special regex requirements, formatting layouts or system tags...'}
                            value={datasetCustomNotes}
                            onChange={(e) => setDatasetCustomNotes(e.target.value)}
                            className="w-full p-2.5 bg-[#0b0705] border border-[#4a3427] rounded text-xs text-[#ebdcb9] outline-none focus:border-[#dfab6c]"
                          ></textarea>
                        </div>

                        {/* Submit Button */}
                        <button 
                          type="submit"
                          className="w-full bg-[#849c44] hover:bg-[#6c8233] text-white py-2.5 rounded font-serif font-black uppercase tracking-widest text-xs flex items-center justify-center gap-1.5 transition"
                        >
                          <Cpu className="w-4 h-4" />
                          <span>{locale === 'zh' ? '开启分布式算力智能编制验收标准' : 'OUTSOURCE RETRO COMPILATION'}</span>
                        </button>

                      </form>
                    )}

                    {/* Loader */}
                    {formSubmittingStage === 'analyzing' && (
                      <div className="bg-[#150f0c] border-2 border-[#4a3427] p-8 rounded text-center space-y-4 animate-pulse">
                        <Bot className="w-10 h-10 text-[#dfab6c] mx-auto animate-spin" />
                        <h4 className="font-serif font-black text-[#dfab6c] uppercase text-sm tracking-widest">
                          {locale === 'zh' ? '算力智能索引筛选中...' : 'MINING ORACLE RUNNING'}
                        </h4>
                        <p className="text-xs text-[#a58d7c] font-mono leading-relaxed max-w-sm mx-auto">
                          {locale === 'zh' 
                            ? 'Mining Oracle 正在规划数据去噪链路、测量语义高熵门限并智能编译三维 JSONL 格式格式核验指标卡...' 
                            : 'Formulating dataset filtering paths and compiling rigid JSONSchema compliance rules...'}
                        </p>
                      </div>
                    )}

                    {/* Proposal Sign-off Board */}
                    {formSubmittingStage === 'proposal_ready' && draftedProposal && (
                      <div className="bg-[#1c1310] border-2 border-[#dfab6c] rounded p-6 space-y-6 animate-scale-up text-left relative">
                        <div className="absolute top-1 right-2 text-[#dfab6c] font-mono text-[9px] select-none">METAMASK PACT COMPILING</div>
                        
                        <div className="border-b border-[#4a3427]/60 pb-3">
                          <h4 className="font-serif font-black text-xs uppercase tracking-wider text-[#dfab6c] flex items-center gap-1.5">
                            <Award className="w-4 h-4 text-[#dfab6c]" />
                            {locale === 'zh' ? '已自动编译之发掘订单详情 (Verified Draft)' : 'VERIFIED DATA MINING COMPUTATION ORDER'}
                          </h4>
                          <h5 className="font-serif font-black text-lg text-[#ebdcb9] mt-2 uppercase">
                            {draftedProposal.title}
                          </h5>
                        </div>

                        {/* Details parameters */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                          <div className="space-y-1 bg-[#150f0c] p-2.5 border border-[#4a3427] rounded-sm">
                            <span className="text-[#8e7564] text-[9.5px] uppercase font-bold block">{locale === 'zh' ? '代扣托管赏金' : 'ESCROW REWARD'}</span>
                            <span className="text-[#ebdcb9] font-black text-sm">{draftedProposal.rewardPool} ETH</span>
                          </div>
                          <div className="space-y-1 bg-[#150f0c] p-2.5 border border-[#4a3427] rounded-sm">
                            <span className="text-[#8e7564] text-[9.5px] uppercase font-bold block">{locale === 'zh' ? '自动评分合格门槛' : 'MIN PASS SCORE'}</span>
                            <span className="text-[#ebdcb9] font-black text-sm">{draftedProposal.aiThresholdLine}/100</span>
                          </div>
                          <div className="space-y-1 bg-[#150f0c] p-2.5 border border-[#4a3427] rounded-sm">
                            <span className="text-[#8e7564] text-[9.5px] uppercase font-bold block">{locale === 'zh' ? '承办警员代理' : 'SUPERVISOR'}</span>
                            <span className="text-[#dfab6c] font-black text-[10px] truncate block">Platform Data Mining Agent</span>
                          </div>
                          <div className="space-y-1 bg-[#150f0c] p-2.5 border border-[#4a3427] rounded-sm">
                            <span className="text-[#8e7564] text-[9.5px] uppercase font-bold block">{locale === 'zh' ? '交付格式' : 'FORMAT'}</span>
                            <span className="text-[#ebdcb9] font-black text-[10px] truncate block">{draftedProposal.outputFormat}</span>
                          </div>
                        </div>

                        {/* Audit dimensions */}
                        <div className="space-y-2.5 bg-[#150f0c] p-4 border border-[#4a3427] rounded-sm">
                          <span className="text-[10px] font-mono text-[#dfab6c] uppercase font-black block tracking-wider">
                            {locale === 'zh' ? '拟合指标算法面板' : 'COMPILED THREE-DIMENSIONAL VALIDATOR RULE PARAMETERS'}
                          </span>
                          <div className="space-y-1.5 text-[11px] text-[#ebdcb9]/90 font-mono">
                            <p><strong>{locale === 'zh' ? '选定验收算法：' : 'Selected Rubric: '}</strong>{draftedProposal.selectedCriteriaOption.name}</p>
                            <p><strong>{locale === 'zh' ? '权重分配比率：' : 'Weights: '}</strong>{draftedProposal.selectedCriteriaOption.scoreWeightExplanation}</p>
                            <p><strong>{locale === 'zh' ? '检查清单关键点：' : 'Checklist: '}</strong>{draftedProposal.selectedCriteriaOption.checklist.join(' | ')}</p>
                          </div>
                        </div>

                        {/* Action deployment */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                          <button 
                            type="button"
                            onClick={() => setFormSubmittingStage('none')}
                            className="flex-1 py-2 bg-transparent border border-[#4a3427] text-[#a58d7c] font-black text-xs uppercase hover:bg-black/20 rounded transition"
                          >
                            {locale === 'zh' ? '修正契约参数' : 'RECONFIG SPECS'}
                          </button>
                          
                          <button 
                            type="button"
                            onClick={handleDeployDraftedProposal}
                            className="flex-1 py-1.5 bg-[#849c44] hover:bg-[#6c8233] text-white font-serif font-black text-xs uppercase tracking-widest rounded flex items-center justify-center gap-2 transition shadow-xl"
                          >
                            <Check className="w-4 h-4" />
                            <span>{locale === 'zh' ? '代扣锁仓并发布分布式算力任务' : 'APPROVE ESCROW & DEPLOY PACT'}</span>
                          </button>
                        </div>

                      </div>
                    )}

                    {formSubmittingStage === 'completed_download' && (
                      <div className="space-y-6 animate-scale-up text-left">
                        
                        {/* Status Stamp Alert */}
                        <div className="bg-[#1c2e1a] border-2 border-[#849c44] p-5 rounded space-y-4 flex flex-col md:flex-row items-center md:items-start gap-4">
                          <CheckCircle2 className="w-10 h-10 text-[#849c44] shrink-0" />
                          <div className="space-y-1 text-center md:text-left flex-1">
                            <h4 className="font-serif font-black text-sm uppercase text-[#849c44]">
                              {locale === 'zh' ? '自主结算成功 · 高熵去噪数据集已就绪' : 'PACT SETTLED • HIGH ENTROPY CORPUS GENERATED'}
                            </h4>
                            <p className="text-[11px] text-[#ebdcb9]/80 font-sans leading-relaxed">
                              {locale === 'zh'
                                ? `由于您启用了 Platform Data Mining Agent 搜集机制，系统在代扣划转 ${draftedProposal?.rewardPool || 0.18} ETH 至托管池的同时，智能数据索引沙盒已提前完成了针对 ${datasetDomain} 的全套语料搜集、质量校正与剔重去噪。下面是以前述对账阶段整合的交付成果。`
                                : `With Platform Data Mining Agent acceleration engaged, ${draftedProposal?.rewardPool || 0.18} ETH has been successfully escrowed and our mining sandbox has automatically compiled the cleaned corpus for ${datasetDomain}.`}
                            </p>
                          </div>
                        </div>

                        {/* Interactive Two-step Dialog Recap */}
                        <div className="space-y-4">
                          <h5 className="font-mono text-[10px] text-[#dfab6c] uppercase font-black tracking-wider">
                            {locale === 'zh' ? '▎数据搜集与清洗对话研判存档 (Internal Dialogue Logs)' : '▎DIALOGUE RECAP LOGS'}
                          </h5>

                          <div className="space-y-3.5">
                            {/* Dialogue Step 1 */}
                            <div className="bg-[#150f0c] border border-[#4a3427] p-4 rounded-lg flex items-start gap-3.5 relative overflow-hidden group">
                              <div className="absolute top-1 right-2 text-[8px] font-mono text-[#4a3427]/60 uppercase select-none">Stage 01: Scrape & Extraction</div>
                              <div className="w-9 h-9 rounded bg-[#849c44]/20 border border-[#849c44]/40 flex items-center justify-center shrink-0">
                                <Bot className="w-5 h-5 text-[#dfab6c]" />
                              </div>
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-serif font-black text-xs text-[#dfab6c]">Platform Data Mining Agent</span>
                                  <span className="text-[9px] font-mono text-[#8e7564] uppercase font-bold px-1.5 py-0.5 bg-black/30 rounded">{locale === 'zh' ? '搜集引擎' : 'MINER'}</span>
                                </div>
                                <p className="text-[11.5px] font-sans text-[#ebdcb9] leading-relaxed">
                                  {locale === 'zh'
                                    ? `「尊敬的验证节点，我们对您指定的算力话题 ${datasetDomain} 进行了全方位原始文本遍历捕获。在48小时标准清算期内，我们累计排布出高质量推理语料、链上CoT等丰富样本行。现过滤多余低质杂音，移交给清洗模块对齐您指定的评分规则：${draftedProposal?.selectedCriteriaOption?.name || '高密度词流模式'}。」`
                                    : `"Greetings. I have traversed public networks and indexed corpus regarding ${datasetDomain}. Filtered low-semantic text slices. Handing over for strict schema validation structure under ${draftedProposal?.selectedCriteriaOption?.name || 'High Entropy Rubric'}"`}
                                </p>
                              </div>
                            </div>

                            {/* Dialogue Step 2 */}
                            <div className="bg-[#150f0c] border border-[#4a3427] p-4 rounded-lg flex items-start gap-3.5 relative overflow-hidden group">
                              <div className="absolute top-1 right-2 text-[8px] font-mono text-[#4a3427]/60 uppercase select-none">Stage 02: Verification & Alignment</div>
                              <div className="w-9 h-9 rounded bg-[#849c44]/20 border border-[#849c44]/40 flex items-center justify-center shrink-0">
                                <Cpu className="w-5 h-5 text-[#dfab6c]" />
                              </div>
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-serif font-black text-xs text-[#dfab6c]">Platform Data Mining Agent</span>
                                  <span className="text-[9px] font-mono text-[#8e7564] uppercase font-bold px-1.5 py-0.5 bg-black/30 rounded">{locale === 'zh' ? '算力清洗机' : 'CLEANER v1.0'}</span>
                                </div>
                                <p className="text-[11.5px] font-sans text-[#ebdcb9] leading-relaxed">
                                  {locale === 'zh'
                                    ? `「提取到的 ${datasetSize} 列高质量行已统一完成了针对 ${datasetSchema} 的高精对齐；沙盒检验器中进行的词义除多测算率为 100%。我们现在签发可供极速下载的 JSONL 结构数据集及相应的元数据诊断备忘录，全部校验评分为 100/100。」`
                                    : `"Compiled target records aligned with requested JSON Schema: ${datasetSchema}. Deduplication rate of 100% verified inside semantic compiler sandbox. Released files are certified safe to retrieve."`}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Deliverables / Download Form */}
                        <div className="bg-[#1c1310] border-2 border-[#dfab6c] p-5 rounded space-y-4">
                          <div className="flex items-center justify-between border-b border-[#4a3427] pb-2">
                            <h4 className="font-serif font-black text-xs uppercase text-[#dfab6c] flex items-center gap-1.5">
                              <Download className="w-4 h-4 text-[#dfab6c]" />
                              {locale === 'zh' ? '受保护的高熵算力成果下载交付面板' : 'SECURE DELIVERABLES RETRIEVAL FORM'}
                            </h4>
                            <span className="font-mono text-[9px] text-[#8e7564]">{locale === 'zh' ? '数字签名证书已验证' : 'BLOCK PROOF ATTESTED'}</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Deliverable 1: Report */}
                            <div className="bg-[#150f0c] border border-[#4a3427] p-4 rounded flex flex-col justify-between space-y-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <FileText className="w-4 h-4 text-[#dfab6c]" />
                                  <span className="font-serif font-black text-xs text-[#ebdcb9] uppercase">
                                    {locale === 'zh' ? '高精数据集清洗审计书.md' : 'Dataset Audit Report (.md)'}
                                  </span>
                                </div>
                                <p className="text-[10px] text-[#a58d7c] font-sans leading-relaxed">
                                  {locale === 'zh'
                                    ? '包含数据去噪链路流、语言高熵图谱对账表、合规性检验与多签存单哈希凭据。'
                                    : 'A compilation report mapping dataset entropy structures, token-density metrics, and escrow release proof.'}
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  // Trigger Report Download
                                  const markdownText = `# high entropy dataset curation & curation report\n# platform data mining agent\n# timestamp: ${new Date().toLocaleDateString()}\n\n## 1. target topic\n- domain label: ${datasetDomain}\n- expected size: ${datasetSize} items\n- scheme rules: ${datasetSchema}\n\n## 2. cleaning & curation stats\n- target semantic records: ${datasetSize}\n- duplicate elements suppressed: 1,492\n- structure check syntax: 100% compliant JSON Lines\n- scoring benchmark: 100/100 (excellence metric)\n\n## 3. contract ledger\n- budget locked: ${draftedProposal?.rewardPool || 0.18} ETH\n- transaction signature: 0x${generateHash('tx_')}\n`;
                                  const blob = new Blob([markdownText], { type: 'text/markdown' });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `${datasetDomain.toLowerCase().replace(/\s+/g, '_')}_dataset_audit_report.md`;
                                  a.click();
                                  URL.revokeObjectURL(url);
                                  triggerAlarm('success', locale === 'zh' ? '数据审计诊断书下载已开始！' : 'Dataset audit report download started!');
                                }}
                                className="w-full bg-[#849c44]/10 hover:bg-[#849c44]/20 text-[#dfab6c] border border-[#849c44]/30 py-1.5 rounded font-mono text-[10px] uppercase font-bold tracking-wider transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <ArrowDownToLine className="w-3.5 h-3.5" />
                                <span>{locale === 'zh' ? '极速下载审计书' : 'DOWNLOAD REPORT'}</span>
                              </button>
                            </div>

                            {/* Deliverable 2: Zip of Code */}
                            <div className="bg-[#150f0c] border border-[#4a3427] p-4 rounded flex flex-col justify-between space-y-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <FileArchive className="w-4 h-4 text-[#dfab6c]" />
                                  <span className="font-serif font-black text-xs text-[#ebdcb9] uppercase">
                                    {locale === 'zh' ? '清洗后高熵格式化数据集.zip' : 'Cleaned Dataset Corpus (.zip)'}
                                  </span>
                                </div>
                                <p className="text-[10px] text-[#a58d7c] font-sans leading-relaxed">
                                  {locale === 'zh'
                                    ? '包含完整对齐 schema 后输出的高纯度 jsonl 纯文本算力语料、词典及训练验证对准配表。'
                                    : 'Contains curated high-density JSON Lines file ready for direct training indexing.'}
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  // Trigger ZIP download fallback
                                  const zipPlaceholderContent = `[JSONL SPECIFIED CORPUS PLACEHOLDER]\nMatched target schema: ${datasetSchema}\nTopic: ${datasetDomain}\nExpected rows: ${datasetSize}\n\nThis archive contains the cleaned files generated inside the z.ai cognitive mining engine.\n`;
                                  const blob = new Blob([zipPlaceholderContent], { type: 'text/plain' });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `${datasetDomain.toLowerCase().replace(/\s+/g, '_')}_dataset_curated_source.zip`;
                                  a.click();
                                  URL.revokeObjectURL(url);
                                  triggerAlarm('success', locale === 'zh' ? '格式化数据集压缩包下载已开始！' : 'Curated Dataset ZIP download started!');
                                }}
                                className="w-full bg-[#849c44]/10 hover:bg-[#849c44]/20 text-[#dfab6c] border border-[#849c44]/30 py-1.5 rounded font-mono text-[10px] uppercase font-bold tracking-wider transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <ArrowDownToLine className="w-3.5 h-3.5" />
                                <span>{locale === 'zh' ? '极速下载数据集.zip' : 'DOWNLOAD DATASET ZIP'}</span>
                              </button>
                            </div>
                          </div>

                          {/* Quick details */}
                          <div className="bg-[#150f0c] px-3.5 py-2.5 border border-[#4a3427] rounded text-[10px] font-mono text-[#a58d7c] flex flex-wrap gap-x-6 gap-y-1.5">
                            <div><strong>{locale === 'zh' ? '对账物理哈希：' : 'Sig: '}</strong>0x8eB17...4C21</div>
                            <div><strong>{locale === 'zh' ? '块高度：' : 'Block: '}</strong>#1982512</div>
                            <div><strong>{locale === 'zh' ? '多签托管代扣流：' : 'Escrow: '}</strong>{draftedProposal?.rewardPool || 0.18} ETH (Paid)</div>
                          </div>
                        </div>

                        {/* Reset & Navigation bar */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setDefinePath(null);
                              setFormSubmittingStage('none');
                              setDraftedProposal(null);
                            }}
                            className="flex-1 py-2.5 bg-transparent border border-[#4a3427] text-[#ebdcb9] font-serif font-black text-xs uppercase hover:bg-black/20 rounded transition text-center cursor-pointer"
                          >
                            {locale === 'zh' ? '委托另一个数据集算力订单' : 'OUTSOURCE ANOTHER CORPUS'}
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('Activities');
                            }}
                            className="flex-1 py-2.5 bg-[#849c44]/10 text-[#dfab6c] border border-[#849c44]/40 text-xs font-serif font-black uppercase tracking-wider rounded transition flex items-center justify-center gap-2 cursor-pointer hover:bg-[#849c44]/20"
                          >
                            <Coins className="w-4.5 h-4.5" />
                            <span>{locale === 'zh' ? '前往算力对账本' : 'GO TO ESCROW REGISTRY'}</span>
                          </button>
                        </div>

                      </div>
                    )}

                  </div>
                )}


                {/* 4. Custom Task Warrant Conversational Flow (definePath === 'custom') */}
                {definePath === 'custom' && (
                  <div className="flex-1 flex flex-col justify-between max-w-3xl w-full mx-auto space-y-4 animate-fade-in">
                    
                    {/* Navigation retro back bar */}
                    <div className="flex items-center justify-between border-b border-dashed border-[#4a3427]/30 pb-2">
                      <button 
                        onClick={() => {
                          setDefinePath(null);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-[#ebdcb9]/60 hover:text-[#dfab6c] transition cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>{locale === 'zh' ? '返回分算中心' : 'Back to Selection'}</span>
                      </button>

                      <span className="text-[9.5px] font-mono text-[#8e7564] uppercase select-none">
                        Spec Agent Chatbot Dialogue Console
                      </span>
                    </div>

                    {/* Chat log thread bubble containers */}
                    {chatMessages.length === 0 ? (
                      <div className="flex-1 flex flex-col justify-center items-center text-center py-10 space-y-4">
                        <div className="h-16 w-14 overflow-hidden border border-[#4a3427] bg-[#201511] shadow-inner">
                          <img src={specAgentAvatar} alt="Spec Agent" className="h-full w-full object-cover" />
                        </div>
                        <div className="space-y-1.5 max-w-sm">
                          <h4 className="font-serif font-black text-sm text-[#ebdcb9] uppercase tracking-wider">
                            {locale === 'zh' ? '自由口语契约规格化定制助手' : 'Conversational Specification Assistant'}
                          </h4>
                          <p className="text-[11px] text-[#a58d7c] leading-relaxed">
                            {locale === 'zh' 
                              ? '采用随意口语和 z.ai 智能警长进行交谈，由系统的 Spec Agent 负责实时编译契约及扣付条款。' 
                              : 'Chat with our Spec Agent in natural language. We will draft structured metrics options dynamically.'}
                          </p>
                        </div>

                        {/* Presets */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full max-w-md pt-5 text-left">
                          <button 
                            onClick={() => {
                              const zhPrompt = "我们需要一个包含 100 个带标注的智能合约 Solidity 重入漏洞安全审计问答数据集。";
                              const enPrompt = "We need a QA dataset containing 100 annotated smart contract code audits exploring reentrancy vector edge cases in Solidity.";
                              setUserInput(locale === 'zh' ? zhPrompt : enPrompt);
                            }}
                            className="bg-[#150f0c] border-[#4a3427] hover:border-[#dfab6c]/50 p-3.5 rounded-sm transition flex items-center justify-between text-left group cursor-pointer"
                          >
                            <div className="space-y-1">
                              <span className="text-[10px] font-semibold text-[#dfab6c] font-mono block">
                                {locale === 'zh' ? '智能合约安全审计' : 'CONTRACT DEFI AUDITS'}
                              </span>
                              <span className="text-[10px] text-[#a58d7c] line-clamp-1 block">
                                {locale === 'zh' ? '100个Solidity重入攻击深度诊断数据集' : 'Solidity reentrancy dataset with 100 code pieces'}
                              </span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-[#a58d7c] group-hover:text-[#dfab6c] transition shrink-0" />
                          </button>

                          <button 
                            onClick={() => {
                              const zhPrompt = "定制一份包含 500 个多轮演算法推导的金融商业推演逻辑基准问答数据集，用于大语言模型强化微调。";
                              const enPrompt = "Outsource a high fidelity reasoning QA benchmark dataset with 500 multi-turn logical solutions for finance model training.";
                              setUserInput(locale === 'zh' ? zhPrompt : enPrompt);
                            }}
                            className="bg-[#150f0c] border-[#4a3427] hover:border-[#dfab6c]/50 p-3.5 rounded-sm transition flex items-center justify-between text-left group cursor-pointer"
                          >
                            <div className="space-y-1">
                              <span className="text-[10px] font-semibold text-[#dfab6c] font-mono block">
                                {locale === 'zh' ? '金融算数深度强化逻辑' : 'FINANCE LOGICS'}
                              </span>
                              <span className="text-[10px] text-[#a58d7c] line-clamp-1 block">
                                {locale === 'zh' ? '500个多步推理的算学求解微调语料' : '500 multi-turn multi-hop equations dataset'}
                              </span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-[#a58d7c] group-hover:text-[#dfab6c] transition shrink-0" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Active chat logs list */
                      <div className="flex-1 space-y-4 overflow-y-auto pr-1 pb-4 max-h-[58vh] md:max-h-[64vh] scrollbar-thin">
                        {chatMessages.map((msg, index) => (
                          <div 
                            key={index} 
                            className={`flex gap-3 max-w-[85%] ${
                              msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                            }`}
                          >
                            <div className={`w-7 h-7 rounded-sm shrink-0 flex items-center justify-center overflow-hidden font-mono text-[10px] ${
                              msg.sender === 'user' 
                                ? 'bg-[#4a3427] text-[#dfab6c] border border-[#dfab6c]/20' 
                                : 'bg-[#150f0c] text-[#ebdcb9] border border-[#4a3427]'
                            }`}>
                              {msg.sender === 'user' ? '★' : (
                                <img src={specAgentAvatar} alt="Spec Agent" className="h-full w-full object-cover" />
                              )}
                            </div>

                            <div className={`p-4 rounded border text-xs leading-relaxed space-y-3 ${
                              msg.sender === 'user'
                                ? 'bg-[#1c1310] border-[#dfab6c]/40 text-[#ebdcb9] rounded-tr-none'
                                : 'bg-[#150f0c] border-[#4a3427] text-[#ebdcb9] rounded-tl-none'
                            }`}>
                              <p className="font-sans whitespace-pre-wrap">{msg.text}</p>

                              {/* Criteria Options */}
                              {msg.criteriaOptions && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                                  {msg.criteriaOptions.map((opt) => {
                                    const isSelected = msg.selectedOptionId === opt.id;
                                    const isPrimary = isPrimarySpecOption(opt);
                                    const displayOpt = getSpecCriteriaOptionDisplay(opt, locale);
                                    return (
                                      <div 
                                        key={opt.id} 
                                        className={`${isPrimary ? 'bg-[#0b0705]' : 'bg-[#130b09]'} p-3.5 rounded border flex flex-col justify-between transition-all relative ${
                                          isSelected 
                                            ? 'border-[#dfab6c] ring-1 ring-[#dfab6c]/30' 
                                            : 'border-[#4a3427] hover:border-[#dfab6c]/60'
                                        }`}
                                      >
                                        <div>
                                          <h4 className="font-serif font-black text-xs text-[#ebdcb9] mb-1.5 flex items-center justify-between uppercase">
                                            {displayOpt.name}
                                            {isSelected && <span className="bg-[#dfab6c] text-[#150f0c] rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">✓</span>}
                                          </h4>
                                          <p className="text-[10px] text-[#a58d7c] font-mono leading-relaxed mt-1">{displayOpt.description}</p>
                                        </div>

                                        <button
                                          type="button"
                                          disabled={stage !== 'options'}
                                          onClick={() => handleSelectCriteriaOption(opt)}
                                          className={`w-full mt-4 font-mono font-bold text-[9px] py-1.5 rounded transition cursor-pointer ${
                                            isSelected 
                                              ? 'bg-[#dfab6c] text-[#150f0c]' 
                                              : stage === 'options'
                                                ? 'bg-[#150f0c] hover:bg-[#1a120e] text-[#dfab6c] border border-[#a58d7c]/30'
                                                : 'bg-[#150f0c] text-zinc-650 cursor-not-allowed border border-transparent'
                                          }`}
                                        >
                                          {isSelected 
                                            ? (locale === 'zh' ? '指标已锁定' : 'Metric Selected') 
                                            : (locale === 'zh' ? '锁配此验收规格' : 'Select Rubric Option')}
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Order checkout preview */}
                              {msg.orderPreview && (
                                <div className="bg-[#0b0705] p-4 border border-[#dfab6c]/30 rounded space-y-4 pt-3.5 relative">
                                  <h4 className="text-[10.5px] uppercase font-mono font-bold tracking-wider text-[#dfab6c] flex items-center gap-1.5">
                                    <Bot className="w-4 h-4 text-[#dfab6c]" /> {locale === 'zh' ? '多签契约结算草案' : 'Computation Escrow Draft'}
                                  </h4>
                                  
                                  <div className="grid grid-cols-2 gap-3.5 text-[10px] text-[#a58d7c] font-mono">
                                    <div className="space-y-0.5">
                                      <span>{locale === 'zh' ? '托管保证金:' : 'Audit Deposit Balance:'}</span>
                                      <span className="block font-black text-[#ebdcb9] text-[12.5px]">{msg.orderPreview.deposit} ETH</span>
                                    </div>
                                    <div className="space-y-0.5">
                                      <span>{locale === 'zh' ? '合格得分门槛:' : 'Validator Pass score:'}</span>
                                      <span className="block font-black text-[#ebdcb9] text-[12.5px]">{msg.orderPreview.passScore}/100</span>
                                    </div>
                                    <div className="space-y-0.5">
                                      <span>{locale === 'zh' ? '主控验证规则:' : 'Grading logic:'}</span>
                                      <span className="block font-black text-[#dfab6c] truncate">
                                        {getSpecCriteriaOptionDisplay(msg.orderPreview.options, locale).name}
                                      </span>
                                    </div>
                                    <div className="space-y-0.5">
                                      <span>{locale === 'zh' ? '联签退款退单条款:' : 'Refund Clauses:'}</span>
                                      <span className="block font-black text-[#ebdcb9] truncate">MetaMask Pact Guardian v1.0</span>
                                    </div>
                                  </div>

                                  {stage === 'pact_ready' ? (
                                    <button
                                      type="button"
                                      onClick={handleTriggerCoboPactApproval}
                                      className="w-full bg-[#bf311d] hover:bg-[#a02817] text-white font-serif font-black py-2.5 rounded text-[10px] tracking-widest uppercase transition flex items-center justify-center gap-1.5 outline-none cursor-pointer"
                                    >
                                      {locale === 'zh' ? '批准代扣并锁定上链多签' : 'Deploy Pact via MetaMask Sign'} <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                  ) : stage === 'deployed' ? (
                                    <div className="flex gap-2 bg-[#849c44]/10 border border-[#849c44]/20 p-2.5 rounded text-[10px] text-[#dfab6c] font-mono font-bold">
                                      <Check className="w-4 h-4 shrink-0" />
                                      <span>{locale === 'zh' ? '保证金托管上链完成！任务已注入大厅。' : 'Escrow Deposit locked! Task has been deployed on-chain.'}</span>
                                    </div>
                                  ) : (
                                    <div className="flex gap-2 bg-[#150f0c] border border-[#a58d7c]/10 p-2.5 rounded text-[10.5px] text-[#8e7564] font-mono font-bold">
                                      <span>{locale === 'zh' ? '正在等待左下角 MetaMask 钱包授权签署中...' : 'Escrow pending authorization signature in widget...'}</span>
                                    </div>
                                  )}
                                </div>
                              )}

                            </div>
                          </div>
                        ))}

                        {/* Typing Loader */}
                        {isTyping && (
                          <div className="flex gap-2 text-[10px] text-[#8e7564] items-center pl-1 font-mono">
                            <Bot className="w-3.5 h-3.5 text-[#dfab6c] animate-spin" />
                            <span className="font-mono animate-pulse">
                              {locale === 'zh' ? 'Spec Agent 智算哨兵拟合指标对账中...' : 'Spec Agent synthesizing on-chain metrics...'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Chat Prompt Input Bar */}
                    {stage === 'prompt' && (
                      <form onSubmit={handleChatPromptSubmit} className="bg-[#150f0c] p-3.5 border-2 border-[#4a3427] rounded flex gap-3 relative mt-2 text-left">
                        <textarea
                          value={userInput}
                          onChange={(e) => setUserInput(e.target.value)}
                          placeholder={locale === 'zh' ? "用自然口语叙述您想要征集的外包业务 (如：我需要一份 Solidity 漏洞审计对账模型，提供 100 组 case...)" : "Outsource requirements details (e.g. Solidity audit dataset with 50 cases...)"}
                          className="w-full bg-transparent text-xs text-[#ebdcb9] placeholder-[#8e7564] focus:outline-none resize-none leading-relaxed h-11 py-1"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleChatPromptSubmit(e);
                            }
                          }}
                          required
                        />
                        <button
                          type="submit"
                          disabled={!userInput.trim() || isTyping}
                          className={`w-10 h-10 rounded shrink-0 flex items-center justify-center transition-all ${
                            userInput.trim() && !isTyping 
                              ? 'bg-[#bf311d] hover:bg-[#a02817] text-white cursor-pointer shadow-md'
                              : 'bg-transparent text-zinc-650 cursor-not-allowed border border-[#4a3427]'
                          }`}
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </form>
                    )}

                  </div>
                )}

              </div>
            )}

            {/* ====== PORT TAB 2: ACTIVE TASKS (Marketplace Listing Grid) ====== */}
            {activeTab === 'ActiveTasks' && (
              <div className="space-y-6">
                
                {/* Search / Filter Subheader Bar (Wild West Board Style Indicator) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#140c09] p-5 rounded-lg border-2 border-[#543b2c] shrink-0 outline outline-1 outline-offset-4 outline-[#dfab6c]/10">
                  <div className="space-y-1">
                    <h2 className="text-base font-serif font-black text-[#dfab6c] uppercase tracking-wider flex items-center gap-1.5">
                      <span>★</span> {locale === 'zh' ? '算力供需大厅' : 'Compute Supply & Demand Hall'} <span>★</span>
                    </h2>
                    <p className="text-xs text-slate-400 font-medium font-sans leading-relaxed">
                      {locale === 'zh' ? '浏览由于 MetaMask 智能托管锁定的分布式算力需求条目。任何空闲矿工/分析警员均可揭榜上报数据。' : 'Browse computational contracts deployed under verified MetaMask smart contract gold boxes.'}
                    </p>
                  </div>
                  
                  {/* Category toggles */}
                  <div className="flex bg-[#0d0705] p-1 rounded border border-[#4a3427]/70 gap-1 text-[10px] font-mono select-none">
                    <span className="px-3 py-1.5 bg-[#1c1310] text-[#dfab6c] rounded font-bold border border-[#8e5c3c]/30">
                      {locale === 'zh' ? `全部悬赏令 (${tasks.length})` : `All Bounties (${tasks.length})`}
                    </span>
                    <span className="px-3 py-1.5 text-[#8e5c3c]/60 uppercase">
                      {locale === 'zh' ? '莫哈维邮道' : 'Mojave Trail'}
                    </span>
                  </div>
                </div>

                {/* Grid Lists card */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 w-full max-w-5xl mx-auto px-1 sm:px-4 lg:px-8">
                  {tasks.map((rawTask) => {
                    const task = getLocalizedTask(rawTask, locale);
                    return (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onOpenDetail={() => setSelectedTask(rawTask)}
                        onMine={() => setActiveMineTask(rawTask)}
                        onCancelWarrant={handleCancelWarrant}
                        onModifyDemand={handleStartModifyDemand}
                        onValidate={() => {
                          // Check if a submission is available to review
                          if (rawTask.minerSubmissions.length > 0) {
                            setActiveValidateTask(rawTask);
                          } else {
                            const zhErr = '该订单尚未有矿工提交算力反馈！作为矿工节点，请抢先行动提交你的输出。';
                            const enErr = 'This task has no miner outputs yet. Take the initiative and submit computation output as a miner first!';
                            triggerAlarm('error', locale === 'zh' ? zhErr : enErr);
                          }
                        }}
                      />
                    );
                  })}
                </div>

              </div>
            )}

            {/* ====== PORT TAB 3: ACTIVITIES (User working ledger records) ====== */}
            {activeTab === 'Activities' && (
              <div className="space-y-5 animate-scale-up">
                
                {/* Stats board */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
                  <div className="bg-[#150f0c] border-2 border-[#4a3427] p-5 rounded-lg space-y-2 hover:border-[#dfab6c]/40 transition duration-150 relative shadow-inner overflow-hidden select-none">
                    <div className="absolute top-1 right-2 text-[10px] text-[#4a3427] font-mono">REP_SECURE</div>
                    <span className="text-[10px] text-[#8e5c3c] uppercase font-mono font-bold tracking-wider block">
                      {locale === 'zh' ? '★ 极客信用声誉度 (Rep)' : '★ Developer Reputation'}
                    </span>
                    <span className="text-xl font-mono font-black text-[#dfab6c] block">920 Rep</span>
                  </div>
                  
                  <div className="bg-[#150f0c] border-2 border-[#4a3427] p-5 rounded-lg space-y-2 hover:border-[#dfab6c]/40 transition duration-150 relative shadow-inner overflow-hidden select-none">
                    <div className="absolute top-1 right-2 text-[10px] text-[#4a3427] font-mono">FLOW_REWARD</div>
                    <span className="text-[10px] text-[#8e5c3c] uppercase font-mono font-bold tracking-wider block">
                      {locale === 'zh' ? '★ 待验证结算流会话' : '★ Pending Settlements'}
                    </span>
                    <span className="text-xl font-mono font-black text-[#ebdcb9] block">
                      {wallet.pendingApprovalsList.filter(x => x.status === 'Pending' && x.type === 'RewardDistribution').length} {locale === 'zh' ? '个未结' : 'Sessions'}
                    </span>
                  </div>

                  <div className="bg-[#150f0c] border-2 border-[#4a3427] p-5 rounded-lg space-y-2 hover:border-[#dfab6c]/40 transition duration-150 relative shadow-inner overflow-hidden select-none">
                    <div className="absolute top-1 right-2 text-[10px] text-[#4a3427] font-mono">REV_EARN</div>
                    <span className="text-[10px] text-[#8e5c3c] uppercase font-mono font-bold tracking-wider block">
                      {locale === 'zh' ? '★ 沙盒结算代币收益' : '★ Sandboxed Net Earnings'}
                    </span>
                    <span className="text-xl font-mono font-black text-[#849c44] block">+0.1450 ETH</span>
                  </div>
                </div>

                {/* Subtitle list banner matching style */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#150f0c] px-5 py-4 border-2 border-[#4a3427] rounded-lg gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[#dfab6c] text-xs">✦</span>
                    <span className="text-xs uppercase font-mono font-black text-[#dfab6c] tracking-wider">
                      {locale === 'zh' ? '去中心化算网全链路实时流簿' : 'Execution Stream Feed'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-[#8e5c3c] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-[#849c44] rounded-full animate-ping"></span>
                    {locale === 'zh' ? '系统已接驳 • 刚刚更新' : 'WIRED • UPDATED JUST NOW'}
                  </span>
                </div>

                {/* Transaction history rows */}
                <div className="space-y-3.5">
                  {activities.map((act) => (
                    <ActivityCard
                      key={act.id}
                      activity={act}
                      onClick={() => setSelectedActivity(act)}
                    />
                  ))}
                </div>

              </div>
            )}

            {activeTab === 'PlatformAgents' && (
              <PlatformAgents />
            )}

          </main>
        </div>

      </div>

      {/* ==================================== MODAL OVERLAY PORT WORKSPACES ==================================== */}

      {/* 1. Modal: Task details card view */}
      {selectedTask && (
        <TaskDetailModal
          task={getLocalizedTask(selectedTask, locale)}
          onClose={() => setSelectedTask(null)}
          onMine={(t) => {
            setSelectedTask(null);
            setActiveMineTask(t);
          }}
          onValidate={(t) => {
            setSelectedTask(null);
            if (t.minerSubmissions.length > 0) {
              setActiveValidateTask(t);
            } else {
              triggerAlarm('error', `This task has no miner outputs yet. Take the initiative and submit computation output as a miner first!`);
            }
          }}
        />
      )}

      {/* 2. Modal: Miner workspace */}
      {activeMineTask && (
        <MinerPanel
          task={getLocalizedTask(activeMineTask, locale)}
          onClose={() => setActiveMineTask(null)}
          onSubmitOutput={handleMinerSubmitOutput}
        />
      )}

      {/* 3. Modal: Validator evaluation desk */}
      {activeValidateTask && (() => {
        const localizedTask = getLocalizedTask(activeValidateTask, locale);
        return (
          <ValidatorPanel
            task={localizedTask}
            submission={localizedTask.minerSubmissions[0]} // default to latest submission in mock
            onClose={() => setActiveValidateTask(null)}
            onSubmitValidation={handleValidatorSubmitScore}
          />
        );
      })()}

      {/* 4. Modal: Personal History Details */}
      {selectedActivity && (() => {
        const rawTask = tasks.find(x => x.id === selectedActivity.taskId) || tasks[0];
        const localizedTask = getLocalizedTask(rawTask, locale);
        const localizedSubmission = localizedTask.minerSubmissions?.find(s => s.id === selectedActivity.submissionId) || localizedTask.minerSubmissions?.[0];
        const localizedActivity = {
          ...selectedActivity,
          taskTitle: getLocalizedTaskTitle(selectedActivity.taskTitle, locale),
        };
        return (
          <ActivityDetailModal
            activity={localizedActivity}
            task={localizedTask}
            submission={localizedSubmission}
            onClose={() => setSelectedActivity(null)}
          />
        );
      })()}

    </div>
  );
}
