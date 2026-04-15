import React, { useState, useEffect } from 'react'
import { createEscrow, confirmDelivery, cancelEscrow, getBuyerStatus, optInToContract } from '../lib/algorand'

const ALGO_RATE = 0.18
function toAlgoPrice(usd) { return (usd / ALGO_RATE).toFixed(0) }

export default function ProductCard({ product, wallet, onPurchase }) {
  const [btnState, setBtnState] = useState('idle')
  // Reset stuck state on mount
  useEffect(() => { setBtnState('idle') }, [])
  const [txId, setTxId] = useState(null)
  const [escrowStatus, setEscrowStatus] = useState(null)
  const { connected, address, refresh } = wallet
  const b = product.isBest

  // On mount and when address changes, check if already in escrow
  useEffect(() => {
    if (!address) return
    getBuyerStatus(address).then(st => {
      if (st.statusCode === 1) setEscrowStatus(st)
      else setEscrowStatus(null)
    })
  }, [address])

  async function handleBuy() {
    if (!connected || !address) { wallet.connect(); return }
    if (btnState !== 'idle') return
    setBtnState('signing')
    try {
      const { isOptedIn } = await getBuyerStatus(address)
      if (!isOptedIn) {
        await optInToContract(address)
        await new Promise(r => setTimeout(r, 1500))
      }
      setBtnState('confirming')
      const result = await createEscrow(address, `ORDER-${Date.now()}`, product.price / ALGO_RATE)
      setTxId(result.txId)
      setBtnState('done')
      const st = await getBuyerStatus(address)
      setEscrowStatus(st)
      await refresh()
      onPurchase?.({ product, txId: result.txId, explorerUrl: result.explorerUrl })
    } catch (e) {
      console.error('handleBuy error:', e)
      setBtnState('error')
      setTimeout(() => setBtnState('idle'), 3000)
    }
  }

  async function handleConfirm() {
    if (btnState !== 'idle') return
    setBtnState('confirming')
    try {
      await confirmDelivery(address)
      const st = await getBuyerStatus(address)
      setEscrowStatus(st.statusCode === 1 ? st : null)
      setTxId(null)
      setBtnState('idle')
      await refresh()
    } catch (e) {
      console.error('handleConfirm error:', e)
      setBtnState('error')
      setTimeout(() => setBtnState('idle'), 3000)
    }
  }

  async function handleCancel() {
    if (btnState !== 'idle') return
    setBtnState('signing')
    try {
      await cancelEscrow(address)
      const st = await getBuyerStatus(address)
      setEscrowStatus(st.statusCode === 1 ? st : null)
      setTxId(null)
      setBtnState('idle')
      await refresh()
    } catch (e) {
      console.error('handleCancel error:', e)
      setBtnState('error')
      setTimeout(() => setBtnState('idle'), 3000)
    }
  }

  const btnLabel = {
    idle:       connected ? 'BUY WITH ALGO' : 'CONNECT WALLET',
    signing:    'Awaiting signature...',
    confirming: 'Confirming on-chain...',
    done:       'Locked in escrow ✓',
    error:      'Failed — retry',
  }[btnState]

  const mono = { fontFamily: 'DM Mono, monospace' }

  return (
    <div style={{
      position: 'relative',
      background: b ? 'linear-gradient(145deg, #0c1f18, #0a1612)' : 'linear-gradient(145deg, #0f0f1a, #0a0a12)',
      border: b ? '1.5px solid rgba(29,158,117,0.55)' : '0.5px solid rgba(255,255,255,0.08)',
      borderRadius: 12, padding: '16px 14px 14px',
      display: 'flex', flexDirection: 'column', gap: 5,
      boxShadow: b
        ? '0 0 30px rgba(29,158,117,0.18), 0 0 60px rgba(29,158,117,0.06), inset 0 0 20px rgba(29,158,117,0.04)'
        : '0 2px 20px rgba(0,0,0,0.4)',
    }}>

      {b && (
        <div style={{
          position: 'absolute', top: -20, right: -20, width: 80, height: 80,
          background: 'radial-gradient(circle, rgba(29,158,117,0.25) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }}/>
      )}

      {b && (
        <div style={{
          position: 'absolute', top: -9, left: 12,
          background: '#1d9e75', boxShadow: '0 0 12px rgba(29,158,117,0.6)',
          color: 'white', fontSize: 9, ...mono,
          padding: '2px 10px', borderRadius: 4,
          letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700,
        }}>BEST DEAL</div>
      )}

      <div style={{fontSize:10, ...mono, color:'#55556a', textTransform:'uppercase', letterSpacing:'0.08em', marginTop: b ? 6 : 0}}>
        {product.store}
      </div>

      <div style={{fontSize:13, fontWeight:600, color:'#c8c8dc', lineHeight:1.3}}>
        {product.name}
      </div>

      <div style={{display:'flex', alignItems:'center', gap:8, marginTop:2, flexWrap:'wrap'}}>
        <span style={{
          fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em',
          color: b ? '#1d9e75' : '#f0f0f8',
          textShadow: b ? '0 0 20px rgba(29,158,117,0.7), 0 0 40px rgba(29,158,117,0.3)' : 'none',
        }}>${product.price.toFixed(2)}</span>
        <span style={{fontSize:11, ...mono, color: b ? 'rgba(29,158,117,0.85)' : '#3a3a52'}}>
          ≈ {toAlgoPrice(product.price)} ALGO
        </span>
      </div>

      <div style={{fontSize:11, ...mono, color: b ? '#e8b84b' : '#55556a', lineHeight:1.6}}>
        {'★'.repeat(Math.round(product.rating))}{'☆'.repeat(5-Math.round(product.rating))}
        {' '}<span style={{color: b ? '#9090a8' : '#45455a'}}>{product.rating} · {product.reviews.toLocaleString()} reviews</span>
      </div>

      <div style={{fontSize:11, ...mono, color:'#45455a', lineHeight:1.6}}>
        <span style={{color: product.inStock ? (b ? '#1d9e75' : '#3a3a52') : '#45455a'}}>
          {product.inStock ? '●' : '○'}
        </span>
        {' '}{product.inStock ? 'In stock' : 'Out of stock'} · {product.delivery}
      </div>

      {/* Escrow active state */}
      {escrowStatus?.statusCode === 1 ? (
        <div style={{marginTop:8, display:'flex', flexDirection:'column', gap:6}}>
          <div style={{
            padding: '8px 10px', borderRadius: 7,
            background: 'rgba(29,158,117,0.08)',
            border: '0.5px solid rgba(29,158,117,0.3)',
            fontSize: 10, ...mono, color: '#1d9e75', textAlign: 'center',
          }}>
            ⟁ {(escrowStatus.amount).toFixed(3)} ALGO held in escrow
          </div>

          <button onClick={handleConfirm} disabled={btnState !== 'idle'} style={{
            padding: '9px 0', width: '100%',
            background: '#1d9e75', color: 'white',
            border: 'none', borderRadius: 7,
            fontSize: 11, ...mono, fontWeight: 700,
            cursor: btnState === 'idle' ? 'pointer' : 'default',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            boxShadow: '0 0 16px rgba(29,158,117,0.45)',
            opacity: btnState !== 'idle' ? 0.6 : 1,
          }}>
            {btnState === 'confirming' ? '⟳ Confirming...' : 'CONFIRM DELIVERY'}
          </button>

          <button onClick={handleCancel} disabled={btnState !== 'idle'} style={{
            padding: '9px 0', width: '100%',
            background: 'transparent', color: '#e05252',
            border: '0.5px solid rgba(224,82,82,0.35)', borderRadius: 7,
            fontSize: 11, ...mono, fontWeight: 700,
            cursor: btnState === 'idle' ? 'pointer' : 'default',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            opacity: btnState !== 'idle' ? 0.6 : 1,
          }}>
            {btnState === 'signing' ? '⟳ Cancelling...' : 'CANCEL & REFUND'}
          </button>
        </div>
      ) : (
        <button onClick={handleBuy} disabled={btnState !== 'idle'} style={{
          marginTop: 8, padding: '9px 0', width: '100%',
          background: btnState === 'idle'
            ? (b ? '#1d9e75' : 'transparent')
            : btnState === 'done' ? '#1d9e75'
            : btnState === 'error' ? 'rgba(224,82,82,0.1)'
            : 'rgba(255,255,255,0.03)',
          color: btnState === 'idle'
            ? (b ? 'white' : '#1d9e75')
            : btnState === 'done' ? 'white'
            : btnState === 'error' ? '#e05252'
            : '#55556a',
          border: b && btnState === 'idle' ? 'none' : '0.5px solid rgba(29,158,117,0.35)',
          borderRadius: 7, fontSize: 11, ...mono, fontWeight: 700,
          cursor: btnState === 'idle' ? 'pointer' : 'default',
          letterSpacing: '0.08em', textTransform: 'uppercase',
          boxShadow: b && btnState === 'idle' ? '0 0 16px rgba(29,158,117,0.45)' : 'none',
          transition: 'all 0.2s',
        }}>
          {(btnState === 'signing' || btnState === 'confirming') && (
            <span style={{marginRight:6, display:'inline-block', animation:'spin 1s linear infinite'}}>⟳</span>
          )}
          {btnLabel}
        </button>
      )}

      {txId && (
        <a href={`https://testnet.algoexplorer.io/tx/${txId}`} target="_blank" rel="noopener noreferrer"
          style={{fontSize:10, ...mono, color:'#1d9e75', textDecoration:'none', textAlign:'center', marginTop:4}}>
          View on explorer ↗
        </a>
      )}
    </div>
  )
}
