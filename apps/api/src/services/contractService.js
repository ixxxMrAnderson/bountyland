import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Contract, JsonRpcProvider, Wallet } from "ethers";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "../../../..");
const defaultContractConfigPath = resolve(
  rootDir,
  "packages/shared/src/contracts/compute-platform-sepolia.json"
);

let cachedConfig;
let cachedProvider;
let cachedSigner;
let cachedContract;

export function getContractConfig() {
  if (!cachedConfig) {
    const configPath = process.env.COMPUTE_PLATFORM_CONFIG_PATH || defaultContractConfigPath;
    cachedConfig = JSON.parse(readFileSync(configPath, "utf8"));
  }
  return cachedConfig;
}

export function getReadOnlyContract() {
  const config = getContractConfig();
  const provider = getProvider();
  return new Contract(config.address, config.abi, provider);
}

export function getResultOracleContract() {
  if (!cachedContract) {
    const config = getContractConfig();
    cachedContract = new Contract(config.address, config.abi, getResultOracleSigner());
  }
  return cachedContract;
}

export function getProvider() {
  if (!cachedProvider) {
    const rpcUrl = process.env.SEPOLIA_RPC_URL;
    if (!rpcUrl) {
      throw new Error("Missing SEPOLIA_RPC_URL in environment.");
    }
    cachedProvider = new JsonRpcProvider(rpcUrl);
  }
  return cachedProvider;
}

export function getResultOracleSigner() {
  if (!cachedSigner) {
    const privateKey = process.env.RESULT_ORACLE_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error("Missing RESULT_ORACLE_PRIVATE_KEY in environment.");
    }
    cachedSigner = new Wallet(privateKey, getProvider());
  }
  return cachedSigner;
}

export async function assertResultOracleSigner() {
  const contract = getReadOnlyContract();
  const signer = getResultOracleSigner();
  const [contractOracle, signerAddress] = await Promise.all([
    contract.resultOracle(),
    signer.getAddress()
  ]);

  if (contractOracle.toLowerCase() !== signerAddress.toLowerCase()) {
    throw new Error(
      `RESULT_ORACLE_PRIVATE_KEY address ${signerAddress} does not match contract resultOracle ${contractOracle}.`
    );
  }

  return { contractOracle, signerAddress };
}

export async function submitResultOnchain({
  taskId,
  worker,
  validator,
  workerScore,
  validatorScore,
  reportURI,
  reportHash
}) {
  await assertResultOracleSigner();
  const contract = getResultOracleContract();
  const tx = await contract.submitResult(
    taskId,
    worker,
    validator,
    workerScore,
    validatorScore,
    reportURI,
    reportHash
  );
  const receipt = await tx.wait();
  return serializeTransaction(tx, receipt);
}

export async function finalizeTaskOnchain({ taskId, recipients, bpsShares }) {
  await assertResultOracleSigner();
  const contract = getResultOracleContract();
  const tx = await contract.finalizeTask(taskId, recipients, bpsShares);
  const receipt = await tx.wait();
  return serializeTransaction(tx, receipt);
}

export async function getOnchainTaskStats(taskId) {
  const contract = getReadOnlyContract();
  const [core, stats] = await Promise.all([
    contract.getTaskCore(taskId),
    contract.getTaskStats(taskId)
  ]);
  return {
    core: {
      creator: core[0],
      taskURI: core[1],
      orderURI: core[2],
      criteriaHash: core[3],
      deadline: core[4].toString(),
      status: Number(core[5])
    },
    stats: {
      rewardPool: stats[0].toString(),
      totalFinalScore: stats[1].toString(),
      allocatedReward: stats[2].toString(),
      refundedReward: stats[3].toString(),
      workerCount: stats[4].toString(),
      evaluatedWorkerCount: stats[5].toString(),
      validatedResultCount: stats[6].toString()
    }
  };
}

function serializeTransaction(tx, receipt) {
  return {
    hash: tx.hash,
    blockNumber: receipt?.blockNumber ?? null,
    status: receipt?.status ?? null,
    gasUsed: receipt?.gasUsed?.toString?.() ?? null
  };
}
