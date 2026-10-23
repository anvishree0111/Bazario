import pool from '../db.js'
import { rowToProduct } from './productModel.js'
export async function listOrdersForBuyer(buyerId) {
  const [orderRows] = await pool.query(
    'SELECT * FROM orders WHERE buyer_id = ? AND parent_order_id IS NULL ORDER BY id DESC',
    [buyerId]
  )
  const orders = []
  for (const o of orderRows) {
    const [children] = await pool.query('SELECT * FROM orders WHERE parent_order_id = ? ORDER BY id', [o.id])
    const [items] = await pool.query(`SELECT oi.*, p.* FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id IN (?)`, [[o.id, ...children.map((c) => c.id)]])
    const mappedItems = items.map((row) => {
      const prod = rowToProduct(row)
      return {
        ...prod,
        order_id: row.order_id,
        quantity: row.quantity,
        price: row.price
      }
    })
    orders.push({
      id: o.id,
      buyer_id: o.buyer_id,
      seller_id: o.seller_id,
      total_price: o.total_price,
      total: o.total_price,
      status: o.status,
      date: o.created_at,
      created_at: o.created_at,
      items: mappedItems,
      suborders: children.map((child) => ({ id: child.id, seller_id: child.seller_id, total_price: child.total_price, status: child.status, created_at: child.created_at, items: mappedItems.filter((item) => item.order_id === child.id) }))
    })
  }
  return orders
}

export async function listOrdersForSeller(sellerId) {
  const [orderRows] = await pool.query(
    `SELECT o.*, b.name AS buyer_name, b.email AS buyer_email
     FROM orders o
     JOIN buyers b ON b.id = o.buyer_id
      WHERE o.seller_id = ? AND o.parent_order_id IS NOT NULL
     ORDER BY o.id DESC`,
    [sellerId]
  )
  const orders = []
  for (const o of orderRows) {
    const [items] = await pool.query(
      `SELECT oi.*, p.name AS product_name FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?`,
      [o.id]
    )
    const first = items[0]
    orders.push({
      id: o.id,
      buyerName: o.buyer_name,
      buyer_name: o.buyer_name,
      status: o.status,
      date: o.created_at,
      // Real revenue for this order, straight from the orders table —
      // never derived, estimated, or randomized on the frontend.
      total: o.total_price,
      totalPrice: o.total_price,
      total_price: o.total_price,
      productName: items.map((i) => i.product_name).join(', ') || '—',
      product_name: first?.product_name,
      items
    })
  }
  return orders
}

export async function updateOrderStatus(orderId, sellerId, status) {
  const allowed = { Confirmed: ['Processing', 'Cancelled'], Processing: ['Shipped', 'Cancelled'], Shipped: ['Delivered'], Delivered: [], Cancelled: [] }
  const [currentRows] = await pool.query('SELECT status, parent_order_id FROM orders WHERE id = ? AND seller_id = ?', [orderId, sellerId])
  if (!currentRows[0] || !Object.prototype.hasOwnProperty.call(allowed, status) || !allowed[currentRows[0].status].includes(status)) return false
  const [r] = await pool.query('UPDATE orders SET status = ? WHERE id = ? AND seller_id = ?', [
    status,
    orderId,
    sellerId
  ])
  if (r.affectedRows > 0 && currentRows[0].parent_order_id) {
    const [statuses] = await pool.query('SELECT status FROM orders WHERE parent_order_id = ?', [currentRows[0].parent_order_id])
    const parentStatus = statuses.length && statuses.every((row) => row.status === 'Delivered') ? 'Delivered' : statuses.length && statuses.every((row) => row.status === 'Cancelled') ? 'Cancelled' : statuses.some((row) => row.status === 'Processing' || row.status === 'Shipped' || row.status === 'Cancelled') ? 'Processing' : 'Confirmed'
    await pool.query('UPDATE orders SET status = ? WHERE id = ?', [parentStatus, currentRows[0].parent_order_id])
  }
  return r.affectedRows > 0
}
