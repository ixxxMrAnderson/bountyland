TODO: 需要一个可传参数的奖励发放机制（根据task动态设置）
      top K miner才能拿钱 K本身作为参数传入 前K的miner拿钱的比例也通过参数传入。假设K=3比例为[50, 30, 20]意思前三分别拿50%, 30%, 20%。
      validator和miner奖池的占比也作为参数传入

# 合约说明

`src/ComputeOutsourcePlatform.sol` 是当前项目的 MVP 结算合约，目标是部署到 Sepolia 测试网，用于任务发布、Worker 接单、结果提交、信誉更新和奖励结算。

合约仍然只部署一个主合约：

```text
ComputeOutsourcePlatform
```

源码通过继承做逻辑分层，方便维护：

```text
src/
|-- ComputeOutsourcePlatform.sol
`-- base/
    |-- PlatformBase.sol
    |-- TaskManager.sol
    |-- StakeManager.sol
    |-- ReputationManager.sol
    `-- ResultManager.sol
```

## 已实现能力

- 用户创建任务，并把 ETH 打入任务奖池。
- 用户可在没有 Worker 提交前取消任务并取回奖池。
- 用户可给任务追加资金。
- Worker 注册并提交保证金。
- Validator 注册并提交保证金。
- 一个任务支持多个 Worker 提交结果。
- Worker 提交 `outputURI` 和 `outputHash`。
- 后端 / 评审服务通过 `resultOracle` 提交最终评分结果。
- 合约根据 `workerScore` 更新 Worker reputation。
- 合约根据 `validatorScore` 更新 Validator reputation。
- 任务结束后，合约按规则分配奖池。
- Worker / Validator / 任务创建者通过 `claimReward()` 主动领取奖励。
- 合约使用 pull payment 模式和 reentrancy guard，避免在结算循环里直接转账。

## 任务类型

合约不绑定具体业务类型。

审计任务、数据集任务、标注任务、通用计算任务都可以复用同一套合约。具体任务内容、验收标准、交付物和报告都放在链下，通过 URI 和 hash 记录到链上。

常见字段含义：

```text
taskURI:
任务需求文件地址。

orderURI:
订单详情、数据集要求或补充规则文件地址。

criteriaHash:
验收标准文件的 hash。

outputURI:
Worker 提交结果文件地址。

outputHash:
Worker 提交结果文件 hash。

reportURI:
后端 / Agent / 评审服务生成的评估报告地址。

reportHash:
评估报告 hash。
```

## 评分模型

评分细则在链下完成，合约不计算复杂评分。

后端、Validator 服务或 Agent 聚合人工评分和 Agent 评分后，调用：

```text
submitResult(taskId, worker, validator, workerScore, validatorScore, reportURI, reportHash)
```

参数含义：

```text
workerScore:
Worker 交付结果的最终评分。
用于更新 Worker reputation，并在多个 Worker 之间按权重分配 Worker 奖励池。

validatorScore:
Validator 本次评判准确度的评分。
用于更新 Validator reputation，并作为链上凭证记录。
不会影响 Validator 奖励金额。
```

Validator 奖励逻辑：

```text
validatorRewardBps 决定任务奖池里有多少比例留给 Validator。
Validator 奖励池按有效验证结果数量平均分。
validatorScore 只影响信誉，不影响奖励比例。
```

## 钱包模型

合约不绑定具体钱包。

普通钱包、前端钱包、后端钱包、Safe、Cobo Agentic Wallet 都可以调用同一套 ABI。

前端负责连接钱包和发起交易，合约只识别：

```text
msg.sender
```

后端方案中，`resultOracle` 是后端服务控制的钱包地址。后端在链下完成评分后，用该钱包调用 `submitResult()`。

## Sepolia 构造参数

部署 `ComputeOutsourcePlatform` 时需要填写：

```text
initialResultOracle:
后端 / 评审服务的钱包地址。只有这个地址能提交最终评分结果。

initialMinWorkerStake:
Worker 最小保证金，单位 wei。

initialMinValidatorStake:
Validator 最小保证金，单位 wei。

initialValidatorRewardBps:
Validator 奖励池占任务奖池的比例，单位 BPS。
1000 表示 10%。
```

Demo 推荐值：

```text
initialResultOracle: 后端 / 评审钱包地址
initialMinWorkerStake: 1000000000000000
initialMinValidatorStake: 5000000000000000
initialValidatorRewardBps: 1000
```

说明：

```text
1000000000000000 wei = 0.001 ETH
5000000000000000 wei = 0.005 ETH
1000 BPS = 10%
```

这些参数部署后也可以由 owner 调整：

```text
setStakeRequirements(newMinWorkerStake, newMinValidatorStake)
setValidatorRewardBps(newValidatorRewardBps)
setResultOracle(newResultOracle)
```

## Hardhat 使用

安装依赖：

```bash
npm install
```

编译合约：

```bash
npm run contracts:compile
```

部署到 Sepolia：

```bash
cp .env.example .env
npm run contracts:deploy:sepolia
```

Windows PowerShell 可以用：

```powershell
copy .env.example .env
npm.cmd run contracts:deploy:sepolia
```

`.env` 必填项：

```text
SEPOLIA_RPC_URL=你的 Sepolia RPC
SEPOLIA_PRIVATE_KEY=部署钱包私钥
RESULT_ORACLE_ADDRESS=后端 / 评审服务钱包地址
MIN_WORKER_STAKE_WEI=1000000000000000
MIN_VALIDATOR_STAKE_WEI=5000000000000000
VALIDATOR_REWARD_BPS=1000
```

部署成功后，脚本会写入：

```text
contracts/deployments/sepolia.json
```

该文件包含：

```text
合约地址
部署交易 hash
构造参数
ABI
```

该文件属于部署产物，默认被 `.gitignore` 忽略。

同时，脚本还会写入一个可提交给仓库的共享配置文件：

```text
packages/shared/src/contracts/compute-platform-sepolia.json
```

这个文件只保留前端和后端调用合约需要的信息：

```text
network
chainId
contract
address
abi
deployment.transactionHash
deployment.blockNumber
```

前端和后端应优先读取这个 shared config 来调用 Sepolia 上已部署的合约。
