import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Logo from './Logo'
import { useApp } from '../context/AppContext'

export default function NavBar() {
  const { cart, wishlist } = useApp()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  const navItems = [
    { path: '/home', label: 'Home' },
    { path: '/orders', label: 'My Orders' },
    { path: '/wishlist', label: 'Wishlist' },
    { path: '/cart', label: 'Cart', badge: cart.length }
  ]

  return (
    <nav className="navbar">
      <div className="nav-inner">
        <div className="nav-logo">
          <Logo size={40} />
        </div>
        <ul className={`nav-links ${menuOpen ? 'open' : ''}`}>
          {navItems.map(({ path, label, badge }) => (
            <li key={path}>
              <Link
                to={path}
                className={location.pathname === path ? 'active' : ''}
                onClick={() => setMenuOpen(false)}
              >
                {label}
                {badge > 0 && <span className="badge">{badge}</span>}
              </Link>
            </li>
          ))}
        </ul>
        <Link
          to="/account"
          className="nav-profile"
          onClick={() => setMenuOpen(false)}
        >
          <div className="avatar">U</div>
        </Link>
        <button
          className="nav-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span></span><span></span><span></span>
        </button>
      </div>
      <style>{`
        .navbar {
          background: white;
          box-shadow: var(--shadow);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .nav-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 12px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }
        .nav-logo { flex-shrink: 0; }
        .nav-links {
          display: flex;
          align-items: center;
          gap: 8px;
          list-style: none;
        }
        .nav-links a {
          padding: 10px 16px;
          font-weight: 600;
          color: #333;
          border-radius: 8px;
          position: relative;
          transition: color 0.2s, background 0.2s;
        }
        .nav-links a:hover {
          color: #FF4800;
          background: #fff5f0;
        }
        .nav-links a.active {
          color: #FF4800;
          background: #fff5f0;
        }
        .badge {
          position: absolute;
          top: 4px;
          right: 4px;
          background: #FF4800;
          color: white;
          font-size: 0.7rem;
          min-width: 18px;
          height: 18px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
        }
        .nav-profile .avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #FF4800;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1rem;
          transition: transform 0.2s;
        }
        .nav-profile:hover .avatar {
          transform: scale(1.05);
        }
        .nav-toggle {
          display: none;
          flex-direction: column;
          gap: 5px;
          padding: 8px;
          background: none;
        }
        .nav-toggle span {
          width: 24px;
          height: 3px;
          background: #333;
          border-radius: 2px;
        }
        @media (max-width: 768px) {
          .nav-toggle { display: flex; }
          .nav-links {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            flex-direction: column;
            padding: 20px;
            box-shadow: var(--shadow);
            transform: translateY(-10px);
            opacity: 0;
            visibility: hidden;
            transition: all 0.2s ease;
          }
          .nav-links.open {
            transform: translateY(0);
            opacity: 1;
            visibility: visible;
          }
          .nav-links a { width: 100%; text-align: center; }
        }
      `}</style>
    </nav>
  )
}
