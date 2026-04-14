import { useState, useEffect, useCallback } from 'react'
import {
  connectWallet,
  disconnectWallet,
  reconnectWallet,
  getBuyerStatus,
  getBalance,
  optInToContract,
  truncate,
} from '../lib/algorand'

export function useWallet() {
  const [address,   setAddress]   = useState(null)
  const [balance,   setBalance]   = useState(0)
  const [status,    setStatus]    = useState(null)   // buyer on-chain status
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)
  const [connected, setConnected] = useState(false)

  // Try to restore session on mount
  useEffect(() => {
    reconnectWallet().then((addr) => {
      if (addr) hydrateWallet(addr)
    })
  }, [])

  async function hydrateWallet(addr) {
    setAddress(addr)
    setConnected(true)
    const [bal, st] = await Promise.all([getBalance(addr), getBuyerStatus(addr)])
    setBalance(bal)
    setStatus(st)
  }

  const connect = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const addr = await connectWallet()
      await hydrateWallet(addr)
    } catch (e) {
      setError(e.message || 'Failed to connect wallet')
    } finally {
      setLoading(false)
    }
  }, [])

  const disconnect = useCallback(async () => {
    await disconnectWallet()
    setAddress(null)
    setConnected(false)
    setBalance(0)
    setStatus(null)
  }, [])

  const ensureOptedIn = useCallback(async () => {
    if (!address) return false
    if (status?.isOptedIn) return true
    setLoading(true)
    try {
      await optInToContract(address)
      const st = await getBuyerStatus(address)
      setStatus(st)
      return true
    } catch (e) {
      setError(e.message || 'Opt-in failed')
      return false
    } finally {
      setLoading(false)
    }
  }, [address, status])

  const refresh = useCallback(async () => {
    if (!address) return
    const [bal, st] = await Promise.all([getBalance(address), getBuyerStatus(address)])
    setBalance(bal)
    setStatus(st)
  }, [address])

  return {
    address,
    truncatedAddress: truncate(address),
    balance,
    status,
    loading,
    error,
    connected,
    connect,
    disconnect,
    ensureOptedIn,
    refresh,
  }
}
