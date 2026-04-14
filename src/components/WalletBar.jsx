import React from 'react'

export default function WalletBar({ wallet }) {
  const { connected, truncatedAddress, balance, loading, connect, disconnect } = wallet
  return (
    <div style={{position:'relative'}}>
      {/* Ambient glow — sits behind everything */}
      <div style={{
        position: 'absolute',
        top: 0, left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 200,
        background: 'radial-gradient(ellipse at 50% 0%, rgba(29,158,117,0.35) 0%, rgba(29,158,117,0.1) 40%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0,
      }}/>

      <div style={{
        position: 'relative', zIndex: 1,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'14px 20px',
        borderBottom:'0.5px solid rgba(29,158,117,0.2)',
        background:'transparent',
      }}>
        <div style={{display:'flex', alignItems:'center', gap:12}}>
          <div style={{
            width:34, height:34,
            background:'linear-gradient(135deg, #1d9e75, #0f6e56)',
            borderRadius:10,
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 0 20px rgba(29,158,117,0.6)',
          }}>
            <div style={{
              width:8, height:8, borderRadius:'50%',
              background:'white',
              boxShadow:'0 0 8px rgba(255,255,255,0.9)',
              animation:'pulse 2s ease-in-out infinite',
            }}/>
          </div>
          <div>
            <div style={{
              fontSize:17, fontWeight:700, letterSpacing:'-0.03em', color:'#f0f0f8',
              textShadow:'0 0 24px rgba(29,158,117,0.6)',
            }}>NexAgent</div>
            <div style={{fontSize:10, fontFamily:'DM Mono, monospace', color:'#55556a', letterSpacing:'0.08em', textTransform:'uppercase'}}>
              AI Commerce · Algorand
            </div>
          </div>
        </div>

        <div style={{display:'flex', alignItems:'center', gap:10}}>
          <div style={{
            padding:'4px 12px',
            background:'rgba(29,158,117,0.08)',
            border:'0.5px solid rgba(29,158,117,0.3)',
            borderRadius:20, fontSize:11,
            fontFamily:'DM Mono, monospace', color:'#1d9e75',
          }}>Testnet</div>

          <button
            onClick={connected ? disconnect : connect}
            disabled={loading}
            style={{
              display:'flex', alignItems:'center', gap:8,
              padding:'8px 16px',
              border:'0.5px solid rgba(255,255,255,0.1)',
              borderRadius:20,
              background: connected ? 'rgba(29,158,117,0.1)' : 'rgba(255,255,255,0.04)',
              cursor:'pointer', fontSize:13,
              fontFamily:'Syne, sans-serif',
              color: connected ? '#f0f0f8' : '#9090a8',
            }}>
            <div style={{
              width:7, height:7, borderRadius:'50%',
              background: connected ? '#1d9e75' : '#55556a',
              boxShadow: connected ? '0 0 8px rgba(29,158,117,0.9)' : 'none',
            }}/>
            {loading ? 'Connecting...' : connected ? truncatedAddress : 'Connect Wallet'}
            {connected && (
              <span style={{fontSize:11, fontFamily:'DM Mono, monospace', color:'#1d9e75', marginLeft:4}}>
                {balance.toFixed(2)} ALGO
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
