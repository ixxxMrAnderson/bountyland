// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

abstract contract PlatformBase {
    uint256 internal constant _SCORE_SCALE = 100;
    uint256 internal constant _MAX_REPUTATION = 1000;
    uint256 internal constant _INITIAL_REPUTATION = 500;
    uint256 internal constant _MAX_BPS = 10_000;

    uint256 internal _nextTaskId = 1;
    uint256 internal _minWorkerStake;
    uint256 internal _minValidatorStake;
    uint256 internal _validatorRewardBps;
    address internal _owner;
    address internal _resultOracle;
    bool private _locked;

    enum TaskStatus {
        None,
        Open,
        Finalized,
        Cancelled
    }

    struct Task {
        address creator;
        string taskURI;
        string orderURI;
        bytes32 criteriaHash;
        uint256 rewardPool;
        uint256 deadline;
        TaskStatus status;
        uint256 totalFinalScore;
        uint256 totalWorkerReward;
        uint256 totalValidatorReward;
        uint256 workerCount;
        uint256 evaluatedWorkerCount;
        uint256 validatedResultCount;
    }

    struct WorkerProfile {
        uint256 stake;
        uint256 reputation;
        uint256 completedTasks;
        uint256 totalScore;
        bool active;
    }

    struct ValidatorProfile {
        uint256 stake;
        uint256 reputation;
        uint256 completedEvaluations;
        bool active;
    }

    struct WorkerSubmission {
        address worker;
        string outputURI;
        bytes32 outputHash;
        uint256 submittedAt;
        bool submitted;
    }

    struct Result {
        address validator;
        uint256 workerScore;
        uint256 validatorScore;
        string reportURI;
        bytes32 reportHash;
        bool submitted;
    }

    mapping(uint256 => Task) internal _tasks;
    mapping(uint256 => address[]) internal _taskWorkers;
    mapping(uint256 => mapping(address => bool)) internal _workerListed;
    mapping(uint256 => mapping(address => WorkerSubmission)) internal _submissions;
    mapping(uint256 => mapping(address => Result)) internal _results;
    mapping(address => WorkerProfile) internal _workers;
    mapping(address => ValidatorProfile) internal _validators;
    mapping(address => uint256) internal _pendingRewards;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event ResultOracleUpdated(address indexed previousOracle, address indexed newOracle);
    event StakeRequirementsUpdated(uint256 _minWorkerStake, uint256 _minValidatorStake);
    event ValidatorRewardBpsUpdated(uint256 previousBps, uint256 newBps);
    event TaskCreated(
        uint256 indexed taskId,
        address indexed creator,
        string taskURI,
        string orderURI,
        bytes32 criteriaHash,
        uint256 rewardPool,
        uint256 deadline
    );
    event TaskFunded(uint256 indexed taskId, address indexed funder, uint256 amount, uint256 rewardPool);
    event TaskCancelled(uint256 indexed taskId, uint256 refundAmount);
    event TaskFinalized(
        uint256 indexed taskId,
        uint256 totalWorkerReward,
        uint256 totalValidatorReward,
        uint256 refundAmount
    );
    event WorkerRegistered(address indexed worker, uint256 stake, uint256 reputation);
    event ValidatorRegistered(address indexed validator, uint256 stake, uint256 reputation);
    event StakeDeposited(address indexed account, bool indexed isValidator, uint256 amount, uint256 totalStake);
    event StakeWithdrawn(address indexed account, bool indexed isValidator, uint256 amount);
    event WorkerOutputSubmitted(
        uint256 indexed taskId,
        address indexed worker,
        string outputURI,
        bytes32 outputHash
    );
    event ResultSubmitted(
        uint256 indexed taskId,
        address indexed worker,
        address indexed validator,
        uint256 workerScore,
        uint256 validatorScore,
        string reportURI,
        bytes32 reportHash
    );
    event WorkerRewardAllocated(uint256 indexed taskId, address indexed worker, uint256 amount);
    event ValidatorRewardAllocated(uint256 indexed taskId, address indexed validator, uint256 amount);
    event ReputationUpdated(address indexed account, bool indexed isValidator, uint256 reputation);
    event RewardClaimed(address indexed account, uint256 amount);

    function _sendValue(address recipient, uint256 amount) internal {
        if (amount == 0) {
            return;
        }

        (bool success, ) = payable(recipient).call{value: amount}("");
        require(success, "eth transfer failed");
    }

    function _decrease(uint256 value, uint256 amount) internal pure returns (uint256) {
        return amount >= value ? 0 : value - amount;
    }

    function _min(uint256 left, uint256 right) internal pure returns (uint256) {
        return left < right ? left : right;
    }

    function _setReentrancyLock() internal {
        require(!_locked, "reentrant call");
        _locked = true;
    }

    function _clearReentrancyLock() internal {
        _locked = false;
    }
}
