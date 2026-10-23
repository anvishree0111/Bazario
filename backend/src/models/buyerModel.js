import pool from '../db.js'

export async function findBuyerByEmail(email) {
  const [rows] = await pool.query('SELECT * FROM buyers WHERE email = ?', [email])
  return rows[0] || null
}

export async function findBuyerById(id) {
  const [rows] = await pool.query('SELECT id, name, email, interests, created_at, updated_at FROM buyers WHERE id = ?', [id])
  return rows[0] || null
}

export async function createBuyer({ name, email, passwordHash, interests }) {
  const [r] = await pool.query(
    'INSERT INTO buyers (name, email, password, interests) VALUES (?, ?, ?, ?)',
    [name, email, passwordHash, interests ? JSON.stringify(interests) : null]
  )
  return r.insertId
}

export async function updateBuyer(id, { name, interests }) {
  const fields = []
  const vals = []
  if (name != null) {
    fields.push('name = ?')
    vals.push(name)
  }
  if (interests != null) {
    fields.push('interests = ?')
    vals.push(JSON.stringify(interests))
  }
  if (!fields.length) return
  vals.push(id)
  await pool.query(`UPDATE buyers SET ${fields.join(', ')} WHERE id = ?`, vals)
}
