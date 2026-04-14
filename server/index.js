import express from 'express'
import cors from 'cors'
import fetch from 'node-fetch'

const app = express()
app.use(cors({ origin: '*' }))
app.use(express.json())

const SERPAPI_KEY = process.env.SERPAPI_KEY

app.get('/api/search', async (req, res) => {
  const { q } = req.query
  if (!q) return res.status(400).json({ error: 'Missing query' })

  try {
    const url = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(q)}&api_key=${SERPAPI_KEY}&num=10`
    const response = await fetch(url)
    const data = await response.json()
    const raw = data.shopping_results || []

    const seen = new Set()
    const products = []
    for (const item of raw) {
      const store = item.source
      if (!store || seen.has(store)) continue
      seen.add(store)
      products.push({
        store,
        name: item.title,
        price: parseFloat(item.price?.replace(/[^0-9.]/g, '')) || 0,
        rating: item.rating || 4.0,
        reviews: item.reviews || 0,
        inStock: true,
        delivery: item.delivery || 'Check site',
        link: item.link || '#',
        thumbnail: item.thumbnail || null,
        isBest: false,
      })
      if (products.length === 4) break
    }

    if (products.length > 0) {
      const best = products.reduce((a, b) => a.price < b.price ? a : b)
      best.isBest = true
      const prices = products.map(p => p.price)
      const savings = parseFloat((Math.max(...prices) - Math.min(...prices)).toFixed(2))
      return res.json({
        message: `Found ${products.length} results for "${q}" across major stores — sorted by value.`,
        isProductSearch: true,
        products,
        savings,
        recommendation: `${best.store} offers the best price at $${best.price.toFixed(2)}`,
      })
    }

    res.json({ message: `No results found for "${q}".`, isProductSearch: false, products: [], savings: 0, recommendation: '' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Search failed' })
  }
})

app.listen(3001, () => console.log('Server running on http://localhost:3001'))
