import NavBar from '../components/NavBar'
import BottomNav from '../components/BottomNav'
import ProductCard from '../components/ProductCard'
import { useApp } from '../context/AppContext'

export default function Wishlist() {
  const { wishlist, toggleWishlist } = useApp()

  if (wishlist.length === 0) {
    return (
      <div className="wishlist-page">
        <NavBar />
        <div className="wishlist-empty">
          <h2>Your Wishlist is Empty</h2>
          <p>Save products you love by clicking the heart icon on any product!</p>
        </div>
        <BottomNav />
        <style>{`
          .wishlist-page { min-height: 100vh; background: var(--bg-alt); padding-bottom: 80px; }
          .wishlist-empty {
            max-width: 500px;
            margin: 80px auto;
            text-align: center;
            padding: 48px;
          }
          .wishlist-empty h2 { color: #FF4800; margin-bottom: 12px; }
          .wishlist-empty p { color: #666; }
        `}</style>
      </div>
    )
  }

  return (
    <div className="wishlist-page">
      <NavBar />
      <BottomNav />
      <div className="wishlist-content">
        <h1>Saved / Wishlist</h1>
        <div className="wishlist-grid">
          {wishlist.map(p => (
            <ProductCard key={p.id} product={p} showRemove onRemove={() => toggleWishlist(p)} />
          ))}
        </div>
      </div>
      <style>{`
        .wishlist-page { min-height: 100vh; background: var(--bg-alt); padding-bottom: 80px; }
        .wishlist-content { max-width: 1200px; margin: 0 auto; padding: 24px; }
        .wishlist-content h1 { margin-bottom: 24px; color: #FF4800; }
        .wishlist-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 24px;
        }
      `}</style>
    </div>
  )
}
