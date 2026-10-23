import { Link, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'

const navItems = [
  { path: '/home', label: 'Home', icon: '🏠' },
  { path: '/orders', label: 'My Orders', icon: '📦' },
  { path: '/wishlist', label: 'Wishlist', icon: '♥' },
  { path: '/cart', label: 'My Cart', icon: '🛒' },
  { path: '/account', label: 'Profile', icon: '👤' }
]

export default function BottomNav() {
  const location = useLocation()
  const { cart } = useApp()

  return (
    <nav className="bottom-nav">
      {navItems.map(({ path, label, icon }) => (
        <Link
          key={path}
          to={path}
          className={`nav-item ${location.pathname === path ? 'active' : ''}`}
        >
          <span className="nav-icon">{icon}</span>
          <span className="nav-label">{label}</span>
          {path === '/cart' && cart.length > 0 && (
            <span className="nav-badge">{cart.length}</span>
          )}
        </Link>
      ))}
      <style>{`
        .bottom-nav {
          display: none;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          box-shadow: 0 -2px 12px rgba(0,0,0,0.08);
          padding: 8px 0;
          padding-bottom: max(8px, env(safe-area-inset-bottom));
          z-index: 100;
        }
        .bottom-nav .nav-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 6px 4px;
          color: #666;
          font-size: 0.7rem;
          font-weight: 600;
          position: relative;
        }
        .bottom-nav .nav-item.active {
          color: #FF4800;
        }
        .nav-icon { font-size: 1.2rem; }
        .nav-label { white-space: nowrap; }
        .nav-badge {
          position: absolute;
          top: 2px;
          right: 50%;
          margin-right: -24px;
          background: #FF4800;
          color: white;
          font-size: 0.65rem;
          min-width: 16px;
          height: 16px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        @media (max-width: 768px) {
          .bottom-nav {
            display: flex;
            justify-content: space-around;
          }
        }
      `}</style>
    </nav>
  )
}
