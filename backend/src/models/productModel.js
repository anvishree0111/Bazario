import pool from '../db.js'

function parseImageUrls(row) {
  if (!row.image_urls) return []
  if (typeof row.image_urls === 'string') {
    try {
      return JSON.parse(row.image_urls)
    } catch {
      return []
    }
  }
  return row.image_urls
}

export function rowToProduct(row) {
  if (!row) return null
  const urls = parseImageUrls(row)
  const image = urls[0] || null
  return {
    id: row.id,
    seller_id: row.seller_id,
    name: row.name,
    category: row.category,
    price: row.price,
    description: row.description || '',
    image_urls: urls,
    image,
    created_at: row.created_at,
    updated_at: row.updated_at
  }
}

export async function listProductsBySeller(sellerId) {
  const [rows] = await pool.query(
    'SELECT * FROM products WHERE seller_id = ? ORDER BY id DESC',
    [sellerId]
  )
  return rows.map(rowToProduct)
}

export async function getProductById(id) {
  const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [id])
  return rows[0] ? rowToProduct(rows[0]) : null
}

export async function createProduct({ sellerId, name, category, price, description, imageUrls }) {
  const urlsJson = imageUrls != null ? JSON.stringify(imageUrls) : null
  const [r] = await pool.query(
    'INSERT INTO products (seller_id, name, category, price, description, image_urls) VALUES (?, ?, ?, ?, ?, ?)',
    [sellerId, name, category, price, description || '', urlsJson]
  )
  return r.insertId
}

export async function updateProduct(productId, sellerId, { name, category, price, description, imageUrls }) {
  const fields = []
  const vals = []
  if (name != null) {
    fields.push('name = ?')
    vals.push(name)
  }
  if (category != null) {
    fields.push('category = ?')
    vals.push(category)
  }
  if (price != null) {
    fields.push('price = ?')
    vals.push(price)
  }
  if (description != null) {
    fields.push('description = ?')
    vals.push(description)
  }
  if (imageUrls != null) {
    fields.push('image_urls = ?')
    vals.push(JSON.stringify(imageUrls))
  }
  if (!fields.length) return false
  vals.push(productId, sellerId)
  const [r] = await pool.query(
    `UPDATE products SET ${fields.join(', ')} WHERE id = ? AND seller_id = ?`,
    vals
  )
  return r.affectedRows > 0
}

export async function deleteProduct(productId, sellerId) {
  const [r] = await pool.query('DELETE FROM products WHERE id = ? AND seller_id = ?', [productId, sellerId])
  return r.affectedRows > 0
}

// ---- Public (buyer-facing) catalogue queries ----
// These join the seller/shop so every product returned to a buyer carries
// its real seller/shop information straight from MySQL.

function rowToPublicProduct(row) {
  const p = rowToProduct(row)
  return {
    ...p,
    sellerId: row.seller_id,
    shopName: row.shop_name,
    ownerName: row.owner_name
  }
}

export async function listPublicProducts({ categories, search, sellerId } = {}) {
  const clauses = []
  const vals = []

  if (Array.isArray(categories) && categories.length) {
    clauses.push(`p.category IN (${categories.map(() => '?').join(',')})`)
    vals.push(...categories)
  }
  if (search) {
    clauses.push('p.name LIKE ?')
    vals.push(`%${search}%`)
  }
  if (sellerId) {
    clauses.push('p.seller_id = ?')
    vals.push(sellerId)
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const [rows] = await pool.query(
    `SELECT p.*, s.shop_name, s.owner_name
     FROM products p
     JOIN sellers s ON s.id = p.seller_id
     ${where}
     ORDER BY p.id DESC`,
    vals
  )
  return rows.map(rowToPublicProduct)
}

export async function getPublicProductById(id) {
  const [rows] = await pool.query(
    `SELECT p.*, s.shop_name, s.owner_name
     FROM products p
     JOIN sellers s ON s.id = p.seller_id
     WHERE p.id = ?`,
    [id]
  )
  return rows[0] ? rowToPublicProduct(rows[0]) : null
}
