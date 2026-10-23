import pool from '../db.js'

// Table names are fixed literals chosen from the role, never user input.
const table = (role) => (role === 'buyer' ? 'buyers' : 'sellers')
const idColumn = (role) => (role === 'buyer' ? 'buyer_id' : 'seller_id')

export async function findIdentityBySubject(sub) {
  const [rows] = await pool.query(
    "SELECT role, buyer_id, seller_id FROM auth_identities WHERE provider = 'google' AND provider_subject = ?",
    [sub]
  )
  return rows[0] || null
}

export async function findAccountByEmail(role, email) {
  const [rows] = await pool.query(`SELECT id FROM ${table(role)} WHERE email = ?`, [email])
  return rows[0] || null
}

export async function findIdentityForAccount(role, accountId) {
  const [rows] = await pool.query(
    `SELECT id FROM auth_identities WHERE role = ? AND ${idColumn(role)} = ?`,
    [role, accountId]
  )
  return rows[0] || null
}

export async function getAccount(role, id) {
  const sql = role === 'buyer'
    ? 'SELECT id, name, email, interests FROM buyers WHERE id = ?'
    : 'SELECT id, shop_name, owner_name, email, shop_description FROM sellers WHERE id = ?'
  const [rows] = await pool.query(sql, [id])
  return rows[0] || null
}

export async function linkIdentity({ sub, role, accountId, email }) {
  await pool.query(
    `INSERT INTO auth_identities (provider, provider_subject, role, ${idColumn(role)}, email) VALUES ('google', ?, ?, ?, ?)`,
    [sub, role, accountId, email]
  )
}

// Account + (interests) + Google identity are written in ONE transaction, so
// a failure part-way never leaves an orphaned buyer/seller row behind. The
// UNIQUE keys (email, provider+subject) turn concurrent duplicates into
// ER_DUP_ENTRY, which the service reports as a normal application response.
export async function createAccountWithIdentity({ role, sub, email, profile }) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    let id
    if (role === 'buyer') {
      const [r] = await conn.query(
        'INSERT INTO buyers (name, email, password, interests) VALUES (?, ?, NULL, ?)',
        [profile.name, email, JSON.stringify(profile.interests || [])]
      )
      id = r.insertId
      for (const interest of profile.interests || []) {
        await conn.query('INSERT INTO buyer_interests (buyer_id, interest) VALUES (?, ?)', [id, interest])
      }
    } else {
      const [r] = await conn.query(
        'INSERT INTO sellers (shop_name, owner_name, email, password, shop_description) VALUES (?, ?, ?, NULL, ?)',
        [profile.shopName, profile.name, email, profile.shopDescription]
      )
      id = r.insertId
    }
    await conn.query(
      `INSERT INTO auth_identities (provider, provider_subject, role, ${idColumn(role)}, email) VALUES ('google', ?, ?, ?, ?)`,
      [sub, role, id, email]
    )
    await conn.commit()
    return id
  } catch (error) {
    try { await conn.rollback() } catch { /* connection already gone */ }
    throw error
  } finally {
    conn.release()
  }
}
