// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PlatformBase} from "./PlatformBase.sol";

abstract contract ReputationManager is PlatformBase {
    function _updateWorkerReputation(address worker, uint256 finalScore) internal {
        WorkerProfile storage profile = _workers[worker];
        if (finalScore >= 80) {
            profile.reputation = _min(profile.reputation + 20, _MAX_REPUTATION);
        } else if (finalScore >= 50) {
            profile.reputation = _min(profile.reputation + 5, _MAX_REPUTATION);
        } else {
            profile.reputation = _decrease(profile.reputation, 60);
        }

        profile.completedTasks += 1;
        profile.totalScore += finalScore;
        emit ReputationUpdated(worker, false, profile.reputation);
    }

    function _updateValidatorReputation(address validator) internal {
        ValidatorProfile storage profile = _validators[validator];
        profile.reputation = _min(profile.reputation + 5, _MAX_REPUTATION);
        profile.completedEvaluations += 1;
        emit ReputationUpdated(validator, true, profile.reputation);
    }

    function _updateValidatorReputation(address validator, uint256 qualityScore) internal {
        ValidatorProfile storage profile = _validators[validator];
        if (qualityScore >= 80) {
            profile.reputation = _min(profile.reputation + 20, _MAX_REPUTATION);
        } else if (qualityScore >= 50) {
            profile.reputation = _min(profile.reputation + 5, _MAX_REPUTATION);
        } else {
            profile.reputation = _decrease(profile.reputation, 60);
        }

        profile.completedEvaluations += 1;
        emit ReputationUpdated(validator, true, profile.reputation);
    }
}
