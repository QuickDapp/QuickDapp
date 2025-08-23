import { useMutation, useQueryClient } from "@tanstack/react-query"
import { type Address, parseUnits } from "viem"
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi"
import erc20AbiJson from "../../../shared/abi/data/erc20abi.json"
import { FactoryContract_ABI } from "../../../shared/abi/generated"
import { clientConfig } from "../../../shared/config/client"

const ERC20_ABI = erc20AbiJson

export interface CreateTokenParams {
  name: string
  symbol: string
  decimals: number
  initialSupply: string
}

export interface TransferTokenParams {
  tokenAddress: string
  to: string
  amount: string
  decimals: number
}

/**
 * Hook to create a new ERC20 token
 */
export function useCreateToken() {
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: CreateTokenParams) => {
      if (!address) {
        throw new Error("Wallet not connected")
      }

      const factoryAddress = clientConfig.FACTORY_CONTRACT_ADDRESS
      const initialSupplyWei = parseUnits(params.initialSupply, params.decimals)

      const hash = await writeContractAsync({
        address: factoryAddress as Address,
        abi: FactoryContract_ABI,
        functionName: "erc20DeployToken",
        args: [
          {
            name: params.name,
            symbol: params.symbol,
            decimals: params.decimals,
          },
          initialSupplyWei,
        ],
      })

      return { hash, params }
    },
    onSuccess: () => {
      // Invalidate and refetch token-related queries
      queryClient.invalidateQueries({ queryKey: ["tokens"] })
    },
  })
}

/**
 * Hook to transfer ERC20 tokens
 */
export function useTransferToken() {
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: TransferTokenParams) => {
      if (!address) {
        throw new Error("Wallet not connected")
      }

      const amountWei = parseUnits(params.amount, params.decimals)

      const hash = await writeContractAsync({
        address: params.tokenAddress as Address,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [params.to as Address, amountWei],
      })

      return { hash, params }
    },
    onSuccess: () => {
      // Invalidate and refetch token-related queries
      queryClient.invalidateQueries({ queryKey: ["tokens"] })
    },
  })
}

/**
 * Hook to wait for a transaction receipt and handle success/error states
 */
export function useTransactionStatus(hash: Address | undefined) {
  const {
    data: receipt,
    isLoading,
    isSuccess,
    isError,
    error,
  } = useWaitForTransactionReceipt({
    hash,
    query: {
      enabled: !!hash,
    },
  })

  return {
    receipt,
    isLoading,
    isSuccess: isSuccess && receipt?.status === "success",
    isError: isError || receipt?.status === "reverted",
    error,
  }
}
