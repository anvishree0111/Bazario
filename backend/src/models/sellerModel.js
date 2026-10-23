import pool from '../db.js'

export async function findSellerByEmail(email) {
  const [rows] = await pool.query('SELECT * FROM sellers WHERE email = ?', [email])
  return rows[0] || null
}

export async function findSellerById(id) {
  const [rows] = await pool.query(
    'SELECT id, shop_name, owner_name, email, shop_description, created_at, updated_at FROM sellers WHERE id = ?',
    [id]
  )
  return rows[0] || null
}

export async function createSeller({ shopName, ownerName, email, passwordHash }) {
  const [r] = await pool.query(
    'INSERT INTO sellers (shop_name, owner_name, email, password) VALUES (?, ?, ?, ?)',
    [shopName, ownerName, email, passwordHash]
  )
  return r.insertId
}

export async function updateSeller(id, { shopName, ownerName, shopDescription }) {
  const fields = []
  const vals = []
  if (shopName != null) {
    fields.push('shop_name = ?')
    vals.push(shopName)
  }
  if (ownerName != null) {
    fields.push('owner_name = ?')
    vals.push(ownerName)
  }
  if (shopDescription != null) {
    fields.push('shop_description = ?')
    vals.push(shopDescription)
  }
  if (!fields.length) return
  vals.push(id)
  await pool.query(`UPDATE sellers SET ${fields.join(', ')} WHERE id = ?`, vals)
}
