import pool from '../db.js'
import { rowToProduct } from './productModel.js'

export async function getCartRows(buyerId) {
  const [rows] = await pool.query(
    `SELECT c.product_id, c.quantity, p.*
     FROM cart c
     JOIN products p ON p.id = c.product_id
     WHERE c.buyer_id = ?`,
    [buyerId]
  )
  return rows
}

export async function getCartForBuyer(buyerId) {
  const rows = await getCartRows(buyerId)
  return rows.map((r) => {
    const p = rowToProduct(r)
    return {
      ...p,
      id: p.id,
      quantity: r.quantity
    }
  })
}

export async function upsertCartItem(buyerId, productId, quantity) {
  await pool.query(
    `INSERT INTO cart (buyer_id, product_id, quantity) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE quantity = ?`,
    [buyerId, productId, quantity, quantity]
  )
}

export async function addToCart(buyerId, productId, quantity) {
  const [rows] = await pool.query(
    'SELECT quantity FROM cart WHERE buyer_id = ? AND product_id = ?',
    [buyerId, productId]
  )
  const current = rows[0]?.quantity || 0
  const next = current + quantity
  await upsertCartItem(buyerId, productId, next)
}

export async function updateCartQuantity(buyerId, productId, quantity) {
  if (quantity <= 0) {
    await pool.query('DELETE FROM cart WHERE buyer_id = ? AND product_id = ?', [buyerId, productId])
    return
  }
  await upsertCartItem(buyerId, productId, quantity)
}

export async function removeFromCart(buyerId, productId) {
  await pool.query('DELETE FROM cart WHERE buyer_id = ? AND product_id = ?', [buyerId, productId])
}

export async function clearCart(buyerId) {
  await pool.query('DELETE FROM cart WHERE buyer_id = ?', [buyerId])
}
