const BACKEND = import.meta.env.VITE_BACKEND || 'http://localhost:3001'

function isProductQuery(msg) {
  const keywords = ['find','search','buy','price','cheap','best','compare','deal','shop','looking for','need a','get me','show me']
  const lower = msg.toLowerCase()
  return keywords.some(k => lower.includes(k)) || /\$\d+/.test(msg)
}

function fallbackReply(msg) {
  const lower = msg.toLowerCase()
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey'))
    return "Hi! I'm NexAgent. Search for any product and I'll find you the best deals across major stores."
  if (lower.includes('help'))
    return "Just type a product name like 'Sony WH-1000XM5' or 'gaming laptop under $1000' and I'll compare prices across stores."
  if (lower.includes('algo') || lower.includes('wallet') || lower.includes('blockchain'))
    return "Connect your Pera Wallet to buy any product directly via Algorand smart contracts. Funds are held in escrow until delivery is confirmed."
  return "Try searching for a product! For example: 'Find me the best price for AirPods Pro'."
}

export async function searchProducts(userMessage, history = []) {
  if (isProductQuery(userMessage)) {
    try {
      const res = await fetch(`${BACKEND}/api/search?q=${encodeURIComponent(userMessage)}`)
      const data = await res.json()
      if (data.isProductSearch && data.products.length > 0) return data
    } catch (err) {
      console.error('Search error:', err)
      return { message: 'Search service unavailable. Make sure the backend server is running.', isProductSearch: false, products: [], savings: 0, recommendation: '' }
    }
  }

  return {
    message: fallbackReply(userMessage),
    isProductSearch: false,
    products: [],
    savings: 0,
    recommendation: ''
  }
}
