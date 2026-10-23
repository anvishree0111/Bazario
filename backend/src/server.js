import express from 'express'
import cors from 'cors'
import './config.js'
import authRoutes from './routes/auth.js'
import buyerRoutes from './routes/buyer.js'
import sellerRoutes from './routes/seller.js'
import productsRoutes from './routes/products.js'

const app = express()
const PORT = Number(process.env.PORT) || 5000

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL
].filter(Boolean)

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true
  })
)
app.use(express.json({ limit: '256kb' }))

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'bazario-api' })
})

app.use('/api/auth', authRoutes)
app.use('/api/buyer', buyerRoutes)
app.use('/api/seller', sellerRoutes)
app.use('/api/products', productsRoutes)

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`Bazario API listening on http://localhost:${PORT}`)
})
