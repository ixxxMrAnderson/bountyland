const fs = require("node:fs");
const path = require("node:path");
const hre = require("hardhat");

const rootDir = process.cwd();
const deploymentPath = path.join(rootDir, "contracts", "deployments", "sepolia.json");
const sharedConfigPath = path.join(
  rootDir,
  "packages",
  "shared",
  "src",
  "contracts",
  "compute-platform-sepolia.json",
);

loadEnvFile(path.join(rootDir, ".env"));

async function main() {
  requireEnv("SEPOLIA_RPC_URL");
  requireEnv("SEPOLIA_PRIVATE_KEY");
  const resultOracle = requireEnv("RESULT_ORACLE_ADDRESS");
  const minWorkerStake = requireEnv("MIN_WORKER_STAKE_WEI");
  const minValidatorStake = requireEnv("MIN_VALIDATOR_STAKE_WEI");
  const validatorRewardBps = requireEnv("VALIDATOR_REWARD_BPS");

  if (!hre.ethers.isAddress(resultOracle)) {
    throw new Error("RESULT_ORACLE_ADDRESS must be a valid EVM address");
  }

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying ComputeOutsourcePlatform to ${hre.network.name} from ${deployer.address}`);

  const Factory = await hre.ethers.getContractFactory("ComputeOutsourcePlatform");
  const contract = await Factory.deploy(
    resultOracle,
    minWorkerStake,
    minValidatorStake,
    validatorRewardBps,
  );

  const deploymentTx = contract.deploymentTransaction();
  console.log(`Submitted deployment tx: ${deploymentTx.hash}`);

  await contract.waitForDeployment();
  const address = await contract.getAddress();
  const receipt = await deploymentTx.wait();
  const artifact = await hre.artifacts.readArtifact("ComputeOutsourcePlatform");

  const deployment = {
    network: hre.network.name,
    contract: "ComputeOutsourcePlatform",
    address,
    deployer: deployer.address,
    transactionHash: deploymentTx.hash,
    blockNumber: receipt.blockNumber,
    constructorArgs: {
      resultOracle,
      minWorkerStake,
      minValidatorStake,
      validatorRewardBps,
    },
    abi: artifact.abi,
  };

  fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
  fs.writeFileSync(deploymentPath, `${JSON.stringify(deployment, null, 2)}\n`);

  const sharedConfig = {
    network: hre.network.name,
    chainId: 11155111,
    contract: "ComputeOutsourcePlatform",
    address,
    abi: artifact.abi,
    deployment: {
      transactionHash: deploymentTx.hash,
      blockNumber: receipt.blockNumber,
    },
  };

  fs.mkdirSync(path.dirname(sharedConfigPath), { recursive: true });
  fs.writeFileSync(sharedConfigPath, `${JSON.stringify(sharedConfig, null, 2)}\n`);

  console.log(`Deployed at: ${address}`);
  console.log(`Deployment metadata written to ${deploymentPath}`);
  console.log(`Shared contract config written to ${sharedConfigPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = stripQuotes(value);
    }
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function stripQuotes(value) {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}
