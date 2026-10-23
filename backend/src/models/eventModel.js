import pool from '../db.js'

export async function recordEvent({ buyerId, sellerId, productId, eventType, eventKey, metadata }) {
  const supported = new Set(['product_view', 'search', 'cart_add', 'cart_remove', 'wishlist_add', 'wishlist_remove', 'purchase', 'interest_change'])
  if (!supported.has(eventType)) throw new Error('Unsupported event type')
  if (eventKey != null && (typeof eventKey !== 'string' || eventKey.length > 191)) throw new Error('Invalid event key')
  if (metadata != null) {
    const encoded = JSON.stringify(metadata)
    if (encoded.length > 4096) throw new Error('Event metadata is too large')
  }
  if (productId != null) {
    const [products] = await pool.query('SELECT id FROM products WHERE id = ?', [productId])
    if (!products[0]) throw new Error('Referenced product not found')
  }
  await pool.query(
    `INSERT INTO behavioral_events (buyer_id, seller_id, product_id, event_type, event_key, metadata)
     VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE event_key = event_key`,
    [buyerId || null, sellerId || null, productId || null, eventType, eventKey || null, metadata ? JSON.stringify(metadata) : null]
  )
}
