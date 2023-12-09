import Ably from 'ably'
import { Mailer } from '../mailer'
import { createLog } from '../logging'
import { serverConfig } from '../../config/server'
import { privateKeyToAccount } from 'viem/accounts'
import { PubSubMessageType } from '@/shared/pubsub'
import { User, connectDb, createNotification } from '../db'
import { createPublicClient, createWalletClient, http } from 'viem'

export interface BootstrapParams {
  processName: string
}

export interface BootstrappedApp {
  mailer?: Mailer,
  ably?: Ably.Rest & { notifyUser: (wallet: string, type: PubSubMessageType, data?: object) => void },
  db: ReturnType<typeof connectDb>
  log: ReturnType<typeof createLog>
  chainClient: ReturnType<typeof createPublicClient>
  serverWallet: ReturnType<typeof createWalletClient>
  notifyUser: (id: User, data: object) => Promise<void>
}

export const bootstrap = ({ processName }: BootstrapParams): BootstrappedApp => {
  const log = createLog({
    name: processName,
    logLevel: serverConfig.WORKER_LOG_LEVEL,
  })

  let db: ReturnType<typeof connectDb>
  try {
    db = connectDb({ config: serverConfig, log })
  } catch (err) {
    log.error(`Error connecting to db: ${err}`)
    throw err
  }

  const chainClient = createPublicClient({ 
    transport: http(serverConfig.CHAIN_RPC_ENDPOINT, { batch: true })
  })

  const serverWallet = createWalletClient({
    transport: http(serverConfig.CHAIN_RPC_ENDPOINT, { batch: true }),
    account: privateKeyToAccount(serverConfig.SERVER_WALLET_PRIVATE_KEY as `0x${string}`),
  })

  let ably: any
  if (serverConfig.ABLY_API_KEY) {
    ably = new Ably.Rest({ key: serverConfig.ABLY_API_KEY })
    ably.notifyUser = (wallet: string, type: PubSubMessageType, data?: object) => {
      ;(ably as Ably.Rest).channels.get(wallet.toLowerCase()).publish('msg', { type, data }, err => {
        if (err) {
          log.error(`Error publishing notification to Ably for user ${wallet}: ${err}`)
        }
      })
    }
  }

  let mailer: Mailer | undefined
  if (serverConfig.MAILER_API_KEY && serverConfig.MAILER_FROM_ADDRESS) {
    mailer = new Mailer({
      log, 
      apiKey: serverConfig.MAILER_API_KEY, 
      fromAddress: serverConfig.MAILER_FROM_ADDRESS
    })
  }

  const app = { 
    db, 
    log, 
    chainClient, 
    serverWallet, 
    ably, 
    mailer,
    notifyUser: async (user: User, data: object) => {
      await createNotification(db, user.id, data)
      ably?.notifyUser(user.wallet, PubSubMessageType.NEW_NOTIFICATIONS)
    }
  }

  return app
}



  
