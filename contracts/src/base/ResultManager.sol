// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReputationManager} from "./ReputationManager.sol";

abstract contract ResultManager is ReputationManager {
    function _submitResult(
        uint256 taskId,
        address worker,
        address validator,
        uint256 workerScore,
        uint256 validatorScore,
        string calldata reportURI,
        bytes32 reportHash
    ) internal {
        Task storage task = _tasks[taskId];
        require(task.status == TaskStatus.Open, "task not open");
        require(workerScore <= _SCORE_SCALE, "worker score out of range");
        require(validatorScore <= _SCORE_SCALE, "validator score out of range");
        require(_submissions[taskId][worker].submitted, "submission not found");
        require(!_results[taskId][worker].submitted, "result submitted");

        if (validator != address(0)) {
            require(_validators[validator].active, "validator not active");
            require(validator != worker, "validator cannot score self");
        }

        _results[taskId][worker] = Result({
            validator: validator,
            workerScore: workerScore,
            validatorScore: validatorScore,
            reportURI: reportURI,
            reportHash: reportHash,
            submitted: true
        });

        task.totalFinalScore += workerScore;
        task.evaluatedWorkerCount += 1;

        _updateWorkerReputation(worker, workerScore);
        if (validator != address(0)) {
            task.validatedResultCount += 1;
            _updateValidatorReputation(validator, validatorScore);
        }

        emit ResultSubmitted(
            taskId,
            worker,
            validator,
            workerScore,
            validatorScore,
            reportURI,
            reportHash
        );
    }

    function _finalizeTask(uint256 taskId) internal {
        Task storage task = _tasks[taskId];
        require(task.status == TaskStatus.Open, "task not open");
        require(task.evaluatedWorkerCount > 0, "no submitted results");
        require(block.timestamp > task.deadline || task.evaluatedWorkerCount == task.workerCount, "task still active");

        task.status = TaskStatus.Finalized;

        if (task.totalFinalScore == 0) {
            uint256 fullRefundAmount = task.rewardPool;
            _pendingRewards[task.creator] += fullRefundAmount;
            emit TaskFinalized(taskId, 0, 0, fullRefundAmount);
            return;
        }

        uint256 totalWorkerReward = (task.rewardPool * (_MAX_BPS - _validatorRewardBps)) / _MAX_BPS;
        (uint256 allocatedWorkerReward, uint256 allocatedValidatorReward) = _allocateTaskRewards(
            taskId,
            totalWorkerReward,
            task.rewardPool - totalWorkerReward,
            task.totalFinalScore,
            task.validatedResultCount
        );

        uint256 refundAmount = task.rewardPool - allocatedWorkerReward - allocatedValidatorReward;
        if (refundAmount > 0) {
            _pendingRewards[task.creator] += refundAmount;
        }

        task.totalWorkerReward = allocatedWorkerReward;
        task.totalValidatorReward = allocatedValidatorReward;

        emit TaskFinalized(taskId, allocatedWorkerReward, allocatedValidatorReward, refundAmount);
    }

    function _allocateTaskRewards(
        uint256 taskId,
        uint256 totalWorkerReward,
        uint256 totalValidatorReward,
        uint256 totalFinalScore,
        uint256 validatedResultCount
    ) internal returns (uint256 allocatedWorkerReward, uint256 allocatedValidatorReward) {
        address[] storage taskWorkers = _taskWorkers[taskId];

        for (uint256 i = 0; i < taskWorkers.length; i++) {
            address worker = taskWorkers[i];
            Result storage result = _results[taskId][worker];
            if (!result.submitted || result.workerScore == 0) {
                continue;
            }

            uint256 workerReward = (totalWorkerReward * result.workerScore) / totalFinalScore;
            uint256 validatorReward = 0;
            if (result.validator != address(0) && validatedResultCount > 0) {
                validatorReward = totalValidatorReward / validatedResultCount;
                _pendingRewards[result.validator] += validatorReward;
                emit ValidatorRewardAllocated(taskId, result.validator, validatorReward);
            }

            allocatedWorkerReward += workerReward;
            allocatedValidatorReward += validatorReward;
            _pendingRewards[worker] += workerReward;

            emit WorkerRewardAllocated(taskId, worker, workerReward);
        }
    }
}
