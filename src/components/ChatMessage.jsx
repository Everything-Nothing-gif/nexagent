import React from 'react'
import ProductCard from './ProductCard'
export function ThinkingBubble() {
  return (
    <div style={{display:'flex',gap:12,alignItems:'flex-start',animation:'fadeUp 0.25s ease'}}>
      <div style={{width:32,height:32,borderRadius:'50%',background:'#0f1e1a',border:'1px solid rgba(29,158,117,0.4)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#1d9e75',flexShrink:0,fontFamily:'DM Mono,monospace'}}>N</div>
      <div style={{padding:'13px 16px',borderRadius:'2px 14px 14px 14px',background:'rgba(255,255,255,0.03)',border:'0.5px solid rgba(255,255,255,0.08)'}}>
        <div style={{display:'flex',gap:5,alignItems:'center'}}>
          {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:'50%',background:'#444460',animation:'bounce 1s '+i*0.15+'s infinite'}}/>)}
        </div>
      </div>
    </div>
  )
}
export default function ChatMessage({ msg, wallet, onPurchase }) {
  const isAgent = msg.role==='agent'
  const hasProducts = isAgent&&msg.data?.products?.length>0
  return (
    <div style={{display:'flex',gap:12,alignItems:'flex-start',flexDirection:isAgent?'row':'row-reverse',animation:'fadeUp 0.25s ease'}}>
      <div style={{width:32,height:32,borderRadius:'50%',background:isAgent?'#0f1e1a':'#1a1428',border:isAgent?'1px solid rgba(29,158,117,0.4)':'1px solid rgba(124,106,247,0.35)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:isAgent?'#1d9e75':'#7c6af7',flexShrink:0,fontFamily:'DM Mono,monospace'}}>
        {isAgent?'N':'U'}
      </div>
      <div style={{maxWidth:'88%',padding:'13px 16px',borderRadius:isAgent?'2px 14px 14px 14px':'14px 2px 14px 14px',background:isAgent?'rgba(255,255,255,0.03)':'rgba(124,106,247,0.1)',border:isAgent?'0.5px solid rgba(255,255,255,0.08)':'0.5px solid rgba(124,106,247,0.25)',fontSize:14,color:isAgent?'#c8c8d8':'#e0e0f0',lineHeight:1.7}}>
        <div>{msg.text}</div>
        {hasProducts&&(
          <>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:10,marginTop:14}}>
              {msg.data.products.map((p,i)=><ProductCard key={i} product={p} wallet={wallet} onPurchase={onPurchase}/>)}
            </div>
            {msg.data.savings>0&&(
              <div style={{marginTop:12,padding:'10px 14px',background:'rgba(29,158,117,0.06)',borderLeft:'2px solid #1d9e75',borderRadius:'0 8px 8px 0',fontSize:11,fontFamily:'DM Mono,monospace',color:'#5dcaa5',lineHeight:1.6}}>
                save ${msg.data.savings.toFixed(2)} vs highest · {msg.data.recommendation}
              </div>
            )}
          </>
        )}
        {msg.txNotice&&(
          <div style={{marginTop:10,padding:'10px 14px',background:'rgba(29,158,117,0.06)',borderLeft:'2px solid #1d9e75',borderRadius:'0 8px 8px 0',fontSize:11,fontFamily:'DM Mono,monospace',color:'#5dcaa5',lineHeight:1.7}}>
            {msg.txNotice}
            {msg.explorerUrl&&<><br/><a href={msg.explorerUrl} target="_blank" rel="noopener noreferrer" style={{color:'#7c6af7'}}>view tx ↗</a></>}
          </div>
        )}
      </div>
    </div>
  )
}
