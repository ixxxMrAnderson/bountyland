// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PlatformBase} from "./PlatformBase.sol";

abstract contract StakeManager is PlatformBase {
    function _registerWorker(address worker, uint256 amount) internal {
        WorkerProfile storage profile = _workers[worker];
        uint256 newStake = profile.stake + amount;
        require(newStake >= _minWorkerStake, "worker stake too low");

        profile.stake = newStake;
        if (!profile.active) {
            profile.active = true;
            if (profile.reputation == 0) {
                profile.reputation = _INITIAL_REPUTATION;
            }
            emit WorkerRegistered(worker, profile.stake, profile.reputation);
        } else if (amount > 0) {
            emit StakeDeposited(worker, false, amount, profile.stake);
        }
    }

    function _registerValidator(address validator, uint256 amount) internal {
        ValidatorProfile storage profile = _validators[validator];
        uint256 newStake = profile.stake + amount;
        require(newStake >= _minValidatorStake, "validator stake too low");

        profile.stake = newStake;
        if (!profile.active) {
            profile.active = true;
            if (profile.reputation == 0) {
                profile.reputation = _INITIAL_REPUTATION;
            }
            emit ValidatorRegistered(validator, profile.stake, profile.reputation);
        } else if (amount > 0) {
            emit StakeDeposited(validator, true, amount, profile.stake);
        }
    }

    function _depositWorkerStake(address worker, uint256 amount) internal {
        require(_workers[worker].active, "worker not active");
        require(amount > 0, "stake amount required");

        _workers[worker].stake += amount;
        emit StakeDeposited(worker, false, amount, _workers[worker].stake);
    }

    function _depositValidatorStake(address validator, uint256 amount) internal {
        require(_validators[validator].active, "validator not active");
        require(amount > 0, "stake amount required");

        _validators[validator].stake += amount;
        emit StakeDeposited(validator, true, amount, _validators[validator].stake);
    }

    function _withdrawWorkerStake(address worker, uint256 amount) internal {
        WorkerProfile storage profile = _workers[worker];
        require(profile.active, "worker not active");
        require(amount > 0 && amount <= profile.stake, "invalid amount");
        require(profile.stake - amount >= _minWorkerStake, "below min stake");

        profile.stake -= amount;
        emit StakeWithdrawn(worker, false, amount);
    }

    function _withdrawValidatorStake(address validator, uint256 amount) internal {
        ValidatorProfile storage profile = _validators[validator];
        require(profile.active, "validator not active");
        require(amount > 0 && amount <= profile.stake, "invalid amount");
        require(profile.stake - amount >= _minValidatorStake, "below min stake");

        profile.stake -= amount;
        emit StakeWithdrawn(validator, true, amount);
    }
}
