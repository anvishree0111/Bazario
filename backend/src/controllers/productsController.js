import * as productModel from '../models/productModel.js'

// GET /api/products
// GET /api/products?category=Electronics
// GET /api/products?categories=Electronics,Fashion
// GET /api/products?search=earbuds
// GET /api/products?sellerId=1
// Public, unauthenticated: this is the real buyer catalogue, backed entirely
// by MySQL. No mock/demo data is ever mixed into this response.
export async function listProducts(req, res) {
  try {
    const { category, categories, search, sellerId } = req.query

    let cats = null
    if (categories) {
      cats = String(categories)
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)
    } else if (category && category !== 'all') {
      cats = [category]
    }

    const products = await productModel.listPublicProducts({
      categories: cats,
      search: search ? String(search) : undefined,
      sellerId: sellerId ? Number(sellerId) : undefined
    })

    res.json(products)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
}

// GET /api/products/:id
export async function getProduct(req, res) {
  try {
    const id = Number(req.params.id)
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid product id' })
    const product = await productModel.getPublicProductById(id)
    if (!product) return res.status(404).json({ error: 'Product not found' })
    res.json(product)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
}
