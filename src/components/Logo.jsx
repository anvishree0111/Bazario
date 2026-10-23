import { Link } from 'react-router-dom'

export default function Logo({ size = 48, to = '/' }) {
  return (
    <Link to={to} className="logo">
      <img
        src="/logo.png"
        alt="Bazario"
        className="logo-img"
        style={{ height: size }}
      />
      <style>{`
        .logo {
          display: flex;
          align-items: center;
          text-decoration: none;
          color: inherit;
          transition: transform 0.2s ease;
        }
        .logo:hover {
          transform: scale(1.02);
        }
        .logo-img {
          height: ${size}px;
          width: auto;
          object-fit: contain;
        }
      `}</style>
    </Link>
  )
}
