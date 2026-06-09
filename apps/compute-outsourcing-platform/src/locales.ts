/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Task, CriteriaOption } from './types';

export type LocaleType = 'en' | 'zh';

export const translations = {
  en: {
    // Nav & Sidebar
    appName: 'z.ai Compute',
    appSubName: 'Audited Sandbox Portal',
    navDefine: 'Define New Task',
    navMarket: 'Task Marketplace',
    navRegistry: 'Transaction Registry',
    navDefineNewTask: 'Define New Task',
    navMarketplace: 'Active Order Marketplace',
    sandboxActive: 'SANDBOX ACTIVE',
    devHost: 'Developer Host',
    heroTitle: 'Outsource Complex Calculations',
    heroSub: 'Input your natural language parameters, let our expert spec agent define parameters and deposit conditions.',
    marketSub: 'Browse computational requests deployed with verified deposit escrows.',
    escrowAddress: 'Escrow Address',
    devFunds: 'Developer Funds',
    pactGates: 'Cobo Pact Policy Gates ({count})',
    allPactsApproved: 'All Pacts approved',
    readyNewOrders: 'Ready to sign new orders',
    pactBtnApprove: 'Approve Pact',
    pactBtnReject: 'Reject',
    pactRequireDeposit: 'Required Deposit:',
    pactRuleLabel: 'Pact Rule:',
    pactRuleDesc: 'Allow Compute EscrowOnly',
    arbitrumNova: 'Arbitrum Nova devnet',
    version: 'v1.0.0 (MVP)',
    pendingPacts: '{count} Pending Pact',

    // Platform Stats Dashboard
    platformStatsTitle: 'Network Strength Indicators',
    platformTotalCompute: 'Aggregated Computing Power',
    platformActiveMiners: 'Active Miners Online',
    platformNetworkLoad: 'Compute Cluster Load',
    platformActiveTasksSolved: 'Total Calculations Settled',

    // Define task page
    defineHeaderTitle: 'Outsource Complex Calculations',
    defineHeaderDesc: 'Input your natural language parameters, let our expert spec agent define parameters and deposit conditions.',
    quickContractTitle: 'CONTRACT DEFI AUDITS',
    quickContractDesc: 'Solidity reentrancy dataset with 100 code pieces',
    quickFinanceTitle: 'FINANCE LOGICS',
    quickFinanceDesc: '500 multi-turn multi-hop equations dataset',
    agentSpecTitle: 'z.ai Platform Spec Agent',
    agentIntroText: 'Hi! I am the z.ai Platform Spec Agent. I parsed your task and generated 2 custom-tailored validator criteria options suited for your budget. Select the rule card that best matches your target accuracy:',
    checkingCheckmarks: 'Checking checklists:',
    btnSelectRule: 'Select Metric Rule',
    btnRuleSelected: 'Rule Selected Verified',
    userMessageChoose: 'I choose Option: {name}',
    agentCompileText: 'Excellent choice. I compiled your request into a ready-to-sign Smart Contract Computation Order with budget deposit requirements. Review the Pact and sign to deploy the task on-chain:',
    orderSpecTitle: 'Computation Order Spec',
    orderDeposit: 'Deposit Balance:',
    orderPassScore: 'Validator Rule Line:',
    orderPassValue: '{score} score',
    orderGuidelines: 'Verifier Guidelines:',
    orderAllowedTargets: 'Allowed Targets:',
    btnDeployCoboPact: 'Deploy via Cobo Pact',
    escrowFundedLive: 'Escrow Funded & Computations Live in Tasks Pool!',
    escrowPending: 'Escrow authorization pending in sidebar widget...',
    congratsMsg: '🎉 CONGRATULATIONS! Cobo Wallet securely approved the deposit escrow. Computation Order #{id} is now active in the Task Marketplace.',
    agentAssembling: 'Agent assembling metadata schemas...',
    placeholderDescribe: 'Describe the dataset, computation, or AI task you want to outsource...',

    // Marketplace Page
    marketHeaderTitle: 'Active Order Marketplace',
    marketHeaderDesc: 'Browse computational requests deployed with verified deposit escrows.',
    allTasksCount: 'All Tasks ({count})',
    evmSandbox: 'EVM Sandbox',
    noSubmissionsYet: 'No compute outputs registered on-chain yet',
    btnMine: 'Mine',
    btnValidate: 'Validate',
    btnWannaMine: 'I wanna mine',
    btnWannaValidate: 'I wanna validate',
    onChainMock: 'Mock On-chain',
    activeTag: 'Active',
    formatLabel: 'Format:',
    subsCountLabel: 'Submissions:',
    aiAuditActive: 'AI Audit Active',
    rewardPool: 'Reward Pool',

    // Activities page
    repEarned: 'Developer Reputation',
    pendingSettle: 'Pending Settlements',
    earnings: 'Sandboxed Net Earnings',
    executionStream: 'Execution Stream Feed',
    updatedNow: 'Updated just now',
    miningActivityTitle: 'Mining Active Output',
    validationActivityTitle: 'Verification Assessment',
    statusSettled: 'Settled',
    statusScored: 'Scored',
    statusUnscored: 'Unscored',
    commission: 'Validator commission',
    reputation: 'Reputation',
    reputationPoints: '{points} Rep',
    awardPayout: 'Award payout',

    // TaskDetailModal
    ipfsVerified: 'IPFS verified order',
    idLabel: 'ID:',
    payoutIncentive: 'Payout Incentive',
    timeWindow: 'Time Window',
    aiAuditStatus: 'AI Audit Status',
    aiEnacted: 'Enacted (72 Threshold)',
    aiDisabled: 'Disabled',
    taskSummary: 'Task Summary',
    decentralizedRegistry: 'Decentralized Metadata Registry',
    taskUriLabel: 'taskURI (IPFS Spec):',
    orderUriLabel: 'orderURI (Computation Parameters):',
    hashLabel: 'criteriaHash (Validator Guideline Seal):',
    validatorGuidelineTitle: 'Validator Acceptance Criteria:',
    weightAllocationTitle: 'Weight Allocation Dimensions',
    validatorChecklistLabel: 'Validator Checklist',
    aiAuditorEnforceLabel: 'AI Auditor Enforcement Prompt',
    disputeDeviationWarn: 'Deviations > {score} trigger automatic Validator reputation slash penalties.',
    minerCommitments: 'Miner Commitments ({count})',
    valiScore: 'Vali Score',
    aiScore: 'AI Auditor Score',
    settledScore: 'Settled Score',
    auditorReport: 'Auditor Report: ',
    coboEscrowBudget: 'Budget funded using Cobo Escrow contract controls.',

    // Miner Workspace
    minerConsole: 'Miner Workspace Console',
    payoutScoreAdjusted: 'Score-adjusted pool weighting',
    requiredFormat: 'Required format',
    parserTarget: 'Parser Output Target',
    computationInstructions: 'Computation Instructions',
    outlineLabel: 'Outline:',
    targetRubric: 'Target Evaluation Rubric',
    computationField: 'Computation Output Field',
    demoScenarios: 'Demo Scenarios:',
    highQualityDemoBtn: '⚡ High-Quality Demo',
    badQualityDemoBtn: '⚠️ Bad-Quality Demo',
    placeholderPaste: 'Paste or code your raw computation output matching target format... Use our autofill toolbar above to easily run a demo scenario.',
    generatedOutputUri: 'Generated outputURI (ipfs):',
    commitHash: 'Commit Hash (SHA256):',
    sandboxYards: 'Your output compiles under blockchain sandboxing. Gas paid by platform.',
    submittingEscrow: 'Submitting to Escrow...',
    submitComputation: 'Submit Computation',

    // Validator Workspace
    validatorConsole: 'Validator Audit Dashboard',
    reviewingMiner: 'Reviewing Miner:',
    commitUriIpfs: 'Commitment URI (IPFS Store)',
    underReviewWork: 'Under Review Work Output',
    assignedScoringRules: 'Assigned Scoring Metric Rules',
    truthfulVali: 'Truthful Validator',
    collusiveVali: 'Collusive Miner-Validator',
    acceptanceChecklist: 'Acceptance Requirements Checklist',
    validationRange: 'Validation Score Range',
    critFail: 'Critical Fail (0)',
    consensusTarget: 'Consensus Target (75)',
    maxPayout: 'Max Payout (100)',
    justificationReason: 'Audit Decision Justification Reason',
    placeholderJustification: 'Provide professional rationale detailing the score decision. Required in disputes.',
    validatorCritiqueWarn: 'Your score will be cross-audited against our independent AI benchmark.',
    evaluatingConsensus: 'Evaluating Consensus...',
    submitBallot: 'Submit Validator Ballot',

    // Activity Details
    miningLedger: 'Mining Ledger',
    validationAuditLedger: 'Validation Audit Ledger',
    activityEventId: 'Activity Event: {id}',
    finalConsensusScore: 'Consensus Final Score',
    eventIdLabel: 'Event:',
    creatorLabel: 'Task Creator:',
    targetWorkerLabel: 'Target Worker:',
    evaluatorLabel: 'Evaluator:',
    ipfsComputationResult: 'IPFS Computation Result',
    coboTimelineTitle: 'Cobo Settlement Engine Status',
    coboStep1: 'Computation Registered',
    coboStep1Desc: 'Secure worker content committed to IPFS',
    coboStep2: 'Consensus Evaluated',
    coboStep2Desc: 'Validator submitted scoring ballot on-chain',
    coboStep3: 'AI Auditor Enforced',
    coboStep3Desc: 'Deviation delta evaluated bounds checks',
    coboStep4: 'Payout Settled',
    coboStep4Desc: 'Cobo Wallet escrow released tokens',
    coboEscrowReleased: 'Cobo Escrow SafeReleased',
    coboTxId: 'Transaction ID:',
    aiMultiConsensusAnalytics: 'AI auditor multi-consensus analytics',
    valiInputLabel: 'Validator Input',
    aiCritiqueLabel: 'AI auditor Score',
    scoringDeviation: 'Scoring Deviation Delta',
    justificationHeading: 'Validator justification statement:',
    aiCritiqueLog: 'AI Auditor critique audit log:',
    attackDeflectedTitle: 'Severe Positive Rating Attack Deflected',
    attackDeflectedDesc: 'The validator scoring deviation delta exceeded security threshold gates. Reputation collateral of validator was slashed, of which the escrow payout was automatically updated.',

    // Common Alerts
    alertPactRequested: 'Cobo Pact requested! Check your pending Pacts in the sidebar wallet widget to authorize budget escrow.',
    alertDeployed: 'Task successfully deployed! Order parameters written on-chain with ipfs hashes!',
    alertFunded: 'Cobo Escrow release finalized! Tokens distributed according to audited score math parameters.',
    alertMinerWait: 'This task has no miner outputs yet. Take the initiative and submit computation output as a miner first!',
    alertSubmitMiner: 'Computation output submitted on-chain. Added to worker history records.',
    alertScoreLog: 'Validation ballot logged. AI auditor reference score generated ({score}). Delta calculated.',

    // Authentication Setup
    loginTitle: 'Sign In to z.ai Compute Gateway',
    loginSubTitle: 'Access the audited, secure sandbox compute outsourcing platform',
    emailLabel: 'Email Address',
    passwordLabel: 'Password',
    loginBtn: 'Sign In',
    registerBtn: 'Create Account',
    noAccount: "Don't have an account? Sign Up",
    haveAccount: 'Already have an account? Sign In',
    signUpTitle: 'Create Developer Account',
    signUpSubTitle: 'Join the decentralized audit and high-performance computing grid',
    invalidCredentials: 'Invalid or incorrect email and password combination',
    passwordLengthError: 'Your password must be at least 6 characters long',
    registerSuccess: 'Developer account created successfully!',
    loginSuccess: 'Authentication authorized. Welcome back!',
    orConnectWallet: 'Or Interface with Authorized Web3 Wallet',
    connectWalletBtn: 'Connect Cobo Agentic Wallet',
    connectingWallet: 'Initiating Cobo Wallet cryptographic session...',
    walletConnectedMsg: 'Cobo Wallet authenticated successfully!',
    logoutBtn: 'Sign Out Account'
  },
  zh: {
    // Nav & Sidebar
    appName: 'z.ai 算力协同',
    appSubName: 'AI 审计沙盒门户',
    navDefine: '创建新任务',
    navMarket: '任务算力市场',
    navRegistry: '全链活动记录',
    navDefineNewTask: '部署算力订单(创设)',
    navMarketplace: '算力订单大厅(市场)',
    sandboxActive: '沙盒环境激活',
    devHost: '极客节点',
    heroTitle: '按需外包您的复杂 AI / 计算任务',
    heroSub: '使用人类自然语言输入您的计算需求，z.ai Spec Agent 将自动为您定义格式验证指标、AI 审计基线与放款托管标准。',
    marketSub: '在 Arbitrum 侧链沙盒中浏览已锁定 Cobo 多签托管并经过 z.ai 自然语言规格化的算力需求。',
    escrowAddress: 'Cobo 托管地址',
    devFunds: '开发者代币可用资金',
    pactGates: 'Cobo Pact 审批安全阀 ({count})',
    allPactsApproved: '所有 Pacts 策略已审批通过',
    readyNewOrders: '已准备好签名结算新计算实例',
    pactBtnApprove: '批准 Pact 条款',
    pactBtnReject: '拒绝签署',
    pactRequireDeposit: '所需保证金/预算:',
    pactRuleLabel: 'Pact 合约限制:',
    pactRuleDesc: '仅允许算力协同智能合约交互',
    arbitrumNova: 'Arbitrum Nova 测试网',
    version: 'v1.0.0 (MVP 阶段)',
    pendingPacts: '{count} 项待审批 Pact',

    // Platform Stats Dashboard
    platformStatsTitle: '全网算力与计算节点',
    platformTotalCompute: '全网集合算力总额',
    platformActiveMiners: '活跃矿工在线数量',
    platformNetworkLoad: '计算节点负载率',
    platformActiveTasksSolved: '累计结算计算量',

    // Define task page
    defineHeaderTitle: '按需外包您的复杂 AI / 计算任务',
    defineHeaderDesc: '使用人类自然语言输入您的计算需求，z.ai Spec Agent 将自动为您定义格式验证指标、AI 审计基线与放款托管标准。',
    quickContractTitle: '智能合约漏洞审计',
    quickContractDesc: '提供包含100段 Solidity 代码重入漏洞验证的数据集任务',
    quickFinanceTitle: '金融逻辑多步链式推理',
    quickFinanceDesc: '外包 500 条多步金融计算、公式推理与标签匹配数据集',
    agentSpecTitle: 'z.ai 自动验收设计代理',
    agentIntroText: '你好！我是 z.ai 验收机制设计 Agent。我已解析您的业务意图，并针对该特定用例自动定制了 2 套兼顾精度与预算成本的验证者验收法则：',
    checkingCheckmarks: '验证核对标准清单:',
    btnSelectRule: '选定并确认此验收规则组',
    btnRuleSelected: '此验收规则已被确认写入',
    userMessageChoose: '我已批准并选择验收基准：{name}',
    agentCompileText: '极佳的选择。我已经将您的计算要求编译为了支持智能合约部署的「计算订单」。请预览下方生成的 Cobo Pact 安全策略并授权划转保证金：',
    orderSpecTitle: '链上计算订单配置规格',
    orderDeposit: '托管划转预算:',
    orderPassScore: '最低合格验证分:',
    orderPassValue: '{score} 分',
    orderGuidelines: '验证者监督基准:',
    orderAllowedTargets: '许可调用目标合约:',
    btnDeployCoboPact: '批准划款并启动 Cobo Pact',
    escrowFundedLive: '托管资金已锁定，计算任务订单正式推送至市场！',
    escrowPending: '正等待您在 Cobo 钱包栏确认首笔 Pact 划款授权...',
    congratsMsg: '🎉 祝贺！Cobo 协同钱包已批准预算锁定交易并签名。计算任务 #{id} 现已进入开放算力市场。',
    agentAssembling: 'AI spec 代理正在为您装配链上数据存储方案...',
    placeholderDescribe: '使用中文或英文描述您需要外包的数据处理、智能合约审计、或复杂 AI 计算任务...',

    // Marketplace Page
    marketHeaderTitle: '激活的计算任务池',
    marketHeaderDesc: '浏览当前测试网络中在运行的、已足额锁定代币预算的所有分布式计算需求。',
    allTasksCount: '全部算力任务 ({count})',
    evmSandbox: 'EVM 虚拟机沙盒',
    noSubmissionsYet: '当前该任务暂无可用矿工节点提交计算输出',
    btnMine: '参与挖矿 (提交结果)',
    btnValidate: '质押验证 (打分审计)',
    btnWannaMine: '我来挖矿 (接单)',
    btnWannaValidate: '我来验证 (出证)',
    onChainMock: '已模拟上链',
    activeTag: '运行中',
    formatLabel: '数据格式:',
    subsCountLabel: '已提交结果:',
    aiAuditActive: 'AI 动态双重审计已激活',
    rewardPool: '奖励池预算',

    // Activities page
    repEarned: '开发者协同信誉分',
    pendingSettle: '待划款结算队列',
    earnings: '沙盒环境累计净收益',
    executionStream: '链上交互与收益流水历史',
    updatedNow: '刚刚更新',
    miningActivityTitle: '计算节点挖矿产出提交',
    validationActivityTitle: '验证者打分评估事务',
    statusSettled: '已结算',
    statusScored: '已打分 (清算中)',
    statusUnscored: '等待打分评估',
    commission: '验证者协作提成',
    reputation: '节点信誉增减',
    reputationPoints: '{points} 信用绩分',
    awardPayout: '派发收益金',

    // TaskDetailModal
    ipfsVerified: 'IPFS 认证元数据订单',
    idLabel: '任务编号:',
    payoutIncentive: '基础派发奖励金',
    timeWindow: '算力时间期限',
    aiAuditStatus: 'AI 审计实施状态',
    aiEnacted: '系统强制执行 (72分审计红线)',
    aiDisabled: '未开启',
    taskSummary: '任务概要描述',
    decentralizedRegistry: '去中心化存储元数据哈希登记',
    taskUriLabel: '任务需求元数据 (taskURI):',
    orderUriLabel: '计算节点订单约束 (orderURI):',
    hashLabel: '验证考核算法封缄 (criteriaHash):',
    validatorGuidelineTitle: '验证节点验收法则:',
    weightAllocationTitle: '核心考核指标权重占比',
    validatorChecklistLabel: '验证核对内容清单',
    aiAuditorEnforceLabel: 'AI 审计辅助参考 Prompt 逻辑',
    disputeDeviationWarn: '验证者分值与独立 AI 判定偏离值超过 {score} 时，系统将自动罚没验证者代币并废止争议票。',
    minerCommitments: '计算节点承诺证据 ({count})',
    valiScore: '验证者定级分',
    aiScore: 'AI 裁判打分',
    settledScore: '终评和解分',
    auditorReport: '审计评论：',
    coboEscrowBudget: '所有奖励和退款均通过 Cobo Escrow 协议的多方签名进行强制划转。',

    // Miner Workspace
    minerConsole: '计算节点 (矿工) 生产控制台',
    payoutScoreAdjusted: '受 consensus 评分和解数学规则制约的动态分配奖励金',
    requiredFormat: '格式与解析要求',
    parserTarget: '目标数据解析器格式',
    computationInstructions: '计算与数据集内容详细说明',
    outlineLabel: '概要指南:',
    targetRubric: '考核规则细则预览',
    computationField: '计算结果生产编辑器',
    demoScenarios: '演示场景一键注入:',
    highQualityDemoBtn: '⚡ 注入高质量计算结果',
    badQualityDemoBtn: '⚠️ 注入垃圾/虚假计算结果',
    placeholderPaste: '在此输入或生成符合目标解析格式的高质量计算成果...您可直接使用上方演示卡一键填充。',
    generatedOutputUri: '生成的计算产出 URI (IPFS 哈希):',
    commitHash: '防伪哈希承诺 (SHA256):',
    sandboxYards: '您产出的数据已在沙盒编译器中编译。平台代缴上链 Gas 费。',
    submittingEscrow: '打包凭证并注册至托管服务中...',
    submitComputation: '正式提交计算成果',

    // Validator Workspace
    validatorConsole: '验证节点 (评判委员会) 监督终端',
    reviewingMiner: '当前待验证计算节点:',
    commitUriIpfs: '已注册的计算凭证 (存储于 IPFS)',
    underReviewWork: '待检阅的节点计算文本明细',
    assignedScoringRules: '分配执行的验收考核标准组',
    truthfulVali: '客观公正的验证节点场景',
    collusiveVali: '串通作恶的虚假验证场景',
    acceptanceChecklist: '核验点物理合规打勾列表',
    validationRange: '验证评分滑块',
    critFail: '核心项严重缺失 (0)',
    consensusTarget: '符合基线共识 (75)',
    maxPayout: '无可挑剔超出预期 (100)',
    justificationReason: '验证定级说理性报告',
    placeholderJustification: '请提供详实的说理性打分证据或反驳结论。此项将写入链上争议备忘。',
    validatorCritiqueWarn: '您的评测数值将与独立 AI auditor 偏离检查仪动态对账，请诚实公正执行核验。',
    evaluatingConsensus: '正在通过智能合约执行 AI 对账和解结算...',
    submitBallot: '提呈当前验证裁定票',

    // Activity Details
    miningLedger: '挖矿收益与数据流向单',
    validationAuditLedger: '验证节点多方对账审计单',
    activityEventId: '活动条目存证哈希: {id}',
    finalConsensusScore: '共识达成最终核定评分',
    eventIdLabel: '条目编号:',
    creatorLabel: '任务发起方:',
    targetWorkerLabel: '执行工作的矿工:',
    evaluatorLabel: '执行审计的验证者:',
    ipfsComputationResult: '已归档计算成果明细',
    coboTimelineTitle: '资金清算全息时间线追踪',
    coboStep1: '计算凭证登记完成',
    coboStep1Desc: '计算节点输出已多重哈希锚定锁仓',
    coboStep2: '验证投票上链',
    coboStep2Desc: '人工验证投票正式被链上合约吸纳',
    coboStep3: 'AI 控制基准对账完成',
    coboStep3Desc: 'AI 大模型审计套保系统执行偏离比对',
    coboStep4: '托管资产释放结算',
    coboStep4Desc: 'Cobo 钱包冷存库根据和解规则执行清算发钱',
    coboEscrowReleased: 'Cobo 托管资金合规释放',
    coboTxId: '清算转账交易哈希:',
    aiMultiConsensusAnalytics: 'AI 实时控制对账数据链',
    valiInputLabel: '验证节点评估打分',
    aiCritiqueLabel: 'AI 独立审计评分',
    scoringDeviation: '多方对账值差分 (偏离值)',
    justificationHeading: '验证节点出具的说理陈述:',
    aiCritiqueLog: 'AI 动态对冲对账诊断日志:',
    attackDeflectedTitle: '检测到恶意评分合谋攻击并成功对冲拦截',
    attackDeflectedDesc: '监控系统捕获到验证投票与独立 AI 安全裁判之间存在极其严重的评分偏离值。系统强制启动防御机制，自动削减（Slash）恶评验证者的代币担保保证金，并由智能合约自动纠错放款规则。',

    // Common Alerts
    alertPactRequested: 'Cobo 提案请求发起！请查阅侧边栏 Cobo Pact 框批准锁定划款决策。',
    alertDeployed: '计算订单成功锚定并上链！核心验证哈希组已被系统固化密封。',
    alertFunded: 'Cobo 托管资金合规分发完成。利益相关各方奖励金已按智能对账算法清算结转。',
    alertMinerWait: '当前此任务没有任何节点提交计算产出。请先以 Miner 身份注入结果，再行核查！',
    alertSubmitMiner: '计算成果已被提交锁定！全网节点以及对冲 AI 将执行核查。',
    alertScoreLog: '核对投票提交通道畅通，防卫 AI 自动审计判定结果同步触发。',

    // Authentication Setup
    loginTitle: '登录 z.ai 算力协同网关',
    loginSubTitle: '访问经过多签审计、高防护的沙盒算力外包与协同生态平台',
    emailLabel: '电子邮件地址',
    passwordLabel: '登录密码',
    loginBtn: '立即登录系统',
    registerBtn: '注册开发者账户',
    noAccount: '还没有开发者账户？立即注册',
    haveAccount: '已经有开发者账户？立即登录',
    signUpTitle: '创建开发者生态账户',
    signUpSubTitle: '加入去中心化智能审计与高性能 GPU 协同计算矩阵',
    invalidCredentials: '输入的邮箱地址或密码不匹配，请重新检查',
    passwordLengthError: '为了您的资产安全，密码必须至少为 6 位字符',
    registerSuccess: '开发者账户创建成功！已自动帮您加载沙盒初始化权限。',
    loginSuccess: '双因子鉴权通过！欢迎回到 z.ai 算力协同平台。',
    orConnectWallet: '或者，通过已授信的 Web3 零钱包安全直连',
    connectWalletBtn: '连接 Cobo 智能代管钱包',
    connectingWallet: '正在初始化 Cobo Wallet 加密交互会话...',
    walletConnectedMsg: 'Cobo 钱包关联鉴权成功！',
    logoutBtn: '注销/退出登录'
  }
};

export interface LanguageContextType {
  locale: LocaleType;
  setLocale: (lang: LocaleType) => void;
  setLanguage: (lang: LocaleType) => void;
  t: (key: keyof typeof translations['en'], replacements?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<LocaleType>('zh'); // Default to Chinese as per request context, but both are fully available!

  const t = (key: keyof typeof translations['en'], replacements?: Record<string, string | number>) => {
    const dict = translations[locale];
    const template = dict[key] || translations['en'][key] || String(key);
    if (!replacements) return template;
    let result = template;
    for (const [k, v] of Object.entries(replacements)) {
      result = result.replace(`{${k}}`, String(v));
    }
    return result;
  };

  return React.createElement(
    LanguageContext.Provider,
    { value: { locale, setLocale, setLanguage: setLocale, t } },
    children
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}

export function getLocalizedTaskTitle(title: string, locale: LocaleType): string {
  if (locale !== 'zh') return title;
  if (title.startsWith('Reasoning QA')) {
    return '加密协议测试的多步推理问答数据集生成';
  }
  if (title.startsWith('Financial Document') || title.startsWith('Financial Text') || title.includes('Financial Document Synthesizer')) {
    return '金融文本合成专家与意图多标签分类器';
  }
  if (title.startsWith('Medical OCR') || title.includes('Clinical Trials Logs') || title.includes('clinical trials logs')) {
    return '临床试验日志医疗 OCR 文字纠错批处理';
  }
  if (title.includes('#')) {
    return title.replace('Decentralized Outsourcing Task #', '去中心化外包算力计算订单 #');
  }
  return title;
}

export function getLocalizedCriteria(opt: CriteriaOption, locale: LocaleType): CriteriaOption {
  if (locale !== 'zh') return opt;
  const localizedOpt = { ...opt };

  if (opt.id === 'sec-heavy') {
    localizedOpt.name = '漏洞覆盖度与漏洞利用链深度';
    localizedOpt.description = '重点覆盖中高风险逻辑黑洞检测，并附有精确且可重现的漏洞利用路径（PoC）描述与行之运行的修复指导方案。';
    localizedOpt.outputRequirements = 'Markdown 格式的漏洞评测白皮书，内置风险漏洞评级清单和完备的代码对冲指南。';
    localizedOpt.passCondition = '在核心测试集的总体验证下，加权最终评估分值不得低于 75 / 100。';
    localizedOpt.checklist = [
      '全面排查是否成功拦截常见的核心攻击载体（重入、溢出、访问控制权限错漏等）。',
      '检阅修复性代码是否能够在封闭模拟节点中成功完成编译。',
      '测定风险定级分阶是否获得了强逻辑的论据支持。'
    ];
    localizedOpt.scoringDimensions = [
      { name: '漏洞准确度与危害级别判定', weight: 40 },
      { name: '验证（PoC）与攻击路径分析详情', weight: 35 },
      { name: '修复方案可行性与代码实现标准', weight: 25 }
    ];
  } else if (opt.id === 'test-coverage') {
    localizedOpt.name = '漏洞利用测试沙盒工程化编写';
    localizedOpt.description = '专注于使用 Foundry / Hardhat 沙盒开发测试框架针对所列漏洞开发出稳定的攻击回归断言脚本。';
    localizedOpt.outputRequirements = '可直接本地一键运行跑通的 Foundry 或者是 TypeScript 断言代码、沙盒本地终端输出日志。';
    localizedOpt.passCondition = '所有恶意攻击场景的复现测试断言（Assert Revert）全部无错跑通，契约覆盖率超过 80%。';
    localizedOpt.checklist = [
      '在本地沙盒环境中复现攻击运行，并严密监听预期状态断言是否抛出逆折。',
      '验证测试网络的复刻分叉（Fork Target）高度和初始账户额度是否合规。',
      '根据沙盒高健壮性标准评估测试用例脚本的鲁棒性。'
    ];
    localizedOpt.scoringDimensions = [
      { name: 'Foundry Assert 测试套件编写硬性规范', weight: 40 },
      { name: '逆回状态检查与边缘清算参数匹配', weight: 30 },
      { name: '沙盒网络高度分叉与资金对齐校验', weight: 30 }
    ];
  } else if (opt.id === 'reasoning-heavy') {
    localizedOpt.name = '多步逻辑自洽与思维链（CoT）推理深度';
    localizedOpt.description = '强调多步骤推理链条、多跳论据流、详细的思维分析路径，拒绝没有理由的空头结论。';
    localizedOpt.outputRequirements = '以 JSONL 行格式存放的数据，单元素包含: question, step_by_step_reasoning, standard_answer, difficulty_rating, tag_taxonomy。';
    localizedOpt.passCondition = '在逻辑语义聚类测试中的加权综合判断所得分值均值须 >= 80分。';
    localizedOpt.checklist = [
      '核对标准答案在数学运算或客观常识上是否 100% 自洽。',
      '验证思维链中是否存在由于大模型发散引起的幻觉推理。',
      '剔除了信息检索类水包，确保每个提问都需要经历多轮推导。'
    ];
    localizedOpt.scoringDimensions = [
      { name: '多步详细推演自洽性(CoT完整段)', weight: 40 },
      { name: '知识图谱多跳检索逻辑无幻觉指标', weight: 30 },
      { name: '困难标记划分自恰率与Tag完备度', weight: 30 }
    ];
  } else if (opt.id === 'diversity-heavy') {
    localizedOpt.name = '数据集分布丰富度与冷启动覆盖比例';
    localizedOpt.description = '致力于收集与标准模板不同的极低重合度边缘长尾输入，用以强化银行助理 AI 的鲁棒防御力和抗噪性。';
    localizedOpt.outputRequirements = '结构化数据集文件，包含至少 200 个独立的交叉主题且核心文本重合概率极低。';
    localizedOpt.passCondition = '通过低交叉率和余弦向量相似矩阵算法判定的冷启动分布度达到 >= 72/100。';
    localizedOpt.checklist = [
      '依靠向量分词库抽取语义聚类群，检校其中是否包含了充足的长尾词或不规则句式。',
      '核实文件输出字符语法和 JSON 空格转义是否合乎规整的解析限制。',
      '全面清查数据提交物中对现有大模型通用模板的多余拼贴迹象。'
    ];
    localizedOpt.scoringDimensions = [
      { name: '冷启动主题群低交叉率余弦相关计算度', weight: 50 },
      { name: '客服会话实体信息标注对齐规范度', weight: 30 },
      { name: 'JSON 与多轮语段转义符号无错率', weight: 20 }
    ];
  } else if (opt.id === 'char-correctness') {
    localizedOpt.name = '极致字符比对与转录精准率';
    localizedOpt.description = '在古籍医学手稿、高损商业账单的复杂术语识别中提供近乎 100% 的极高文字定位及符号契合准确度。';
    localizedOpt.outputRequirements = '纯文本纠错差异对照，并提供模糊损件标点、伪退化字符特殊标记清单。';
    localizedOpt.passCondition = '字符莱文斯坦编辑距离重合度达到 >= 98.7% 并伴有正确的噪声定位符号。';
    localizedOpt.checklist = [
      '与平台存储的标准基座真实记录（Ground Truth）进行极为精确的文件级 diff 比对。',
      '严格验证多层级嵌套列表在 Markdown 空格规范下的解析结构。',
      '检查对于极度模糊或带有污痕的部分是否合理使用了特定符号进行标定。'
    ];
    localizedOpt.scoringDimensions = [
      { name: '莱文斯坦绝对编辑距离精确纠错得分率', weight: 50 },
      { name: '模糊字符噪声定位注释语法规范程度', weight: 30 },
      { name: '医学术语/药物代号特定字典对齐精度', weight: 20 }
    ];
  } else if (opt.id === 'contextual-interpretation') {
    localizedOpt.name = '特定语境下的本土化技术术语转译润色';
    localizedOpt.description = '克服硬套字词翻译缺陷，在保留技术本意的同时融入了精准的行业术语（如特定法规和医学典籍词库）。';
    localizedOpt.outputRequirements = '对照翻译大纲表格、核心专有名词索引库、翻译过程附带的说理性注释边注。';
    localizedOpt.passCondition = '专有名词覆盖率达到 100%，语流连贯通顺整体评估分数超 85/100。';
    localizedOpt.checklist = [
      '对行业专有名词（Glossary）库映射对照进行了完全闭环的一对一校验。',
      '通读其专业表意，剔除低劣机械对译对核心商业逻辑的负面误导。',
      '深度审查注释模块中的翻译动机和专业文献引用依据。'
    ];
    localizedOpt.scoringDimensions = [
      { name: '行业专有名词本地化典籍契合对应率', weight: 40 },
      { name: '手写体语法解构通顺度与连贯评估分', weight: 30 },
      { name: '注释区说明性学术引用资料健全程度', weight: 30 }
    ];
  } else if (opt.id === 'default-coherence') {
    localizedOpt.name = '功能性完整度与基本交互合规';
    localizedOpt.description = '通用评测框架，重点审计算力文本是否完美响应了最初指令中全部要求的实体和格式。';
    localizedOpt.outputRequirements = '完美填补、符合解析程序设定的完整计算结果归档文件。';
    localizedOpt.passCondition = '整体合规指标值在综合初审中不低于 70 / 100。';
    localizedOpt.checklist = [
      '确定每一项外包需求列表在提交内容中都获得了直接对应的回应。',
      '验证输出的符号和括号包裹对齐状态与解析系统保持一致。',
      '通读分析其在基础汉语/英语文字叙事上的通畅度和逻辑流畅感。'
    ];
    localizedOpt.scoringDimensions = [
      { name: '多行命令参数格式合规性与无错解析', weight: 40 },
      { name: '外包条件契合覆盖进度百分比审计', weight: 30 },
      { name: '语法嵌套树安全校验与空值兜底评级', weight: 30 }
    ];
  } else if (opt.id === 'default-rigor') {
    localizedOpt.name = '推理严谨性与证据核算';
    localizedOpt.description = '重点监督逻辑中的每一步代数推导、行文论证和客观文献证据引用。';
    localizedOpt.outputRequirements = '详尽的事实核查文本、数学公式计算展开行以及差估计算结果。';
    localizedOpt.passCondition = '实现核心事实、多步公式计算结论 100% 正确且引用链直接可用。';
    localizedOpt.checklist = [
      '逐个对数字相乘和运算优先级进行严密的纯代数公式重新验抄。',
      '核校提交中的参考文献链接是否属于非幻觉的确定性数据。',
      '检验 markdown 内部行间 and 段落公式标签的规范化写法。'
    ];
    localizedOpt.scoringDimensions = [
      { name: '多跳数学公式参数解算绝对精准度', weight: 50 },
      { name: '文献和参考引证外部数据链接抗噪率', weight: 30 },
      { name: '推论链无发散无幻觉与逻辑严谨检验', weight: 20 }
    ];
  }

  return localizedOpt;
}

export function getLocalizedTask(task: Task, locale: LocaleType): Task {
  if (locale !== 'zh') return task;

  const localizedTask = { ...task };
  localizedTask.title = getLocalizedTaskTitle(task.title, locale);

  if (task.id === 'task-1') {
    localizedTask.description = '开发针对 DeFi 强清机制以及漏洞预测的多步思维推理问答数据集。数据集应由50个极端极端波动环境的强清案例场景组成，写出全套数学演变步骤、流动性清算池、报价延迟带来的价格偏差以及防御方案。';
    localizedTask.outputFormat = 'JSONL 数据集';
    localizedTask.criteriaName = '推理连贯性与思维链（Chain-of-Thought）';
  } else if (task.id === 'task-2') {
    localizedTask.description = '由于 AI 银行客服需要识别长尾非标指令，我们需要多交叉实体标签的对话意图分类测试集。每个测试会话交叉多个用户高风险行为，并标出精准的结构化 Tag 列表与分类级别。';
    localizedTask.outputFormat = 'JSON 结构化文件';
    localizedTask.criteriaName = '数据集多样性与高分布外（OOD）覆盖率';
  } else if (task.id === 'task-3') {
    localizedTask.description = '需要重现并纠错转录临床试验生命体征数据。由于字迹问题以及术语差异，要求以 Markdown 对比表的高纠偏重组标准。本计算旨在输出 20 份高质量的转录日志纠错集。';
    localizedTask.outputFormat = 'Markdown 预格式化边框对齐表';
    localizedTask.criteriaName = '极致字符精度与精确性审计';
  } else if (task.description.startsWith('Natural language query defined:')) {
    // Dynamically localized constructed task
    localizedTask.description = task.description
      .replace('Natural language query defined:', '创建任务时的自然语言需求陈词:')
      .replace('Parameters mapped securely using selected criteria. Ready for miners and validators to process outputs.', '参数已按所选验收指标安全锚定，现已就绪。所有矿工节点均可提交对应成果、验证节点以及 AI 执行审查判案。');
  }

  // Localize selectedCriteriaOption if it exists
  if (task.selectedCriteriaOption) {
    localizedTask.selectedCriteriaOption = getLocalizedCriteria(task.selectedCriteriaOption, locale);
  }

  // Localize criteriaOptions array if it exists
  if (task.criteriaOptions) {
    localizedTask.criteriaOptions = task.criteriaOptions.map(opt => getLocalizedCriteria(opt, locale));
  }

  // Localize Miner submissions and evaluations
  if (task.minerSubmissions) {
    localizedTask.minerSubmissions = task.minerSubmissions.map(sub => {
      const localizedSub = { ...sub };
      if (sub.evaluation) {
        const localizedEval = { ...sub.evaluation };
        if (sub.id === 'sub-1') {
          localizedEval.validatorReason = '极佳的数学数理建模！详尽的逐步推演完全符合 Compound 和 Aave 协议参数规范。标签分类精准，难度分类和思维链深度极具自洽性。';
          localizedEval.aiExplanation = 'AI 审计裁判核准确认：矿工提交的算力证明精确吻合 Compound 清算机制 (close_factor) 等 EVM 运行约束边界。多跳公式的推理演算已通过安全规则库的核验。';
        } else if (sub.id === 'sub-2') {
          localizedEval.validatorReason = '该数据集极为直观、语法易于解析。矿工以简单易懂、图文并茂的通俗段落阐明了闪电贷基本常识，值得高评分极力推荐。';
          localizedEval.aiExplanation = 'AI 核心审计警报异常：矿工成果不包含要求的任何代数推导公式。递交产物属于极为低劣的空洞语义。监控系统侦测到验证者具有重度合谋提分倾向！';
        }
        localizedSub.evaluation = localizedEval;
      }
      return localizedSub;
    });
  }

  return localizedTask;
}
