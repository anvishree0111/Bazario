import pool from '../db.js'

// All follow state lives in the `follows` table. There is no in-memory or
// localStorage fallback — every read here reflects the database exactly,
// so a page refresh always shows the real, persisted relationship.

export async function isFollowing(buyerId, sellerId) {
  const [rows] = await pool.query(
    'SELECT 1 FROM follows WHERE buyer_id = ? AND seller_id = ? LIMIT 1',
    [buyerId, sellerId]
  )
  return rows.length > 0
}

// INSERT ... ON DUPLICATE KEY UPDATE is used (instead of INSERT IGNORE) so
// that a repeat follow from the same buyer is a harmless no-op rather than
// a silently-swallowed warning, while the UNIQUE(buyer_id, seller_id)
// constraint still guarantees only one row can ever exist per pair.
export async function follow(buyerId, sellerId) {
  await pool.query(
    `INSERT INTO follows (buyer_id, seller_id) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE buyer_id = buyer_id`,
    [buyerId, sellerId]
  )
}

export async function unfollow(buyerId, sellerId) {
  const [r] = await pool.query(
    'DELETE FROM follows WHERE buyer_id = ? AND seller_id = ?',
    [buyerId, sellerId]
  )
  return r.affectedRows > 0
}

export async function countFollowers(sellerId) {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS c FROM follows WHERE seller_id = ?',
    [sellerId]
  )
  return rows[0]?.c || 0
}
