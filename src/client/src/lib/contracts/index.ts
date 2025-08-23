/**
 * Generic contract interaction utilities
 *
 * This library provides low-level, reusable utilities for interacting with
 * smart contracts using viem and wagmi. It includes:
 *
 * - Generic contract reading/writing utilities
 * - Multicall3 batching for efficient RPC usage
 * - Common ERC20 token interaction patterns
 * - Type-safe interfaces and error handling
 *
 * The utilities are designed to be contract-agnostic and reusable across
 * different applications and use cases.
 */

/**
 * Re-export commonly used types from viem for convenience
 */
export type { Address, Hash, PublicClient } from "viem"
// Multicall utilities
export {
  allCallsSuccessful,
  batchContractReads,
  extractSuccessfulResults,
} from "./multicall"
// Contract reading utilities
export {
  createContractCall,
  readContract,
  readContractMultiple,
  readContractMultipleWithFallback,
  readContractWithRetry,
} from "./reader"
// ERC20 token utilities
export {
  fetchMultipleTokenBalances,
  fetchMultipleTokenMetadata,
  fetchMultipleTokensWithBalances,
  fetchTokenBalance,
  fetchTokenMetadata,
  fetchTokenWithBalance,
} from "./tokens"
// Core types
export type {
  BatchCallResult,
  ContractCall,
  ContractCallResult,
  MulticallRequest,
  MulticallResponse,
  TokenMetadata,
  TokenWithBalance,
  TransactionRequest,
} from "./types"
export type { WriteContractAsyncFn } from "./writer"
// Contract writing utilities
export {
  createContractWrite,
  estimateContractWriteGas,
  prepareContractWrite,
  prepareMultipleContractWrites,
  writeContract,
  writeContractsSequentially,
} from "./writer"
