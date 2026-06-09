// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TaskManager} from "./base/TaskManager.sol";
import {StakeManager} from "./base/StakeManager.sol";
import {ResultManager} from "./base/ResultManager.sol";

/// @title ComputeOutsourcePlatform
/// @notice Generic escrow, result recording, payout, and reputation contract for outsourced work.
/// @dev Scoring rules stay off-chain. This contract only accepts final scores from _resultOracle.
contract ComputeOutsourcePlatform is TaskManager, StakeManager, ResultManager {
    modifier onlyOwner() {
        require(msg.sender == _owner, "not owner");
        _;
    }

    modifier onlyResultOracle() {
        require(msg.sender == _resultOracle, "not result oracle");
        _;
    }

    modifier nonReentrant() {
        _setReentrancyLock();
        _;
        _clearReentrancyLock();
    }

    constructor(
        address initialResultOracle,
        uint256 initialMinWorkerStake,
        uint256 initialMinValidatorStake,
        uint256 initialValidatorRewardBps
    ) {
        require(initialResultOracle != address(0), "result oracle required");
        require(initialValidatorRewardBps <= 2_000, "validator reward too high");

        _owner = msg.sender;
        _resultOracle = initialResultOracle;
        _minWorkerStake = initialMinWorkerStake;
        _minValidatorStake = initialMinValidatorStake;
        _validatorRewardBps = initialValidatorRewardBps;

        emit OwnershipTransferred(address(0), msg.sender);
        emit ResultOracleUpdated(address(0), initialResultOracle);
        emit StakeRequirementsUpdated(initialMinWorkerStake, initialMinValidatorStake);
        emit ValidatorRewardBpsUpdated(0, initialValidatorRewardBps);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "new owner required");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }

    function setResultOracle(address newResultOracle) external onlyOwner {
        require(newResultOracle != address(0), "result oracle required");
        emit ResultOracleUpdated(_resultOracle, newResultOracle);
        _resultOracle = newResultOracle;
    }

    function setStakeRequirements(uint256 newMinWorkerStake, uint256 newMinValidatorStake) external onlyOwner {
        _minWorkerStake = newMinWorkerStake;
        _minValidatorStake = newMinValidatorStake;
        emit StakeRequirementsUpdated(newMinWorkerStake, newMinValidatorStake);
    }

    function setValidatorRewardBps(uint256 newValidatorRewardBps) external onlyOwner {
        require(newValidatorRewardBps <= 2_000, "validator reward too high");
        emit ValidatorRewardBpsUpdated(_validatorRewardBps, newValidatorRewardBps);
        _validatorRewardBps = newValidatorRewardBps;
    }

    function createTask(
        string calldata taskURI,
        string calldata orderURI,
        bytes32 criteriaHash,
        uint256 deadline
    ) external payable returns (uint256 taskId) {
        return _createTask(taskURI, orderURI, criteriaHash, deadline, msg.sender, msg.value);
    }

    function fundTask(uint256 taskId) external payable {
        _fundTask(taskId, msg.sender, msg.value);
    }

    function cancelTask(uint256 taskId) external nonReentrant {
        (address creator, uint256 refundAmount) = _cancelTask(taskId);
        _sendValue(creator, refundAmount);
    }

    function registerWorker() external payable {
        _registerWorker(msg.sender, msg.value);
    }

    function registerValidator() external payable {
        _registerValidator(msg.sender, msg.value);
    }

    function depositWorkerStake() external payable {
        _depositWorkerStake(msg.sender, msg.value);
    }

    function depositValidatorStake() external payable {
        _depositValidatorStake(msg.sender, msg.value);
    }

    function withdrawWorkerStake(uint256 amount) external nonReentrant {
        _withdrawWorkerStake(msg.sender, amount);
        _sendValue(msg.sender, amount);
    }

    function withdrawValidatorStake(uint256 amount) external nonReentrant {
        _withdrawValidatorStake(msg.sender, amount);
        _sendValue(msg.sender, amount);
    }

    function submitWorkerOutput(
        uint256 taskId,
        string calldata outputURI,
        bytes32 outputHash
    ) external {
        _submitWorkerOutput(taskId, msg.sender, outputURI, outputHash);
    }

    /// @notice Records the off-chain final result for a worker submission.
    /// @dev The result oracle is expected to run any validation, scoring, or dataset checks off-chain.
    function submitResult(
        uint256 taskId,
        address worker,
        address validator,
        uint256 workerScore,
        uint256 validatorScore,
        string calldata reportURI,
        bytes32 reportHash
    ) external onlyResultOracle {
        _submitResult(taskId, worker, validator, workerScore, validatorScore, reportURI, reportHash);
    }

    function finalizeTask(uint256 taskId) external nonReentrant {
        Task storage task = _tasks[taskId];
        require(msg.sender == task.creator || msg.sender == _owner, "not authorized");
        _finalizeTask(taskId);
    }

    function claimReward() external nonReentrant {
        uint256 amount = _pendingRewards[msg.sender];
        require(amount > 0, "no reward");

        _pendingRewards[msg.sender] = 0;
        _sendValue(msg.sender, amount);

        emit RewardClaimed(msg.sender, amount);
    }

    function SCORE_SCALE() external pure returns (uint256) {
        return _SCORE_SCALE;
    }

    function MAX_REPUTATION() external pure returns (uint256) {
        return _MAX_REPUTATION;
    }

    function INITIAL_REPUTATION() external pure returns (uint256) {
        return _INITIAL_REPUTATION;
    }

    function MAX_BPS() external pure returns (uint256) {
        return _MAX_BPS;
    }

    function nextTaskId() external view returns (uint256) {
        return _nextTaskId;
    }

    function minWorkerStake() external view returns (uint256) {
        return _minWorkerStake;
    }

    function minValidatorStake() external view returns (uint256) {
        return _minValidatorStake;
    }

    function validatorRewardBps() external view returns (uint256) {
        return _validatorRewardBps;
    }

    function owner() external view returns (address) {
        return _owner;
    }

    function resultOracle() external view returns (address) {
        return _resultOracle;
    }

    function pendingRewards(address account) external view returns (uint256) {
        return _pendingRewards[account];
    }

    function workers(address worker) external view returns (WorkerProfile memory) {
        return _workers[worker];
    }

    function validators(address validator) external view returns (ValidatorProfile memory) {
        return _validators[validator];
    }

    function submissions(uint256 taskId, address worker) external view returns (WorkerSubmission memory) {
        return _submissions[taskId][worker];
    }

    function results(uint256 taskId, address worker) external view returns (Result memory) {
        return _results[taskId][worker];
    }

    function getTaskWorkers(uint256 taskId) external view returns (address[] memory) {
        return _taskWorkers[taskId];
    }

    function getTaskCore(
        uint256 taskId
    )
        external
        view
        returns (
            address creator,
            string memory taskURI,
            string memory orderURI,
            bytes32 criteriaHash,
            uint256 deadline,
            TaskStatus status
        )
    {
        Task storage task = _tasks[taskId];
        return (task.creator, task.taskURI, task.orderURI, task.criteriaHash, task.deadline, task.status);
    }

    function getTaskStats(
        uint256 taskId
    )
        external
        view
        returns (
            uint256 rewardPool,
            uint256 totalFinalScore,
            uint256 totalWorkerReward,
            uint256 totalValidatorReward,
            uint256 workerCount,
            uint256 evaluatedWorkerCount,
            uint256 validatedResultCount
        )
    {
        Task storage task = _tasks[taskId];
        return (
            task.rewardPool,
            task.totalFinalScore,
            task.totalWorkerReward,
            task.totalValidatorReward,
            task.workerCount,
            task.evaluatedWorkerCount,
            task.validatedResultCount
        );
    }

    function getWorkerAverageScore(address worker) external view returns (uint256) {
        WorkerProfile storage profile = _workers[worker];
        if (profile.completedTasks == 0) {
            return 0;
        }
        return profile.totalScore / profile.completedTasks;
    }
}
