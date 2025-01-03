import { serverConfig } from '@/config/server'
import './instrumentation'

import { jobs } from './generated/mappings'
import { Chain } from 'viem'
import { JobParams } from './types'
import * as chains from 'viem/chains'
import { ethToWei } from '@/shared/number'
import { getMulticall3Info } from '@/shared/contracts'
import { BootstrappedApp, bootstrap } from '@/backend/bootstrap'
import { ONE_MINUTE, ONE_SECOND, dateBefore } from '@/shared/date'
import {
  scheduleCronJob,
  getNextPendingJob,
  getTotalPendingJobs,
  markJobAsFailed,
  markJobAsStarted,
  markJobAsSucceeded,
  rescheduleCronJob,
  rescheduleFailedJob,
} from '@/backend/db'

const setupDefaultJobs = async (app: BootstrappedApp) => {
  await app.startSpan(`setupDefaultJobs`, async () => {
    // remove old jobs
    await scheduleCronJob(
      app,
      {
        type: 'removeOldWorkerJobs',
        userId: 0,
        autoRescheduleOnFailure: true,
        autoRescheduleOnFailureDelay: ONE_MINUTE,
      },
      '0 * * * * *' // every minute
    )

    // poll for new blocks
    await scheduleCronJob(
      app,
      {
        type: 'watchChain',
        userId: 0,
        autoRescheduleOnFailure: true,
        autoRescheduleOnFailureDelay: 10 * ONE_SECOND, // give a bit more time before retrying,
        },
        '*/3 * * * * *' // every 3 seconds
    )
  })
}

const deployMulticall3 = async ({ startSpan, chainClient, serverWallet, log }: BootstrappedApp) => {
  await startSpan(`deployMulticall3`, async () => {
    const multicall3Params = getMulticall3Info()

    try {
      let code = await chainClient.getBytecode({ address: multicall3Params.contract as `0x${string}` })
  
      if (code && code.length > 5) {
        log.info(`Multicall3 already deployed.`)
      } else {
        log.info(`Multicall3 not deployed, deploying now...`)
  
        const chainId = await chainClient.getChainId()
        const chain = Object.values(chains).find(c => c.id === chainId) as Chain
  
        const hash = await serverWallet.sendTransaction({
          account: serverWallet.account!,
          chain,
          to: multicall3Params.sender as `0x${string}`,
          value: BigInt(ethToWei(multicall3Params.eth).toString()),
        })
  
        await chainClient.waitForTransactionReceipt({ hash })
  
        const hash2 = await chainClient.sendRawTransaction({
          serializedTransaction: multicall3Params.signedDeploymentTx as `0x${string}`,
        })
  
        await chainClient.waitForTransactionReceipt({ hash: hash2 })
  
        code = await chainClient.getBytecode({ address: multicall3Params.contract as `0x${string}` })
  
        if (code && code.length > 5) {
          log.info(`Multicall3 deployed successfully.`)
        } else {
          throw new Error(`Multicall3 deployment failed.`)
        }
      }
    } catch (err) {
      log.error(`Error checking Multicall3 deployment: ${err}`)
      throw err
    }
  })
}

const handleJob = async (params: JobParams): Promise<object | undefined> => {
  return await params.app.startSpan(`handleJob`, async () => {
    if (!jobs[params.job.type]) {
      throw new Error(`Unknown job type: ${params.job.type}`)
    } else {
      return await jobs[params.job.type].run(params)
    }
  })
}

const main = async () => {
  const app = bootstrap({ processName: 'worker', logLevel: serverConfig.WORKER_LOG_LEVEL })
  const { log } = app

  await app.startSpan(`setup`, async () => { 
    await deployMulticall3(app)
    await setupDefaultJobs(app)
  })

  while (true) {
    log.debug('Start next cycle')

    log.debug('Count pending jobs')

    // get total pending jobs
    const pendingJobs = await getTotalPendingJobs(app)

    log.debug(`Pending jobs: ${pendingJobs}`)

    if (pendingJobs) {
      log.debug('Fetch next job')

      const job = await getNextPendingJob(app)

      if (job) {
        if (dateBefore(job.due, Date.now())) {
          await app.startSpan(`job[${job.id} - ${job.type}]`, async () => {
            const joblog = log.create(`job[${job.id} - ${job.type}]${job.cronSchedule ? ' (cron)' : ''}`)

            joblog.debug(`Executing for [user ${job.userId}]`)
            joblog.debug(job.data)
  
            await markJobAsStarted(app, job.id)
  
            try {
              const result = await handleJob({ app, log: joblog, job })
  
              await markJobAsSucceeded(app, job.id, result)
  
              joblog.debug(`...Finished executing job #${job.id}`)
  
              if (job.cronSchedule) {
                joblog.debug(`Scheduling next cron job`)
  
                const newJob = await rescheduleCronJob(app, job)
  
                joblog.debug(`...rescheduled as job #${newJob.id} due at ${newJob.due}`)
              }
            } catch (err: any) {
              joblog.error(`...Error executing job`)
              joblog.error(err)
  
              await markJobAsFailed(app, job.id, { error: err.message })
  
              // reschedule?
              if (job.autoRescheduleOnFailure) {
                joblog.debug(`Rescheduling failed job`)
  
                const newJob = await rescheduleFailedJob(app, job)
  
                joblog.debug(`...rescheduled as job #${newJob.id} due at ${newJob.due}`)
              }
            }
            })
        } else {
          log.debug(`Next job is #${job.id} - ${job.type} for user ${job.userId} due at ${job.due}`)
        }
      }
    }

    // wait before next loop
    await new Promise(resolve => setTimeout(resolve, ONE_SECOND))
  }
}

main().catch((err: any) => {
  console.error(err)
  process.exit(1)
})

