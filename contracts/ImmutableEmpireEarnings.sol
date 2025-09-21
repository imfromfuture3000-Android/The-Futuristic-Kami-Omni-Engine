// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ImmutableEmpireEarnings
 * @dev Immutable contract for empire earnings allocation and distribution
 * All allocation percentages are immutable after deployment
 */
contract ImmutableEmpireEarnings is Ownable, ReentrancyGuard {

    // ========== IMMUTABLE ALLOCATION PERCENTAGES ==========
    // These values cannot be changed after deployment

    uint256 public constant VAULT_ALLOCATION = 40;      // 40% to Vault
    uint256 public constant GROWTH_ALLOCATION = 30;     // 30% to Growth
    uint256 public constant SPECULATIVE_ALLOCATION = 20; // 20% to Speculative
    uint256 public constant TREASURY_ALLOCATION = 10;   // 10% to Treasury

    // Total should always be 100%
    uint256 public constant TOTAL_ALLOCATION = 100;

    // ========== IMMUTABLE STRATEGY MAPPINGS ==========

    enum AllocationType { VAULT, GROWTH, SPECULATIVE, TREASURY }
    enum StrategyType { STAKING, LENDING, YIELD_FARMING, HOLD, VALIDATOR_STAKING }

    // Immutable strategy mappings per allocation type and chain
    mapping(AllocationType => mapping(string => StrategyType)) public immutableStrategies;

    // ========== IMMUTABLE VALIDATION ==========

    // Ensure total allocation equals 100%
    constructor() Ownable(msg.sender) {
        require(
            VAULT_ALLOCATION + GROWTH_ALLOCATION + SPECULATIVE_ALLOCATION + TREASURY_ALLOCATION == TOTAL_ALLOCATION,
            "Total allocation must equal 100%"
        );

        // Set immutable strategy mappings
        _initializeStrategies();
    }

    /**
     * @dev Initialize immutable strategy mappings
     */
    function _initializeStrategies() internal {
        // Vault strategies (immutable)
        immutableStrategies[AllocationType.VAULT]["solana"] = StrategyType.VALIDATOR_STAKING;
        immutableStrategies[AllocationType.VAULT]["ethereum"] = StrategyType.STAKING;
        immutableStrategies[AllocationType.VAULT]["default"] = StrategyType.STAKING;

        // Growth strategies (immutable)
        immutableStrategies[AllocationType.GROWTH]["ethereum"] = StrategyType.LENDING;
        immutableStrategies[AllocationType.GROWTH]["solana"] = StrategyType.LENDING;
        immutableStrategies[AllocationType.GROWTH]["default"] = StrategyType.LENDING;

        // Speculative strategies (immutable)
        immutableStrategies[AllocationType.SPECULATIVE]["default"] = StrategyType.YIELD_FARMING;

        // Treasury strategies (immutable)
        immutableStrategies[AllocationType.TREASURY]["default"] = StrategyType.HOLD;
    }

    // ========== IMMUTABLE ALLOCATION CALCULATION ==========

    /**
     * @dev Calculate allocation amounts (immutable logic)
     * @param totalAmount Total amount to allocate
     * @return vaultAmount Amount for vault
     * @return growthAmount Amount for growth
     * @return speculativeAmount Amount for speculative
     * @return treasuryAmount Amount for treasury
     */
    function calculateAllocations(uint256 totalAmount)
        external
        pure
        returns (
            uint256 vaultAmount,
            uint256 growthAmount,
            uint256 speculativeAmount,
            uint256 treasuryAmount
        )
    {
        vaultAmount = (totalAmount * VAULT_ALLOCATION) / TOTAL_ALLOCATION;
        growthAmount = (totalAmount * GROWTH_ALLOCATION) / TOTAL_ALLOCATION;
        speculativeAmount = (totalAmount * SPECULATIVE_ALLOCATION) / TOTAL_ALLOCATION;
        treasuryAmount = (totalAmount * TREASURY_ALLOCATION) / TOTAL_ALLOCATION;

        // Ensure no precision loss
        uint256 totalCalculated = vaultAmount + growthAmount + speculativeAmount + treasuryAmount;
        if (totalCalculated < totalAmount) {
            // Add remainder to treasury (immutable rule)
            treasuryAmount += (totalAmount - totalCalculated);
        }
    }

    /**
     * @dev Get strategy for allocation type and chain (immutable)
     * @param allocationType Type of allocation
     * @param chain Blockchain name
     * @return strategy Strategy type
     */
    function getStrategy(AllocationType allocationType, string memory chain)
        external
        view
        returns (StrategyType strategy)
    {
        // Try chain-specific strategy first
        StrategyType chainStrategy = immutableStrategies[allocationType][chain];
        if (chainStrategy != StrategyType.HOLD) {
            return chainStrategy;
        }

        // Fall back to default strategy
        return immutableStrategies[allocationType]["default"];
    }

    /**
     * @dev Validate allocation percentages (immutable validation)
     * @return isValid True if allocations are valid
     */
    function validateAllocations() external pure returns (bool isValid) {
        return VAULT_ALLOCATION + GROWTH_ALLOCATION + SPECULATIVE_ALLOCATION + TREASURY_ALLOCATION == TOTAL_ALLOCATION;
    }

    /**
     * @dev Get allocation percentages (immutable view)
     */
    function getAllocationPercentages()
        external
        pure
        returns (
            uint256 vault,
            uint256 growth,
            uint256 speculative,
            uint256 treasury
        )
    {
        return (VAULT_ALLOCATION, GROWTH_ALLOCATION, SPECULATIVE_ALLOCATION, TREASURY_ALLOCATION);
    }

    // ========== IMMUTABLE AUDIT FUNCTIONS ==========

    /**
     * @dev Get contract deployment info (immutable)
     */
    function getDeploymentInfo()
        external
        view
        returns (
            address deployer,
            uint256 deploymentTime,
            uint256 vaultAllocation,
            uint256 growthAllocation,
            uint256 speculativeAllocation,
            uint256 treasuryAllocation
        )
    {
        return (
            owner(),
            block.timestamp, // This will be deployment time
            VAULT_ALLOCATION,
            GROWTH_ALLOCATION,
            SPECULATIVE_ALLOCATION,
            TREASURY_ALLOCATION
        );
    }

    /**
     * @dev Verify contract integrity (immutable check)
     */
    function verifyIntegrity() external pure returns (bool isValid) {
        return VAULT_ALLOCATION > 0 &&
               GROWTH_ALLOCATION > 0 &&
               SPECULATIVE_ALLOCATION > 0 &&
               TREASURY_ALLOCATION > 0 &&
               VAULT_ALLOCATION + GROWTH_ALLOCATION + SPECULATIVE_ALLOCATION + TREASURY_ALLOCATION == TOTAL_ALLOCATION;
    }

    // ========== EVENTS ==========

    event AllocationCalculated(
        uint256 indexed totalAmount,
        uint256 vaultAmount,
        uint256 growthAmount,
        uint256 speculativeAmount,
        uint256 treasuryAmount
    );

    event StrategyQueried(
        AllocationType indexed allocationType,
        string chain,
        StrategyType strategy
    );
}