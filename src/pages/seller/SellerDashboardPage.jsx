import SellerLayout from '../../components/seller/SellerLayout'
import { useSeller } from '../../context/SellerContext'

export default function SellerDashboardPage() {
  const { products, orders } = useSeller()
  // Revenue is the real sum of this seller's own order totals from MySQL
  // (orders.total_price, scoped server-side to the authenticated seller).
  // A seller with zero orders correctly gets 0 — nothing is estimated,
  // seeded, or randomized here.
  const revenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0)
  const recent = [...orders].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5)

  const formatPrice = (n) => `₹${Number(n).toLocaleString('en-IN')}`
  const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <SellerLayout>
      <h1 className="sd-title">Dashboard</h1>
      <div className="sd-stats">
        <div className="sd-stat-card">
          <span className="sd-stat-label">Total Products</span>
          <span className="sd-stat-value">{products.length}</span>
        </div>
        <div className="sd-stat-card">
          <span className="sd-stat-label">Total Orders</span>
          <span className="sd-stat-value">{orders.length}</span>
        </div>
        <div className="sd-stat-card">
          <span className="sd-stat-label">Revenue</span>
          <span className="sd-stat-value">{formatPrice(revenue)}</span>
        </div>
      </div>
      <section className="sd-section">
        <h2>Recent Orders</h2>
        <div className="sd-table-wrap">
          <table className="sd-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Buyer</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={4} className="sd-empty">No orders yet.</td>
                </tr>
              ) : (
                recent.map(o => (
                  <tr key={o.id}>
                    <td>{o.productName}</td>
                    <td>{o.buyerName}</td>
                    <td>
                      <span className="sd-badge">{o.status}</span>
                    </td>
                    <td>{formatDate(o.date)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
      <style>{`
        .sd-title { font-size: 1.75rem; color: #FF4800; margin-bottom: 24px; }
        .sd-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 40px;
        }
        .sd-stat-card {
          background: white;
          padding: 24px;
          border-radius: 12px;
          box-shadow: var(--shadow, 0 2px 12px rgba(0,0,0,0.08));
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .sd-stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(255, 72, 0, 0.15);
        }
        .sd-stat-label {
          display: block;
          font-size: 0.9rem;
          color: #666;
          margin-bottom: 8px;
        }
        .sd-stat-value {
          font-size: 1.75rem;
          font-weight: 800;
          color: #FF4800;
        }
        .sd-section h2 {
          font-size: 1.25rem;
          color: #FF4800;
          margin-bottom: 16px;
        }
        .sd-table-wrap {
          background: white;
          border-radius: 12px;
          overflow: auto;
          box-shadow: var(--shadow, 0 2px 12px rgba(0,0,0,0.08));
        }
        .sd-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.95rem;
        }
        .sd-table th,
        .sd-table td {
          padding: 14px 18px;
          text-align: left;
          border-bottom: 1px solid #eee;
        }
        .sd-table th {
          color: #FF4800;
          font-weight: 700;
          background: #fff8f5;
        }
        .sd-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 6px;
          background: #fff5f0;
          color: #FF4800;
          font-weight: 600;
          font-size: 0.85rem;
        }
        .sd-empty {
          text-align: center;
          color: #666;
          padding: 28px 18px;
        }
      `}</style>
    </SellerLayout>
  )
}
