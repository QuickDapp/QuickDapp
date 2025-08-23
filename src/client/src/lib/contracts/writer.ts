import type { Hash } from "viem"
import type { WriteContractParameters } from "wagmi/actions"
import type { ContractCall, TransactionRequest } from "./types"

/**
 * Write contract function type from wagmi
 */
export type WriteContractAsyncFn = (
  parameters: WriteContractParameters,
) => Promise<Hash>

/**
 * Prepare a contract write transaction
 * Returns the transaction parameters that can be used with writeContract
 */
export function prepareContractWrite(call: ContractCall): TransactionRequest {
  return {
    address: call.address,
    abi: call.abi,
    functionName: call.functionName,
    args: call.args,
  } as TransactionRequest
}

/**
 * Execute a contract write operation
 * Generic wrapper around wagmi's writeContractAsync
 */
export async function writeContract(
  call: ContractCall,
  writeContractAsync: WriteContractAsyncFn,
): Promise<Hash> {
  try {
    const transaction = prepareContractWrite(call)
    return await writeContractAsync(transaction)
  } catch (error) {
    throw new Error(
      `Contract write failed for ${call.functionName} on ${call.address}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
  }
}

/**
 * Prepare multiple contract writes (for batching or sequential execution)
 */
export function prepareMultipleContractWrites(
  calls: ContractCall[],
): TransactionRequest[] {
  return calls.map(prepareContractWrite)
}

/**
 * Execute multiple contract writes sequentially
 * Returns array of transaction hashes in order
 */
export async function writeContractsSequentially(
  calls: ContractCall[],
  writeContractAsync: WriteContractAsyncFn,
): Promise<Hash[]> {
  const hashes: Hash[] = []

  for (const call of calls) {
    try {
      const hash = await writeContract(call, writeContractAsync)
      hashes.push(hash)
    } catch (error) {
      throw new Error(
        `Sequential contract write failed at ${call.functionName}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    }
  }

  return hashes
}

/**
 * Create a contract call configuration for writing
 */
export function createContractWrite(
  address: string,
  abi: any,
  functionName: string,
  args?: readonly unknown[],
): ContractCall {
  return {
    address: address as `0x${string}`,
    abi,
    functionName,
    args,
  }
}

/**
 * Estimate gas for a contract write
 */
export async function estimateContractWriteGas(
  call: ContractCall,
  publicClient: any, // PublicClient with estimateContractGas
  account: `0x${string}`,
): Promise<bigint> {
  try {
    return await publicClient.estimateContractGas({
      address: call.address,
      abi: call.abi,
      functionName: call.functionName,
      args: call.args,
      account,
    })
  } catch (error) {
    throw new Error(
      `Gas estimation failed for ${call.functionName} on ${call.address}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
  }
}
