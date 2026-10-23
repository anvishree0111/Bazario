import pool from '../db.js'
import { rowToProduct } from './productModel.js'

export async function getWishlistForBuyer(buyerId) {
  const [rows] = await pool.query(
    `SELECT p.* FROM wishlist w JOIN products p ON p.id = w.product_id WHERE w.buyer_id = ?`,
    [buyerId]
  )
  return rows.map((r) => rowToProduct(r))
}

export async function addWishlist(buyerId, productId) {
  await pool.query('INSERT IGNORE INTO wishlist (buyer_id, product_id) VALUES (?, ?)', [buyerId, productId])
}

export async function removeWishlist(buyerId, productId) {
  await pool.query('DELETE FROM wishlist WHERE buyer_id = ? AND product_id = ?', [buyerId, productId])
}
