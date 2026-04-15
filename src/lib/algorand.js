import algosdk from 'algosdk'
import { PeraWalletConnect } from '@perawallet/connect'

//Config
const APP_ID      = Number(import.meta.env.VITE_APP_ID      || 0)
const APP_ADDRESS = import.meta.env.VITE_APP_ADDRESS         || ''
const ALGOD_TOKEN  = import.meta.env.VITE_ALGOD_TOKEN        || 'a'.repeat(64)
const ALGOD_SERVER = import.meta.env.VITE_ALGOD_SERVER       || 'https://testnet-api.algonode.cloud'
const ALGOD_PORT   = import.meta.env.VITE_ALGOD_PORT         || ''

export const algodClient = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT)

export const peraWallet = new PeraWalletConnect({
  shouldShowSignTxnToast: true,
  chainId: 416002, // Algorand Testnet
})

//Wallet 
export async function connectWallet() {
  const accounts = await peraWallet.connect()

  if (accounts && accounts.length > 0) {
    peraWallet.connector?.on('disconnect', () => peraWallet.disconnect())
    return accounts[0]
  }

  // QR scan flow: accounts arrive late via connector event
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Wallet connection timed out')), 120000)

    peraWallet.connector?.on('connect', (error, payload) => {
      clearTimeout(timeout)
      if (error) return reject(error)
      const addrs = payload?.params?.[0]?.accounts
      if (addrs && addrs.length > 0) {
        peraWallet.connector?.on('disconnect', () => peraWallet.disconnect())
        resolve(addrs[0])
      } else {
        reject(new Error('No accounts in connect payload'))
      }
    })
  })
}

export async function disconnectWallet() {
  await peraWallet.disconnect()
}

export async function reconnectWallet() {
  try {
    const accounts = await peraWallet.reconnectSession()
    return accounts[0] || null
  } catch {
    return null
  }
}

// Helpers 
async function getSP(fee = 1000) {
  const sp = await algodClient.getTransactionParams().do()
  sp.fee = fee
  sp.flatFee = true
  return sp
}

async function waitConfirm(txId) {
  return algosdk.waitForConfirmation(algodClient, txId, 4)
}

//Contract calls
export async function optInToContract(address) {
  console.log('DEBUG optIn:', { address, APP_ID, APP_ADDRESS })
  const sp = await getSP()
  const txn = algosdk.makeApplicationOptInTxnFromObject({
    suggestedParams: sp,
    sender: address,
    appIndex: Number(APP_ID),
  })
  const signed = await peraWallet.signTransaction([[{ txn }]])
  const { txId } = await algodClient.sendRawTransaction(signed).do()
  await waitConfirm(txId)
  return txId
}

export async function createEscrow(address, orderId, amountAlgo) {
  console.log('DEBUG createEscrow:', { address, orderId, amountAlgo, APP_ID, APP_ADDRESS })
  const micro = Math.round(amountAlgo * 1_000_000)
  const sp    = await getSP(1000)

  const appTxn = algosdk.makeApplicationNoOpTxnFromObject({
    suggestedParams: sp,
    sender: address,
    appIndex: Number(APP_ID),
    appArgs: [
      new TextEncoder().encode('create_escrow'),
      new TextEncoder().encode(orderId),
    ],
  })
  const payTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    suggestedParams: sp,
    sender: address,
    receiver: APP_ADDRESS,
    amount: micro,
  })

  algosdk.assignGroupID([appTxn, payTxn])

  const signed = await peraWallet.signTransaction([[{ txn: appTxn }, { txn: payTxn }]])
  const { txId } = await algodClient.sendRawTransaction(signed).do()
  await waitConfirm(txId)

  return {
    txId,
    explorerUrl: `https://testnet.algoexplorer.io/tx/${txId}`,
    orderId,
    amountMicro: micro,
  }
}

export async function confirmDelivery(agentAddress, buyerAddress) {
  const sp  = await getSP(2000)
  const txn = algosdk.makeApplicationNoOpTxnFromObject({
    suggestedParams: sp,
    sender: agentAddress,
    appIndex: Number(APP_ID),
    appArgs: [new TextEncoder().encode('confirm_delivery')],
    accounts: [buyerAddress],
  })
  const signed = await peraWallet.signTransaction([[{ txn }]])
  const { txId } = await algodClient.sendRawTransaction(signed).do()
  await waitConfirm(txId)
  return txId
}

export async function cancelEscrow(address) {
  const sp  = await getSP(2000)
  const txn = algosdk.makeApplicationNoOpTxnFromObject({
    suggestedParams: sp,
    sender: address,
    appIndex: Number(APP_ID),
    appArgs: [new TextEncoder().encode('cancel_escrow')],
  })
  const signed = await peraWallet.signTransaction([[{ txn }]])
  const { txId } = await algodClient.sendRawTransaction(signed).do()
  await waitConfirm(txId)
  return txId
}

//Read state
export const STATUS = ['empty', 'escrowed', 'released', 'refunded']

export async function getBuyerStatus(address) {
  try {
    const info = await algodClient.accountApplicationInformation(address, APP_ID).do()
    const ls   = {}
    for (const kv of info['app-local-state']?.['key-value'] || []) {
      const key = atob(kv.key)
      ls[key] = kv.value.uint ?? atob(kv.value.bytes ?? '')
    }
    return {
      isOptedIn:  true,
      statusCode: ls.status ?? 0,
      status:     STATUS[ls.status ?? 0],
      amount:     (ls.amount ?? 0) / 1_000_000,
      orderId:    ls.order_id ?? '',
      lockedAt:   ls.locked_at ?? 0,
    }
  } catch {
    return { isOptedIn: false, status: 'not_opted_in', statusCode: -1, amount: 0, orderId: '', lockedAt: 0 }
  }
}

export async function getBalance(address) {
  try {
    const url = `https://testnet-api.algonode.cloud/v2/accounts/${address}`
    const res  = await fetch(url)
    const data = await res.json()
    return (data.amount ?? 0) / 1_000_000
  } catch {
    return 0
  }
}

export async function getContractStats() {
  try {
    const info = await algodClient.getApplicationByID(APP_ID).do()
    const gs   = {}
    for (const kv of info.params['global-state'] || []) {
      const key = atob(kv.key)
      gs[key] = kv.value.uint ?? atob(kv.value.bytes ?? '')
    }
    return {
      totalOrders: gs.total_orders ?? 0,
      totalVolume: (gs.total_volume ?? 0) / 1_000_000,
    }
  } catch {
    return { totalOrders: 0, totalVolume: 0 }
  }
}

export const truncate = (addr) =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : ''

export const toAlgo = (micro) => (micro / 1_000_000).toFixed(3)
// cache bust Wed Apr 15 19:08:56 IST 2026
