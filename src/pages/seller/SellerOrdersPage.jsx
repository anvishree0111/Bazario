import SellerLayout from '../../components/seller/SellerLayout'
import { useSeller } from '../../context/SellerContext'

const STATUSES = ['Pending', 'Confirmed', 'Shipped', 'Delivered']

export default function SellerOrdersPage() {
  const { orders, updateOrderStatus } = useSeller()

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <SellerLayout>
      <h1 className="so-title">Orders</h1>
      <div className="so-list">
        {orders.map(o => (
          <div key={o.id} className="so-card">
            <div className="so-row">
              <div>
                <h3>{o.productName}</h3>
                <p className="so-buyer">Buyer: {o.buyerName}</p>
                <p className="so-date">{formatDate(o.date)}</p>
              </div>
              <div className="so-side">
                <span className="so-status">{o.status}</span>
                <select
                  className="so-select"
                  value={o.status}
                  onChange={e => updateOrderStatus(o.id, e.target.value)}
                  aria-label="Update order status"
                >
                  {STATUSES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button type="button" className="so-msg">Message Buyer</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <style>{`
        .so-title { font-size: 1.75rem; color: #FF4800; margin-bottom: 24px; }
        .so-list { display: flex; flex-direction: column; gap: 16px; }
        .so-card {
          background: white;
          padding: 20px 24px;
          border-radius: 12px;
          box-shadow: var(--shadow, 0 2px 12px rgba(0,0,0,0.08));
          transition: box-shadow 0.2s;
        }
        .so-card:hover { box-shadow: 0 4px 20px rgba(255, 72, 0, 0.12); }
        .so-row {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
        }
        .so-card h3 { font-size: 1.1rem; color: #333; margin-bottom: 8px; }
        .so-buyer { color: #555; margin-bottom: 4px; }
        .so-date { font-size: 0.85rem; color: #999; }
        .so-side {
          display: flex;
          flex-direction: column;
          gap: 10px;
          align-items: flex-end;
          min-width: 200px;
        }
        .so-status {
          font-weight: 700;
          color: #FF4800;
        }
        .so-select {
          padding: 10px 14px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-family: inherit;
          font-size: 0.95rem;
        }
        .so-select:focus { outline: none; border-color: #FF4800; }
        .so-msg {
          padding: 10px 18px;
          background: #FF4800;
          color: white;
          font-weight: 600;
          border-radius: 8px;
          font-size: 0.9rem;
        }
        .so-msg:hover { background: #e03f00; }
      `}</style>
    </SellerLayout>
  )
}
