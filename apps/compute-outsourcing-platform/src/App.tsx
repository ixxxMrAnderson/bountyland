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
  ShieldCheck
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
import introBackground from '../../../img/intro_page_concept.png';

interface IntroLandingProps {
  locale: 'en' | 'zh';
  onLogin: () => void;
  onToggleLanguage: () => void;
}

const IntroLanding: React.FC<IntroLandingProps> = ({ locale, onLogin, onToggleLanguage }) => {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080504] text-[#f4e5c3]">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${introBackground})` }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,3,2,0.78)_0%,rgba(5,3,2,0.34)_48%,rgba(5,3,2,0.12)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#070403] via-[#070403]/45 to-transparent" />

      <button
        type="button"
        onClick={onToggleLanguage}
        className="absolute right-6 top-6 z-20 h-10 px-4 border border-[#e0ad71]/45 bg-[#100907]/75 text-[#f0c384] hover:bg-[#1a100c] hover:border-[#f0c384] transition font-mono text-xs font-bold tracking-[0.18em]"
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
              className="h-8 min-w-24 border border-[#e0ad71]/20 bg-[#130b08]/28 px-5 text-center font-display text-[8px] font-normal uppercase tracking-[0.46em] text-[#e7bd7d]/48 transition hover:border-[#f0c384]/55 hover:bg-[#21140f]/45 hover:text-[#f0c384]/78"
            >
              About
            </button>
            <button
              type="button"
              onClick={onLogin}
              className="group h-8 min-w-24 border border-[#912a19]/34 bg-[#bf311d]/42 px-5 text-center font-display text-[8px] font-normal uppercase tracking-[0.46em] text-white/52 shadow-[0_14px_32px_rgba(191,49,29,0.08)] transition hover:bg-[#a92918]/68 hover:text-white/82"
            >
              <span className="inline-flex items-center justify-center gap-3">
                Login
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </button>
          </div>
        </div>
      </section>
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
  
  // Wallet state containing Cobo credentials
  const [wallet, setWallet] = useState<WalletState>({
    connected: true,
    address: '0x714262009486asiaeast1runapp',
    balance: 2.450,
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
  const [web3Urgency, setWeb3Urgency] = useState('24 Hours');
  const [web3CustomNotes, setWeb3CustomNotes] = useState('');
  const [web3Bounty, setWeb3Bounty] = useState('0.150');
  
  // Dataset Miner Form parameters
  const [datasetDomain, setDatasetDomain] = useState('Financial Chain-of-Thought Reasoning');
  const [datasetSize, setDatasetSize] = useState('1000');
  const [datasetSources, setDatasetSources] = useState('');
  const [datasetSchema, setDatasetSchema] = useState('JSONL with query key, logical rationale thought-blocks, and verified gold response');
  const [datasetCleaning, setDatasetCleaning] = useState('');
  const [datasetValidationMetric, setDatasetValidationMetric] = useState('diversity-heavy');
  const [datasetUrgency, setDatasetUrgency] = useState('48 Hours');
  const [datasetCustomNotes, setDatasetCustomNotes] = useState('');
  const [datasetBounty, setDatasetBounty] = useState('0.180');

  // Submit and loading lifecycle parameters
  const [formSubmittingStage, setFormSubmittingStage] = useState<'none' | 'analyzing' | 'proposal_ready'>('none');
  const [draftedProposal, setDraftedProposal] = useState<any>(null);

  // Global Alerts feed
  const [feedback, setFeedback] = useState<{ type: 'success' | 'alert' | 'error'; message: string } | null>(null);

  // Helper trigger to announce feedback
  const triggerAlarm = (type: 'success' | 'alert' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 6000);
  };

  // Automated Web3 Debug Request Form Submission handler
  const handleWeb3FormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmittingStage('analyzing');
    
    setTimeout(() => {
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

      setDraftedProposal({
        type: 'web3',
        title: locale === 'zh' ? `智能合约 ${web3IssueType} 漏洞排查修复` : `${web3IssueType} Exploit Sandbox Analysis`,
        description: `Audit target scope: VM/Chain: ${web3VMType}, suspected exploit: ${web3IssueType}. Repository Target: ${web3RepoUrl || 'Direct copy text'}. Suspected Address: ${web3ContractAddr || 'Local workspace'}. Files: ${web3FileScope || 'All elements'}. Deliverable: ${web3Deliverables.join(', ')}. Additional Details: ${web3CustomNotes || 'None'}.`,
        rewardPool: parseFloat(web3Bounty) || 0.150,
        depositAmount: parseFloat(web3Bounty) || 0.150,
        aiThresholdLine: 75,
        criteriaName: criteriaOption.name,
        selectedCriteriaOption: criteriaOption,
        outputFormat: 'Solidity Compiler Patch',
        rawPromptText: `Debug Contract ${web3IssueType}`
      });

      setFormSubmittingStage('proposal_ready');
    }, 1800);
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
        rewardPool: parseFloat(datasetBounty) || 0.180,
        depositAmount: parseFloat(datasetBounty) || 0.180,
        aiThresholdLine: 72,
        criteriaName: criteriaOption.name,
        selectedCriteriaOption: criteriaOption,
        outputFormat: 'JSON Lines (.jsonl)',
        rawPromptText: `Outsource Dataset ${datasetDomain}`
      });

      setFormSubmittingStage('proposal_ready');
    }, 1800);
  };

  // Approve proposal and deposit/lock assets using Cobo Wallet balance
  const handleDeployDraftedProposal = () => {
    if (!draftedProposal) return;

    if (wallet.balance < draftedProposal.rewardPool) {
      triggerAlarm('error', locale === 'zh' ? 'MetaMask 智能托管代扣失败：可用 ETH 余量不足！' : 'Escrow Deposit failed: Insufficient wallet balance!');
      return;
    }

    const newTaskId = 'task-' + (tasks.length + 1);
    const assignedName = draftedProposal.type === 'web3' ? 'Platform Debug Killer' : 'Platform Data Mining Agent';

    const newlyDeployed: Task = {
      id: newTaskId,
      title: draftedProposal.title,
      description: draftedProposal.description + ` Checked against custom verification criteria options. Handed over to our assigned specialist: ${assignedName}.`,
      createdAt: new Date().toISOString(),
      deadline: draftedProposal.type === 'web3' ? '24h remaining' : '48h remaining',
      rewardPool: draftedProposal.rewardPool,
      depositAmount: draftedProposal.depositAmount,
      aiAuditEnabled: true,
      aiThresholdLine: draftedProposal.aiThresholdLine,
      status: 'Agent is working', // Custodian state matching Section 2
      assignedAgent: assignedName, // Assigns Agent name matching Section 4
      criteriaName: draftedProposal.criteriaName,
      selectedCriteriaOption: draftedProposal.selectedCriteriaOption,
      outputFormat: draftedProposal.outputFormat,
      taskURI: `ipfs://Qm${generateHash('task_')}`,
      orderURI: `ipfs://Qm${generateHash('order_')}`,
      criteriaHash: generateHash('0x'),
      minerSubmissionsCount: 0,
      minerSubmissions: []
    };

    setTasks((prev) => [newlyDeployed, ...prev]);

    setWallet((prev) => ({
      ...prev,
      balance: parseFloat((prev.balance - draftedProposal.rewardPool).toFixed(4))
    }));

    triggerAlarm('success', locale === 'zh' ? `托管锁仓契约签署就绪！警长 ${assignedName} 已被成功分派并开始作业。` : `MetaMask pact locked and funded successfully! ${assignedName} is now on active duty.`);

    // Refresh states
    setDraftedProposal(null);
    setFormSubmittingStage('none');
    setDefinePath(null);

    // Auto navigate to market hall
    setTimeout(() => {
      setActiveTab('ActiveTasks');
    }, 1000);
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

    const enMeSelect = `I choose Option: ${option.name}`;
    const zhMeSelect = `我选择验收标准指标：${locale === 'zh' ? (option.id.includes('correctness') ? '代码逻辑高确定性检验' : '语法与边界覆盖度高宽容审计') : option.name}`;
    
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
      const passScore = option.id.includes('correctness') ? 80 : 72;

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
            options: option
          }
        }
      ]);

      const mockDepl = {
        title: `Decentralized Outsourcing Task #${tasks.length + 1}`,
        description: `Natural language query defined: "${chatMessages[0]?.text || 'Outsource task computation'}"`,
        rewardPool: reward,
        depositAmount: deposit,
        aiThresholdLine: passScore,
        criteriaName: option.name,
        selectedCriteriaOption: option,
        outputFormat: option.outputRequirements.split(' ')[0] || 'JSONL',
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
        minerSubmissions: []
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
    <div className="min-h-screen bg-dark-bg font-sans flex flex-col antialiased text-[#ebdcb9]">
      
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
      <div className="flex-1 flex max-w-[1440px] w-full mx-auto relative divide-x divide-amber-950/20 min-h-screen">
        
        {/* ================= LEFT SIDEBAR PANEL ================= */}
        <div className="hidden md:flex w-72 lg:w-80 flex-col justify-between p-6 bg-[#0f0a08] shrink-0 gap-6 border-r border-[#4a3427]/40">
          
          <div className="flex flex-col gap-6">
            {/* Logo and Brand Title (Sheriff Badge Style) */}
            <div className="flex items-center gap-3 bg-[#150f0c] p-3 rounded-lg border border-[#4a3427]">
              <div className="w-10 h-10 rounded-full bg-[#1c1310] border-2 border-[#dfab6c] flex items-center justify-center shadow-lg shadow-black/30">
                <Scale className="w-5 h-5 text-[#dfab6c] animate-pulse" />
              </div>
              <div className="flex flex-col">
                <span className="font-serif font-black text-xs tracking-wider text-[#dfab6c] uppercase">{t('appName')}</span>
                <span className="font-mono text-[8px] text-[#8e5c3c] uppercase tracking-widest font-bold mt-0.5">{t('appSubName')}</span>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="flex flex-col gap-1.5 font-mono text-[11px] uppercase tracking-wider">
              <button
                onClick={() => setActiveTab('DefineNewTask')}
                className={`flex items-center justify-between px-3.5 py-3 rounded text-[11px] font-mono tracking-wider transition group border ${
                  activeTab === 'DefineNewTask'
                    ? 'bg-[#1c1310] text-[#dfab6c] border-[#8e5c3c]/80 shadow-md'
                    : 'text-[#8c745d] border-transparent hover:text-[#ebdcb9] hover:bg-[#150f0c]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className={`w-4 h-4 shrink-0 transition ${activeTab === 'DefineNewTask' ? 'text-[#dfab6c]' : 'text-[#8e5c3c] group-hover:text-[#dfab6c]'}`} />
                  {t('navDefineNewTask')}
                </div>
                <ChevronRight className={`w-3.5 h-3.5 transition ${activeTab === 'DefineNewTask' ? 'translate-x-0.5 text-[#dfab6c]' : 'text-[#4a3427] group-hover:text-[#8e5c3c]'}`} />
              </button>

              <button
                onClick={() => setActiveTab('ActiveTasks')}
                className={`flex items-center justify-between px-3.5 py-3 rounded text-[11px] font-mono tracking-wider transition group border ${
                  activeTab === 'ActiveTasks'
                    ? 'bg-[#1c1310] text-[#dfab6c] border-[#8e5c3c]/80 shadow-md'
                    : 'text-[#8c745d] border-transparent hover:text-[#ebdcb9] hover:bg-[#150f0c]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ListTodo className={`w-4 h-4 shrink-0 transition ${activeTab === 'ActiveTasks' ? 'text-[#dfab6c]' : 'text-[#8e5c3c] group-hover:text-[#dfab6c]'}`} />
                  {t('navMarketplace')}
                </div>
                <ChevronRight className={`w-3.5 h-3.5 transition ${activeTab === 'ActiveTasks' ? 'translate-x-0.5 text-[#dfab6c]' : 'text-[#4a3427] group-hover:text-[#8e5c3c]'}`} />
              </button>

              <button
                onClick={() => setActiveTab('Activities')}
                className={`flex items-center justify-between px-3.5 py-3 rounded text-[11px] font-mono tracking-wider transition group border ${
                  activeTab === 'Activities'
                    ? 'bg-[#1c1310] text-[#dfab6c] border-[#8e5c3c]/80 shadow-md'
                    : 'text-[#8c745d] border-transparent hover:text-[#ebdcb9] hover:bg-[#150f0c]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Coins className={`w-4 h-4 shrink-0 transition ${activeTab === 'Activities' ? 'text-[#dfab6c]' : 'text-[#8e5c3c] group-hover:text-[#dfab6c]'}`} />
                  {t('navNavRegistry')}
                </div>
                <ChevronRight className={`w-3.5 h-3.5 transition ${activeTab === 'Activities' ? 'translate-x-0.5 text-[#dfab6c]' : 'text-[#4a3427] group-hover:text-[#8e5c3c]'}`} />
              </button>

              <button
                onClick={() => setActiveTab('PlatformAgents')}
                className={`flex items-center justify-between px-3.5 py-3 rounded text-[11px] font-mono tracking-wider transition group border ${
                  activeTab === 'PlatformAgents'
                    ? 'bg-[#1c1310] text-[#dfab6c] border-[#8e5c3c]/80 shadow-md'
                    : 'text-[#8c745d] border-transparent hover:text-[#ebdcb9] hover:bg-[#150f0c] font-bold'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Bot className={`w-4 h-4 shrink-0 transition ${activeTab === 'PlatformAgents' ? 'text-[#dfab6c]' : 'text-[#8e5c3c] group-hover:text-[#dfab6c]'}`} />
                  {locale === 'zh' ? '杀手 Agent 名人堂' : 'Hall of Killer Agents'}
                </div>
                <ChevronRight className={`w-3.5 h-3.5 transition ${activeTab === 'PlatformAgents' ? 'translate-x-0.5 text-[#dfab6c]' : 'text-[#4a3427] group-hover:text-[#8e5c3c]'}`} />
              </button>
            </nav>
          </div>

          {/* Platform Performance Stats Dashboard */}
          <div className="flex flex-col gap-1 leading-none">
            <NetworkStatsWidget />
          </div>

          {/* Embedded Cobo Agentic Wallet state indicator widget */}
          <div className="flex flex-col gap-4">
            <CoboWalletWidget
              walletState={wallet}
              onApproveItem={handleApproveWalletItem}
              onRejectItem={handleRejectWalletItem}
            />
            {/* Version credits */}
            <div className="flex items-center justify-between text-[10px] text-slate-600 font-mono px-1">
              <span>Arbitrum Nova devnet</span>
              <span>v1.0.0 (MVP)</span>
            </div>
          </div>

        </div>

        {/* ================= RIGHT PORT CONTENT SCREEN ================= */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          
          {/* Top Panel Banner */}
          <header className="border-b border-slate-850/60 px-6 py-4 flex items-center justify-between bg-slate-950/40 sticky top-0 backdrop-blur-md z-40 shrink-0">
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
                            Platform Debug Agent · GLM-4.5 Flash · Rating 4.8/5
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
                        <div className="text-3xl">🛡️</div>
                        <div>
                          <h3 className="font-serif font-black text-sm text-[#ebdcb9] uppercase tracking-wider">
                            {locale === 'zh' ? 'WEB3 开发漏洞审计调试契约构建器' : 'Web3 Contract Debug Pact Creator'}
                          </h3>
                          <p className="text-[10px] font-mono text-[#dfab6c] uppercase">
                            Manned by: Platform Debug Agent · GLM-4.5 Flash Dual Sandbox
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

                        {/* Budget & Urgency */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono text-[#8e7564] font-black uppercase block">
                              {locale === 'zh' ? '调试加急周期 (SLA Timeframe)' : 'SLA Target timeframe'}
                            </label>
                            <select 
                              value={web3Urgency}
                              onChange={(e) => setWeb3Urgency(e.target.value)}
                              className="w-full h-9 px-2 bg-[#0b0705] border border-[#4a3427] rounded text-xs font-mono text-[#ebdcb9] outline-none focus:border-[#dfab6c]"
                            >
                              <option value="12 Hours">12 Hours (特急代扣)</option>
                              <option value="24 Hours">24 Hours (常规加急)</option>
                              <option value="48 Hours">48 Hours (标准作业)</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-mono text-[#8e7564] font-black uppercase block">
                              {locale === 'zh' ? '预设多签托管赏金金额 (Reward ETH)' : 'Pact locked reward pool (ETH)'}
                            </label>
                            <div className="relative">
                              <input 
                                type="number"
                                step="0.01"
                                required
                                min="0.01"
                                value={web3Bounty}
                                onChange={(e) => setWeb3Bounty(e.target.value)}
                                className="w-full h-9 pl-3 pr-12 bg-[#0b0705] border border-[#4a3427] rounded text-xs text-[#ebdcb9] outline-none focus:border-[#dfab6c]"
                              />
                              <span className="absolute right-3 top-2 text-[10px] font-sans font-black text-[#dfab6c]">ETH</span>
                            </div>
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
                        <div className="text-3xl">⛏️</div>
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

                        {/* Budget & Urgency */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-1">
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono text-[#8e7564] font-black uppercase block">
                              {locale === 'zh' ? '数据归档加急周期 (SLA)' : 'SLA Target timeframe'}
                            </label>
                            <select 
                              value={datasetUrgency}
                              onChange={(e) => setDatasetUrgency(e.target.value)}
                              className="w-full h-9 px-2 bg-[#0b0705] border border-[#4a3427] rounded text-xs font-mono text-[#ebdcb9] outline-none focus:border-[#dfab6c]"
                            >
                              <option value="24 Hours">24 Hours (加急发掘)</option>
                              <option value="48 Hours">48 Hours (常规对账)</option>
                              <option value="72 Hours">72 Hours (标准清算)</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-mono text-[#8e7564] font-black uppercase block">
                              {locale === 'zh' ? '预设多签托管代扣赏金 (Reward ETH)' : 'Pact locked reward pool (ETH)'}
                            </label>
                            <div className="relative">
                              <input 
                                type="number"
                                step="0.01"
                                required
                                min="0.01"
                                value={datasetBounty}
                                onChange={(e) => setDatasetBounty(e.target.value)}
                                className="w-full h-9 pl-3 pr-12 bg-[#0b0705] border border-[#4a3427] rounded text-xs text-[#ebdcb9] outline-none focus:border-[#dfab6c]"
                              />
                              <span className="absolute right-3 top-2 text-[10px] font-sans font-black text-[#dfab6c]">ETH</span>
                            </div>
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
                        <div className="w-12 h-12 rounded bg-[#201511] border border-[#4a3427] flex items-center justify-center text-[#dfab6c] text-xl">
                          📜
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
                            <div className={`w-7 h-7 rounded-sm shrink-0 flex items-center justify-center font-mono text-[10px] ${
                              msg.sender === 'user' 
                                ? 'bg-[#4a3427] text-[#dfab6c] border border-[#dfab6c]/20' 
                                : 'bg-[#150f0c] text-[#ebdcb9] border border-[#4a3427]'
                            }`}>
                              {msg.sender === 'user' ? '★' : '📜'}
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
                                    let optName = opt.name;
                                    let optDesc = opt.description;
                                    if (locale === 'zh') {
                                      optName = opt.id.includes('correctness') ? '代码逻辑高确定性检验' : '语法与边界覆盖度高宽容审计';
                                      optDesc = opt.id.includes('correctness') 
                                        ? '深度考核代码逻辑正确性、测试用例无错契合度以及对智能合约漏洞精确解析得分，权重分配重点在逻辑审查'
                                        : '高宽容边缘场景覆盖规则，注重多轮思维推理的连贯与输出格式的严格对账（JSONL），适用于大规模常规模型校准';
                                    }
                                    return (
                                      <div 
                                        key={opt.id} 
                                        className={`bg-[#0b0705] p-3.5 rounded border flex flex-col justify-between transition-all relative ${
                                          isSelected 
                                            ? 'border-[#dfab6c] ring-1 ring-[#dfab6c]/30' 
                                            : 'border-[#4a3427] hover:border-[#dfab6c]/60'
                                        }`}
                                      >
                                        <div>
                                          <h4 className="font-serif font-black text-xs text-[#ebdcb9] mb-1.5 flex items-center justify-between uppercase">
                                            {optName}
                                            {isSelected && <span className="bg-[#dfab6c] text-[#150f0c] rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">✓</span>}
                                          </h4>
                                          <p className="text-[10px] text-[#a58d7c] font-mono leading-relaxed mt-1">{optDesc}</p>
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
                                        {locale === 'zh' ? (msg.orderPreview.options.id.includes('correctness') ? '代码逻辑高确定性检验' : '语法与边界覆盖度高宽容审计') : msg.orderPreview.options.name}
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {tasks.map((rawTask) => {
                    const task = getLocalizedTask(rawTask, locale);
                    return (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onOpenDetail={() => setSelectedTask(rawTask)}
                        onMine={() => setActiveMineTask(rawTask)}
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
