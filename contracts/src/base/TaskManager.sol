// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PlatformBase} from "./PlatformBase.sol";

abstract contract TaskManager is PlatformBase {
    function _createTask(
        string calldata taskURI,
        string calldata orderURI,
        bytes32 criteriaHash,
        uint256 deadline,
        address creator,
        uint256 rewardPool
    ) internal returns (uint256 taskId) {
        require(bytes(taskURI).length > 0, "task uri required");
        require(rewardPool > 0, "reward pool required");
        require(deadline > block.timestamp, "deadline must be future");

        taskId = _nextTaskId++;
        _tasks[taskId] = Task({
            creator: creator,
            taskURI: taskURI,
            orderURI: orderURI,
            criteriaHash: criteriaHash,
            rewardPool: rewardPool,
            deadline: deadline,
            status: TaskStatus.Open,
            totalFinalScore: 0,
            totalWorkerReward: 0,
            totalValidatorReward: 0,
            workerCount: 0,
            evaluatedWorkerCount: 0,
            validatedResultCount: 0
        });

        emit TaskCreated(taskId, creator, taskURI, orderURI, criteriaHash, rewardPool, deadline);
    }

    function _fundTask(uint256 taskId, address funder, uint256 amount) internal {
        Task storage task = _tasks[taskId];
        require(task.status == TaskStatus.Open, "task not open");
        require(amount > 0, "fund amount required");

        task.rewardPool += amount;
        emit TaskFunded(taskId, funder, amount, task.rewardPool);
    }

    function _cancelTask(uint256 taskId) internal returns (address creator, uint256 refundAmount) {
        Task storage task = _tasks[taskId];
        require(task.creator == msg.sender, "not task creator");
        require(task.status == TaskStatus.Open, "task not open");
        require(task.workerCount == 0, "task has submissions");

        creator = task.creator;
        refundAmount = task.rewardPool;
        task.rewardPool = 0;
        task.status = TaskStatus.Cancelled;

        emit TaskCancelled(taskId, refundAmount);
    }

    function _submitWorkerOutput(
        uint256 taskId,
        address worker,
        string calldata outputURI,
        bytes32 outputHash
    ) internal {
        Task storage task = _tasks[taskId];
        require(task.status == TaskStatus.Open, "task not open");
        require(block.timestamp <= task.deadline, "task deadline passed");
        require(_workers[worker].active, "worker not active");
        require(!_workerListed[taskId][worker], "worker already submitted");
        require(bytes(outputURI).length > 0, "output uri required");

        _submissions[taskId][worker] = WorkerSubmission({
            worker: worker,
            outputURI: outputURI,
            outputHash: outputHash,
            submittedAt: block.timestamp,
            submitted: true
        });
        _workerListed[taskId][worker] = true;
        _taskWorkers[taskId].push(worker);
        task.workerCount += 1;

        emit WorkerOutputSubmitted(taskId, worker, outputURI, outputHash);
    }
}
