import type { TransactionRequest } from "./types"

/**
 * Create a transaction request for contract writes
 */
export function createContractWrite(
  address: string,
  abi: any,
  functionName: string,
  args?: readonly unknown[],
): TransactionRequest {
  return {
    address: address as `0x${string}`,
    abi,
    functionName,
    args,
  }
}

/**
 * Execute a contract write using the provided write function
 * This is a generic wrapper that works with any write contract function
 */
export async function writeContract(
  request: TransactionRequest,
  writeContractFn: (params: any) => Promise<`0x${string}`>,
): Promise<`0x${string}`> {
  return await writeContractFn({
    address: request.address,
    abi: request.abi,
    functionName: request.functionName,
    args: request.args,
  })
}
