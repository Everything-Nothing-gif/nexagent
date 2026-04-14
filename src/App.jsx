import React, { useState, useRef, useEffect, useCallback } from 'react'
import WalletBar from './components/WalletBar'
import ChatMessage, { ThinkingBubble } from './components/ChatMessage'
import { useWallet } from './hooks/useWallet'
import { searchProducts } from './lib/agent'

const CHIPS = ['Sony WH-1000XM5','Samsung 4K TV','MacBook Air M3','Gaming keyboard under $100']
const WELCOME = { role:'agent', text:"Hi! I am NexAgent, your AI commerce assistant. I search across major stores, compare prices in real time, and execute purchases via Algorand smart contracts. Connect your wallet to buy. What are you looking for?", data:null }

export default function App() {
  const wallet = useWallet()
  const [messages, setMessages] = useState([WELCOME])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [txState, setTxState] = useState('idle')
  const [showChips, setShowChips] = useState(true)
  const chatRef = useRef(null)

  useEffect(() => { chatRef.current?.scrollTo({ top:chatRef.current.scrollHeight, behavior:'smooth' }) }, [messages, thinking])

  const send = useCallback(async (text) => {
    const msg = (text||input).trim()
    if (!msg||thinking) return
    setInput(''); setShowChips(false)
    setMessages(prev => [...prev, { role:'user', text:msg }])
    setThinking(true)
    const history = messages.slice(-6).map(m => ({ role:m.role==='agent'?'assistant':'user', content:m.text }))
    try {
      const data = await searchProducts(msg, history)
      setMessages(prev => [...prev, { role:'agent', text:data.message, data }])
    } catch {
      setMessages(prev => [...prev, { role:'agent', text:'Something went wrong. Please try again.', data:null }])
    } finally { setThinking(false) }
  }, [input, thinking, messages])

  function handlePurchase({ product, txId, explorerUrl }) {
    setTxState('active')
    setMessages(prev => [...prev, { role:'agent', text:'Purchase locked in escrow on Algorand Testnet.', txNotice:'TX confirmed: '+txId.slice(0,12)+'... funds held in smart contract until delivery confirmed.', explorerUrl, data:null }])
    setTimeout(() => setTxState('done'), 4000)
    setTimeout(() => setTxState('idle'), 8000)
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100dvh',maxWidth:940,margin:'0 auto',background:'#080810',borderLeft:'0.5px solid rgba(255,255,255,0.06)',borderRight:'0.5px solid rgba(255,255,255,0.06)'}}>
      <WalletBar wallet={wallet}/>
      {wallet.connected&&(
        <div style={{display:'flex',alignItems:'center',gap:12,padding:'8px 22px',background:'rgba(29,158,117,0.04)',borderBottom:'0.5px solid rgba(29,158,117,0.1)',fontSize:10,fontFamily:'DM Mono,monospace'}}>
          <span style={{color:'#2c2c3a'}}>▸</span>
          <span style={{color:'#444460'}}>App ID 758679885</span>
          <span style={{color:'#2c2c3a'}}>·</span>
          <span style={{color:'#444460'}}>escrow contract active</span>
          <div style={{padding:'2px 10px',borderRadius:4,fontSize:9,background:'rgba(29,158,117,0.12)',border:'0.5px solid rgba(29,158,117,0.25)',color:'#1d9e75',animation:txState==='active'?'pulse 1s infinite':'none',marginLeft:4}}>
            {txState==='idle'?'READY':txState==='active'?'PROCESSING...':'CONFIRMED'}
          </div>
          <span style={{marginLeft:'auto',color:'#1d9e75'}}>{wallet.balance.toFixed(3)} ALGO</span>
          {wallet.status?.status==='escrowed'&&<span style={{color:'#e8b84b'}}>· {wallet.status.amount.toFixed(3)} in escrow</span>}
        </div>
      )}
      <div ref={chatRef} style={{flex:1,overflowY:'auto',padding:'24px 22px',display:'flex',flexDirection:'column',gap:20}}>
        {messages.map((msg,i)=><ChatMessage key={i} msg={msg} wallet={wallet} onPurchase={handlePurchase}/>)}
        {thinking&&<ThinkingBubble/>}
      </div>
      {showChips&&(
        <div style={{display:'flex',flexWrap:'wrap',gap:6,padding:'0 22px 16px'}}>
          {CHIPS.map(chip=>(
            <button key={chip} onClick={()=>send(chip)}
              style={{padding:'5px 13px',border:'0.5px solid rgba(255,255,255,0.08)',borderRadius:5,fontSize:11,color:'#55556a',background:'rgba(255,255,255,0.02)',cursor:'pointer',fontFamily:'DM Mono,monospace',letterSpacing:'0.02em',transition:'all 0.15s'}}>
              {chip}
            </button>
          ))}
        </div>
      )}
      <div style={{display:'flex',gap:8,padding:'14px 22px',borderTop:'0.5px solid rgba(255,255,255,0.06)',background:'#080810'}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Search for a product or ask me anything..." disabled={thinking}
          style={{flex:1,padding:'11px 16px',border:'0.5px solid rgba(255,255,255,0.08)',borderRadius:8,fontSize:13,fontFamily:'DM Mono,monospace',background:'rgba(255,255,255,0.02)',color:'#f0f0f8',outline:'none',transition:'border-color 0.2s'}}/>
        <button onClick={()=>send()} disabled={thinking||!input.trim()}
          style={{padding:'11px 24px',background:thinking||!input.trim()?'rgba(255,255,255,0.03)':'#1d9e75',color:thinking||!input.trim()?'#444460':'#04342c',border:thinking||!input.trim()?'0.5px solid rgba(255,255,255,0.06)':'none',borderRadius:8,fontSize:12,fontFamily:'Syne,sans-serif',fontWeight:700,cursor:thinking||!input.trim()?'default':'pointer',letterSpacing:'0.06em',transition:'all 0.2s',whiteSpace:'nowrap'}}>
          {thinking?'...':'SEND'}
        </button>
      </div>
    </div>
  )
}
