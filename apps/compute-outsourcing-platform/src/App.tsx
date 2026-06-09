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
  LogOut
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

export default function App() {
  const { t, locale, setLanguage } = useTranslation();
  
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
    triggerAlarm('success', locale === 'zh' ? '成功安全退出登录。' : 'Successfully logged out safely.');
  };

  const [activeTab, setActiveTab] = useState<'DefineNewTask' | 'ActiveTasks' | 'Activities'>('DefineNewTask');
  
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

  // Global Alerts feed
  const [feedback, setFeedback] = useState<{ type: 'success' | 'alert' | 'error'; message: string } | null>(null);

  // Helper trigger to announce feedback
  const triggerAlarm = (type: 'success' | 'alert' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 6000);
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

    triggerAlarm('alert', 'Cobo Pact requested! Check your pending Pacts in the sidebar wallet widget to authorize budget escrow.');

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
          text: `🎉 CONGRATULATIONS! Cobo Wallet securely approved the deposit escrow. Computation Order #${newTaskId} is now active in the Task Marketplace.`
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

      triggerAlarm('success', `Cobo Escrow release finalized! Tokens distributed according to audited score math parameters.`);
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
    triggerAlarm('error', 'Cobo Wallet request declined. Computation session state rolled back.');
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

  return (
    <div className="min-h-screen bg-dark-bg font-sans flex flex-col antialiased text-slate-100">
      
      {/* Dynamic Floating Feedback Banner */}
      {feedback && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-bounce max-w-sm sm:max-w-md w-full">
          <div className={`p-4 rounded-xl border flex gap-3 shadow-2xl backdrop-blur-md ${
            feedback.type === 'success' ? 'bg-brand-emerald/10 border-brand-emerald/30 text-brand-emerald' :
            feedback.type === 'alert' ? 'bg-brand-indigo/10 border-brand-indigo/30 text-slate-100' :
            'bg-brand-rose/10 border-brand-rose/30 text-brand-rose'
          }`}>
            {feedback.type === 'success' && <Check className="w-5 h-5 shrink-0" />}
            {feedback.type === 'alert' && <Info className="w-5 h-5 shrink-0 text-brand-cyan" />}
            {feedback.type === 'error' && <ShieldAlert className="w-5 h-5 shrink-0 text-brand-rose animate-pulse" />}
            <div className="text-xs font-medium leading-relaxed">
              {feedback.message}
            </div>
          </div>
        </div>
      )}

      {/* Unauthenticated Security Session Guard Interception */}
      {!user ? (
        <AuthPanel onAuthSuccess={handleAuthSuccess} />
      ) : (
        <>
          {/* Main Container Layout */}
          <div className="flex-1 flex max-w-[1440px] w-full mx-auto relative divide-x divide-slate-850/60 min-h-screen">
        
        {/* ================= LEFT SIDEBAR PANEL ================= */}
        <div className="hidden md:flex w-72 lg:w-80 flex-col justify-between p-6 bg-slate-950 shrink-0 gap-6 border-r border-slate-850">
          
          <div className="flex flex-col gap-6">
            {/* Logo and Brand Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-indigo via-brand-cyan to-indigo-600 flex items-center justify-center shadow-lg shadow-brand-indigo/20">
                <Bot className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div className="flex flex-col">
                <span className="font-display font-black text-sm tracking-wide text-white uppercase">{t('appName')}</span>
                <span className="font-mono text-[9px] text-slate-500 uppercase tracking-widest font-semibold mt-0.5">{t('appSubName')}</span>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="flex flex-col gap-1">
              <button
                onClick={() => setActiveTab('DefineNewTask')}
                className={`flex items-center justify-between px-3.5 py-3 rounded-lg text-sm font-semibold transition group ${
                  activeTab === 'DefineNewTask'
                    ? 'bg-brand-indigo/10 text-white border border-brand-indigo/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="w-4 h-4 text-brand-purple shrink-0" />
                  {t('navDefineNewTask')}
                </div>
                <ChevronRight className={`w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition ${activeTab === 'DefineNewTask' ? 'translate-x-0.5 text-brand-cyan' : ''}`} />
              </button>

              <button
                onClick={() => setActiveTab('ActiveTasks')}
                className={`flex items-center justify-between px-3.5 py-3 rounded-lg text-sm font-semibold transition group ${
                  activeTab === 'ActiveTasks'
                    ? 'bg-brand-indigo/10 text-white border border-brand-indigo/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ListTodo className="w-4 h-4 text-brand-cyan shrink-0" />
                  {t('navMarketplace')}
                </div>
                <ChevronRight className={`w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition ${activeTab === 'ActiveTasks' ? 'translate-x-0.5 text-brand-cyan' : ''}`} />
              </button>

              <button
                onClick={() => setActiveTab('Activities')}
                className={`flex items-center justify-between px-3.5 py-3 rounded-lg text-sm font-semibold transition group ${
                  activeTab === 'Activities'
                    ? 'bg-brand-indigo/10 text-white border border-brand-indigo/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Coins className="w-4 h-4 text-brand-emerald shrink-0" />
                  {t('navRegistry')}
                </div>
                <ChevronRight className={`w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition ${activeTab === 'Activities' ? 'translate-x-0.5 text-brand-cyan' : ''}`} />
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
            
            {/* ====== PORT TAB 1: DEFINE NEW TASK (Conversational ChatGPT Layout) ====== */}
            {activeTab === 'DefineNewTask' && (
              <div className="flex-1 flex flex-col justify-between max-w-3xl w-full mx-auto space-y-6">
                
                {/* Intro Hero view when conversation is empty */}
                {chatMessages.length === 0 ? (
                  <div className="flex-1 flex flex-col justify-center items-center text-center py-12 space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-brand-indigo/10 border border-brand-indigo/20 flex items-center justify-center animate-pulse">
                      <Sparkles className="w-7 h-7 text-brand-purple" />
                    </div>
                    <div className="space-y-1.5 max-w-sm">
                      <h2 className="font-display font-extrabold text-2xl text-white tracking-tight">
                        {t('heroTitle')}
                      </h2>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {t('heroSub')}
                      </p>
                    </div>

                    {/* Pre-packaged quick input suggestions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md pt-6 text-left">
                      <button 
                        onClick={() => {
                          const zhPrompt = "我们需要一个包含 100 个带标注的智能合约 Solidity 重入漏洞安全审计问答数据集。";
                          const enPrompt = "We need a QA dataset containing 100 annotated smart contract code audits exploring reentrancy vector edge cases in Solidity.";
                          setUserInput(locale === 'zh' ? zhPrompt : enPrompt);
                        }}
                        className="bg-slate-900 border border-slate-800 p-3 rounded-xl hover:border-slate-700 transition flex items-center justify-between text-left group cursor-pointer"
                      >
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-brand-indigo font-mono">
                            {locale === 'zh' ? '智能合约安全审计' : 'CONTRACT DEFI AUDITS'}
                          </span>
                          <span className="text-[10px] text-slate-400 line-clamp-1 block">
                            {locale === 'zh' ? '100个Solidity重入攻击深度诊断数据集' : 'Solidity reentrancy dataset with 100 code pieces'}
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition shrink-0" />
                      </button>

                      <button 
                        onClick={() => {
                          const zhPrompt = "定制一份包含 500 个多轮演算法推导的金融商业推演逻辑基准问答数据集，用于大语言模型强化微调。";
                          const enPrompt = "Outsource a high fidelity reasoning QA benchmark dataset with 500 multi-turn logical solutions for finance model training.";
                          setUserInput(locale === 'zh' ? zhPrompt : enPrompt);
                        }}
                        className="bg-slate-900 border border-slate-800 p-3 rounded-xl hover:border-slate-700 transition flex items-center justify-between text-left group cursor-pointer"
                      >
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-brand-cyan font-mono">
                            {locale === 'zh' ? '金融算数深度强化逻辑' : 'FINANCE LOGICS'}
                          </span>
                          <span className="text-[10px] text-slate-400 line-clamp-1 block">
                            {locale === 'zh' ? '500个多步推理的算学求解微调语料' : '500 multi-turn multi-hop equations dataset'}
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition shrink-0" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Active message logs thread */
                  <div className="flex-1 space-y-5 overflow-y-auto pr-1 pb-6 max-h-[76vh] md:max-h-[78vh]">
                    {chatMessages.map((msg, index) => (
                      <div 
                        key={index} 
                        className={`flex gap-3 max-w-[85%] ${
                          msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                        }`}
                      >
                        {/* Avatar */}
                        <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-mono text-xs ${
                          msg.sender === 'user' 
                            ? 'bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20' 
                            : 'bg-brand-indigo/10 text-brand-indigo border border-brand-indigo/20'
                        }`}>
                          {msg.sender === 'user' ? (locale === 'zh' ? '我' : 'Me') : <Bot className="w-4 h-4 text-brand-purple" />}
                        </div>

                        {/* Speech Bubble Card */}
                        <div className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-3 ${
                          msg.sender === 'user'
                            ? 'bg-slate-950 border-slate-800 text-slate-100 rounded-tr-none'
                            : 'bg-slate-900 border-slate-800 text-slate-300 rounded-tl-none'
                        }`}>
                          <p>{msg.text}</p>

                          {/* Render Criteria Cards Option */}
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
                                    className={`bg-slate-950 p-3.5 rounded-xl border flex flex-col justify-between transition-all relative ${
                                      isSelected 
                                        ? 'border-brand-cyan ring-1 ring-brand-cyan/30' 
                                        : 'border-slate-850 hover:border-slate-700'
                                    }`}
                                  >
                                    <div>
                                      <h4 className="font-display font-semibold text-xs text-white mb-1.5 flex items-center justify-between">
                                        {optName}
                                        {isSelected && <span className="bg-brand-cyan text-slate-950 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">✓</span>}
                                      </h4>
                                      <p className="text-[10px] text-slate-400 font-mono leading-relaxed mt-1">{optDesc}</p>
                                      
                                      <div className="text-[9px] text-slate-500 uppercase font-mono mt-3 select-none">
                                        {locale === 'zh' ? '部分考核指标：' : 'Checking checkmarks:'}
                                      </div>
                                      <ul className="text-[9px] text-slate-400 space-y-1 mt-1 pl-2 list-disc list-inside">
                                        {opt.checklist.slice(0, 2).map((li, i) => {
                                          let checklistItemZh = li;
                                          if (locale === 'zh') {
                                            checklistItemZh = checklistItemZh
                                              .replace('Verify outputs contain exactly matching structure elements requested by user', '核对输出结构中是否包含用户指定的全部结构对象')
                                              .replace('Check for empty output objects or fallback values', '核对是否存在空对象或非法的退化默认值')
                                              .replace('Score correct mapping parameters based on solidity documentation specs', '根据 Solidity 官方编译规范，检测重入漏洞代码行定位映射的精确性')
                                              .replace('Check syntax error presence under JS compiler simulation', '在编译器模拟沙盒中检测其是否存在硬语法编译错误');
                                          }
                                          return (
                                            <li key={i}>{checklistItemZh}</li>
                                          );
                                        })}
                                      </ul>
                                    </div>

                                    {/* Action choice picker */}
                                    <button
                                      type="button"
                                      disabled={stage !== 'options'}
                                      onClick={() => handleSelectCriteriaOption(opt)}
                                      className={`w-full mt-4 font-bold text-[10px] py-1.5 rounded transition cursor-pointer ${
                                        isSelected 
                                          ? 'bg-brand-cyan text-slate-950' 
                                          : stage === 'options'
                                            ? 'bg-slate-900 hover:bg-slate-850 text-slate-300'
                                            : 'bg-slate-900 text-slate-650 cursor-not-allowed'
                                      }`}
                                    >
                                      {isSelected 
                                        ? (locale === 'zh' ? '验收指标已选定' : 'Rule Selected Verified') 
                                        : (locale === 'zh' ? '选择此标准指标' : 'Select Metric Rule')}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Render Computation Order checkout preview */}
                          {msg.orderPreview && (
                            <div className="bg-slate-950 p-4 border border-brand-indigo/20 rounded-xl space-y-4 pt-3.5 shadow-xl relative animate-slide-up">
                              <h4 className="text-xs uppercase font-mono font-bold tracking-wider text-brand-indigo flex items-center gap-1.5">
                                <Bot className="w-4 h-4" /> {locale === 'zh' ? '链上计算订单详情 (Specification)' : 'Computation Order Spec'}
                              </h4>
                              
                              <div className="grid grid-cols-2 gap-3.5 text-xs text-slate-400 font-mono">
                                <div className="space-y-0.5">
                                  <span>{locale === 'zh' ? '多签托管预算:' : 'Deposit Balance:'}</span>
                                  <span className="block font-bold text-white text-sm">{msg.orderPreview.deposit} ETH</span>
                                </div>
                                <div className="space-y-0.5">
                                  <span>{locale === 'zh' ? '合格判定标准线:' : 'Validator Rule Line:'}</span>
                                  <span className="block font-bold text-white text-sm">{msg.orderPreview.passScore}/100 {locale === 'zh' ? '分' : 'score'}</span>
                                </div>
                                <div className="space-y-0.5">
                                  <span>{locale === 'zh' ? '验证专家指南:' : 'Verifier Guidelines:'}</span>
                                  <span className="block font-bold text-brand-cyan select-all max-w-[130px] truncate">
                                    {locale === 'zh' ? (msg.orderPreview.options.id.includes('correctness') ? '代码逻辑高确定性检验' : '语法与边界覆盖度高宽容审计') : msg.orderPreview.options.name}
                                  </span>
                                </div>
                                <div className="space-y-0.5">
                                  <span>{locale === 'zh' ? '指定清算合约:' : 'Allowed Targets:'}</span>
                                  <span className="block font-bold text-slate-300 select-all truncate max-w-[130px]" title="ComputeOutsourcePlatform">ComputeEscrow</span>
                                </div>
                              </div>

                              {stage === 'pact_ready' ? (
                                <button
                                  type="button"
                                  onClick={handleTriggerCoboPactApproval}
                                  className="w-full bg-brand-indigo hover:bg-brand-indigo/80 text-white font-bold py-2.5 rounded-lg text-xs transition flex items-center justify-center gap-1.5 shadow-lg group shadow-brand-indigo/10 cursor-pointer"
                                >
                                  {locale === 'zh' ? '通过 Cobo 多签托管上链放款' : 'Deploy via Cobo Pact'} <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                                </button>
                              ) : stage === 'deployed' ? (
                                <div className="flex gap-2 bg-brand-emerald/10 border border-brand-emerald/20 p-2.5 rounded-lg text-[11px] text-brand-emerald font-semibold select-none">
                                  <Check className="w-4 h-4 shrink-0" />
                                  <span>{locale === 'zh' ? '托管资金代扣完成，算力任务已进入市场大厅！' : 'Escrow Funded & Computations Live in Tasks Pool!'}</span>
                                </div>
                              ) : (
                                <div className="flex gap-2 bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-[11px] text-slate-500 font-semibold select-none">
                                  <span>{locale === 'zh' ? '等待左下角 Cobo 钱包联签授权中...' : 'Escrow authorization pending in sidebar widget...'}</span>
                                </div>
                              )}
                            </div>
                          )}

                        </div>
                      </div>
                    ))}

                    {/* Agent logic thinking loader */}
                    {isTyping && (
                      <div className="flex gap-3 text-xs text-slate-500 items-center pl-1 pt-1">
                        <Bot className="w-4 h-4 text-brand-indigo animate-spin" />
                        <span className="font-mono animate-pulse">
                          {locale === 'zh' ? 'z.ai 审计合约正在组装元数据 Schema...' : 'Agent assembling metadata schemas...'}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Input prompt drawer text fields */}
                {stage === 'prompt' && (
                  <form onSubmit={handleChatPromptSubmit} className="bg-slate-900 p-4 border border-slate-800 rounded-2xl flex gap-3 shadow-xl relative mt-4">
                    <textarea
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      placeholder={locale === 'zh' ? "用自然语言描述您想要外包给去中心化矿工的算力数据集或智能合约检验任务..." : "Describe the dataset, computation, or AI task you want to outsource..."}
                      className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none resize-none leading-relaxed h-12 py-1"
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
                      className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center transition-all ${
                        userInput.trim() && !isTyping 
                          ? 'bg-brand-indigo hover:bg-brand-indigo/80 text-white shadow-lg cursor-pointer'
                          : 'bg-slate-950 text-slate-650 cursor-not-allowed'
                      }`}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                )}

              </div>
            )}

            {/* ====== PORT TAB 2: ACTIVE TASKS (Marketplace Listing Grid) ====== */}
            {activeTab === 'ActiveTasks' && (
              <div className="space-y-6">
                
                {/* Search / Filter Subheader Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950 p-4 rounded-xl border border-slate-850/60 shrink-0">
                  <div className="space-y-1">
                    <h2 className="text-base font-display font-bold text-white">
                      {locale === 'zh' ? '链上算力智能合约订单大厅' : 'Active Order Marketplace'}
                    </h2>
                    <p className="text-xs text-slate-400 font-medium font-sans">
                      {locale === 'zh' ? t('marketSub') || '在 Arbitrum 侧链沙盒中浏览已锁定 Cobo 多签托管并经过 z.ai 自然语言规格化的算力需求。' : 'Browse computational requests deployed with verified deposit escrows.'}
                    </p>
                  </div>
                  
                  {/* Category toggles */}
                  <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800 gap-1 text-[11px] font-semibold select-none">
                    <span className="px-3 py-1 bg-brand-indigo/10 text-brand-indigo rounded font-bold border border-brand-indigo/15">
                      {locale === 'zh' ? `全部算力订单 (${tasks.length})` : `All Tasks (${tasks.length})`}
                    </span>
                    <span className="px-3 py-1 text-slate-500 cursor-not-allowed">
                      {locale === 'zh' ? 'EVM 沙盒计算网' : 'EVM Sandbox'}
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
                  <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-1.5 hover:border-slate-800 transition duration-150">
                    <span className="text-[10px] text-slate-500 uppercase font-mono font-bold tracking-wide">
                      {locale === 'zh' ? '极客信用声誉度 (Rep)' : 'Developer Reputation'}
                    </span>
                    <span className="text-lg font-mono font-bold text-brand-cyan block">920 Rep</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-1.5 hover:border-slate-800 transition duration-150">
                    <span className="text-[10px] text-slate-500 uppercase font-mono font-bold tracking-wide">
                      {locale === 'zh' ? '待验证结算流会话' : 'Pending Settlements'}
                    </span>
                    <span className="text-lg font-mono font-bold text-brand-indigo block">
                      {wallet.pendingApprovalsList.filter(x => x.status === 'Pending' && x.type === 'RewardDistribution').length} {locale === 'zh' ? '个未结' : 'Sessions'}
                    </span>
                  </div>
                  <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-1.5 hover:border-slate-800 transition duration-150">
                    <span className="text-[10px] text-slate-500 uppercase font-mono font-bold tracking-wide">
                      {locale === 'zh' ? '沙盒结算代币收益 (ETH)' : 'Sandboxed Net Earnings'}
                    </span>
                    <span className="text-lg font-mono font-bold text-brand-emerald block">+0.1450 ETH</span>
                  </div>
                </div>

                {/* Subtitle list */}
                <div className="flex justify-between items-center bg-slate-950 px-4 py-3 border border-slate-850/60 rounded-xl">
                  <span className="text-xs uppercase font-mono font-bold text-slate-400">
                    {locale === 'zh' ? '去中心化算网全链路实时流簿' : 'Execution Stream Feed'}
                  </span>
                  <span className="text-[11px] font-mono font-medium text-slate-500">
                    {locale === 'zh' ? '刚刚更新' : 'Updated just now'}
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

        </>
      )}
    </div>
  );
}
