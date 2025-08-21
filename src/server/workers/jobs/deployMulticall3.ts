import { createPublicClient, createWalletClient, type Hex, http } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { serverConfig } from "../../../shared/config/env"
import type { Job, JobParams } from "./types"

// Multicall3 deployment data (deterministic deployment)
const MULTICALL3_DEPLOYER =
  "0x05f32b3cc3888453ff71b01135b34ff8e41263f2" as const
const MULTICALL3_INIT_CODE =
  "0x608060405234801561001057600080fd5b50610868806100206000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c8063252dba421461003b578063ce25bbf414610057575b600080fd5b610055600480360381019061005091906103ac565b610073565b005b610071600480360381019061006c91906103ac565b6100d6565b005b60005b81518110156100d25760008282815181106100935761009261061a565b5b6020026020010151905060006100a88261013a565b9050806100b457600080fd5b506100be83610146565b80806100c990610659565b915050610076565b5050565b60005b815181101561013657600082828151811061013557600080fd5b5b6020026020010151905060006101008261013a565b905080610110576001915050610136565b61011983610146565b808061012490610659565b915050610116565b5b5050565b6000815160001a9150919050565b60006101518261013a565b9050600081146101635750600061016f565b61016c83610171565b90505b919050565b600080600083516020850186885af190503d6000803e806000811461019a57600091505b50909392505050565b6000604051905090565b600080fd5b600080fd5b600080fd5b6000601f19601f8301169050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b6101fe826101b5565b810181811067ffffffffffffffff8211171561021d5761021c6101c6565b5b80604052505050565b60006102306101a3565b905061023c82826101f5565b919050565b600067ffffffffffffffff82111561025c5761025b6101c6565b5b602082029050602081019050919050565b600080fd5b600080fd5b600067ffffffffffffffff82111561029257610291006101c6565b5b61029b826101b5565b9050602081019050919050565b82818337600083830152505050565b60006102ca6102c584610277565b610226565b9050828152602081018484840111156102e6576102e5610272565b5b6102f18482856102a8565b509392505050565b600082601f83011261030e5761030d6101ad565b5b813561031e8482602086016102b7565b91505092915050565b600061033a61033584610241565b610226565b9050808382526020820190506020840283018581111561035d5761035c61026d565b5b835b8181101561038657806103728882610309565b84526020840193505060208101905061035f565b5050509392505050565b600082601f8301126103a5576103a46101ad565b5b81356103b5848260208601610327565b91505092915050565b6000602082840312156103d4576103d36101a8565b5b600082013567ffffffffffffffff8111156103f2576103f16101ad565b5b6103fe84828501610390565b91505092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b6000600282049050600182168061044e57607f821691505b6020821081141561046257610461610407565b5b50919050565b60008190508160005260206000209050919050565b60006020601f8301049050919050565b600082821b905092915050565b6000600883026104ca7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8261048d565b6104d4868361048d565b95508019841693508086168417925050509392505050565b6000819050919050565b6000819050919050565b600061051b610516610511846104ec565b6104f6565b6104ec565b9050919050565b6000819050919050565b61053583610500565b61054961054182610522565b84845461049a565b825550505050565b600090565b61055e610551565b61056981848461052c565b505050565b5b8181101561058d57610582600082610556565b60018101905061056f565b5050565b601f8211156105d2576105a381610468565b6105ac8461047d565b810160208510156105bb578190505b6105cf6105c78561047d565b83018261056e565b50505b505050565b600082821c905092915050565b60006105f5600019846008026105d7565b1980831691505092915050565b600061060e83836105e4565b9150826002028217905092915050565b60008190508160005260206000209050919050565b60008160001c9050919050565b600081905092915050565b600061065682610625565b915060018210610669576106688161061a565b5b60028204905080915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b60006106af826104ec565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8214156106e2576106e1610675565b5b60018201905091905056fea264697066735822122030d67d6c64d6b336ccc43b6b5c6a6e12fdbefecf95b47a1e41c4e4bc4f4b2b6b64736f6c63430008090033" as const
const MULTICALL3_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11" as const

export interface DeployMulticall3Data {
  forceRedeploy?: boolean
}

export const deployMulticall3Job: Job = {
  async run({ log, job }: JobParams): Promise<void> {
    const data = job.data as DeployMulticall3Data | undefined
    const { forceRedeploy = false } = data || {}

    log.info("Starting Multicall3 deployment check...")

    try {
      // Get chain configuration
      const rpcUrl = serverConfig.CHAIN_RPC_ENDPOINT

      if (!rpcUrl) {
        throw new Error("No RPC endpoint configured")
      }

      // Create clients
      const publicClient = createPublicClient({
        transport: http(rpcUrl),
      })

      const account = privateKeyToAccount(
        serverConfig.SERVER_WALLET_PRIVATE_KEY as Hex,
      )
      const walletClient = createWalletClient({
        account,
        transport: http(rpcUrl),
      })

      log.info(
        `Checking Multicall3 at ${MULTICALL3_ADDRESS} on chain ${serverConfig.CHAIN}`,
      )

      // Check if Multicall3 is already deployed
      if (!forceRedeploy) {
        try {
          const bytecode = await publicClient.getCode({
            address: MULTICALL3_ADDRESS,
          })

          if (bytecode && bytecode !== "0x") {
            log.info("✅ Multicall3 already deployed")
            return
          }
        } catch {
          log.debug("Multicall3 not found, will deploy")
        }
      }

      log.info("🚀 Deploying Multicall3 using deterministic deployment...")

      // Deploy using the deterministic deployment method
      try {
        // First, fund the deployer if needed
        const deployerBalance = await publicClient.getBalance({
          address: MULTICALL3_DEPLOYER,
        })

        const requiredGas = BigInt("247000") // Approximate gas needed
        const gasPrice = await publicClient.getGasPrice()
        const requiredBalance = requiredGas * gasPrice

        if (deployerBalance < requiredBalance) {
          log.info(`Funding deployer with ${requiredBalance} wei...`)
          const fundingTx = await walletClient.sendTransaction({
            to: MULTICALL3_DEPLOYER,
            value: requiredBalance,
            chain: null,
          })

          const fundingReceipt = await publicClient.waitForTransactionReceipt({
            hash: fundingTx,
          })

          if (fundingReceipt.status !== "success") {
            throw new Error("Failed to fund deployer")
          }
        }

        // Deploy the contract using raw transaction
        const deployTx = await publicClient.sendRawTransaction({
          serializedTransaction: MULTICALL3_INIT_CODE as Hex,
        })

        const deployReceipt = await publicClient.waitForTransactionReceipt({
          hash: deployTx,
        })

        if (deployReceipt.status === "success") {
          log.info(
            `✅ Multicall3 deployed successfully at ${MULTICALL3_ADDRESS}`,
          )
          log.info(`Transaction hash: ${deployTx}`)
        } else {
          throw new Error("Deployment transaction failed")
        }
      } catch (error) {
        log.error("Failed to deploy Multicall3:", error)

        // Try alternative deployment method
        log.info("Trying alternative deployment method...")

        // This would be contract creation bytecode + constructor args if any
        // For now, we'll just log that we tried
        log.warn("Alternative deployment not implemented yet")
        throw error
      }
    } catch (error) {
      log.error("Multicall3 deployment failed:", error)
      throw error
    }
  },
}
