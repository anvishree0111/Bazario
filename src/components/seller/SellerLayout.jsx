import { Link, NavLink } from 'react-router-dom'
import Logo from '../Logo'
import useLogout from '../../hooks/useLogout'

const nav = [
  { to: '/seller/dashboard', label: 'Dashboard' },
  { to: '/seller/products', label: 'Products' },
  { to: '/seller/add-product', label: 'Add Product' },
  { to: '/seller/orders', label: 'Orders' },
  { to: '/seller/profile', label: 'Profile' }
]

export default function SellerLayout({ children }) {
  const handleLogout = useLogout()

  return (
    <div className="seller-layout">
      <header className="sl-header">
        <div className="sl-logo">
          <Logo size={44} to="/seller/dashboard" />
        </div>
        <nav className="sl-nav">
          {nav.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => (isActive ? 'sl-nav-link active' : 'sl-nav-link')}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sl-actions">
          <Link to="/" className="sl-link-home">
            Buyer site
          </Link>
          <button type="button" className="sl-logout" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>
      <main className="sl-main">{children}</main>
      <style>{`
        .seller-layout {
          min-height: 100vh;
          background: var(--bg-alt, #f8f8f8);
        }
        .sl-header {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          padding: 12px 24px;
          background: white;
          box-shadow: var(--shadow, 0 2px 12px rgba(0,0,0,0.08));
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .sl-logo { flex-shrink: 0; }
        .sl-nav {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          flex: 1;
          justify-content: center;
        }
        .sl-nav-link {
          padding: 10px 16px;
          font-weight: 600;
          color: #333;
          border-radius: 8px;
          transition: color 0.2s, background 0.2s;
        }
        .sl-nav-link:hover {
          color: #FF4800;
          background: #fff5f0;
        }
        .sl-nav-link.active {
          color: #FF4800;
          background: #fff5f0;
        }
        .sl-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .sl-link-home {
          font-weight: 600;
          color: #666;
          font-size: 0.9rem;
        }
        .sl-link-home:hover { color: #FF4800; }
        .sl-logout {
          padding: 10px 18px;
          background: white;
          color: #FF4800;
          font-weight: 700;
          border: 2px solid #FF4800;
          border-radius: 10px;
          font-size: 0.9rem;
        }
        .sl-logout:hover {
          background: #FF4800;
          color: white;
        }
        .sl-main {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
        }
        @media (max-width: 768px) {
          .sl-header { flex-direction: column; align-items: stretch; }
          .sl-nav { justify-content: flex-start; }
          .sl-actions { justify-content: space-between; }
        }
      `}</style>
    </div>
  )
}
