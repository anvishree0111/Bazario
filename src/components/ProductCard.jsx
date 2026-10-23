import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export default function ProductCard({ product, showDiscount, showRemove, onRemove }) {
  const { toggleWishlist, isInWishlist } = useApp()
  const saved = isInWishlist(product.id)

  const formatPrice = (p) => `₹${p.toLocaleString('en-IN')}`

  return (
    <div className="product-card">
      <Link to={`/product/${product.id}`} className="card-image-wrap">
        <img src={product.image} alt={product.name} />
        {showDiscount && product.discount && (
          <span className="discount-tag">-{product.discount}%</span>
        )}
        <button
          className={`heart-btn ${saved ? 'saved' : ''}`}
          onClick={(e) => { e.preventDefault(); toggleWishlist(product); }}
          aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          ♥
        </button>
      </Link>
      <div className="card-body">
        <Link to={`/product/${product.id}`}>
          <h3 className="card-title">{product.name}</h3>
        </Link>
        {product.rating != null && (
          <div className="card-meta">
            <span className="rating">★ {product.rating}</span>
            {product.reviews != null && <span className="reviews">({product.reviews})</span>}
          </div>
        )}
        <div className="card-price">
          {showDiscount && product.originalPrice && (
            <span className="original">₹{product.originalPrice?.toLocaleString('en-IN')}</span>
          )}
          <span className="current">{formatPrice(product.price)}</span>
        </div>
        {product.shopName && (
          product.sellerId ? (
            <Link
              to={`/shop/${product.sellerId}`}
              className="card-shop"
              onClick={(e) => e.stopPropagation()}
            >
              {product.shopName}
            </Link>
          ) : (
            <p className="card-shop">{product.shopName}</p>
          )
        )}
        {showRemove && onRemove && (
          <button className="remove-wishlist-btn" onClick={(e) => { e.preventDefault(); onRemove(); }}>
            Remove
          </button>
        )}
      </div>
      <style>{`
        .product-card {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: var(--shadow);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .product-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-hover);
        }
        .card-image-wrap {
          position: relative;
          aspect-ratio: 1;
          overflow: hidden;
          display: block;
        }
        .card-image-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .discount-tag {
          position: absolute;
          top: 12px;
          left: 12px;
          background: #FF4800;
          color: white;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 700;
        }
        .heart-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: white;
          color: #ccc;
          font-size: 1.2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          transition: all 0.2s;
        }
        .heart-btn:hover, .heart-btn.saved {
          color: #FF4800;
        }
        .heart-btn.saved { transform: scale(1.1); }
        .card-body { padding: 16px; }
        .card-title {
          font-size: 1rem;
          font-weight: 700;
          color: #333;
          margin-bottom: 6px;
          line-height: 1.3;
        }
        .card-title:hover { color: #FF4800; }
        .card-meta {
          font-size: 0.85rem;
          color: #666;
          margin-bottom: 8px;
        }
        .rating { color: #FF4800; font-weight: 600; }
        .card-price {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .original {
          text-decoration: line-through;
          color: #999;
          font-size: 0.9rem;
        }
        .current {
          font-size: 1.15rem;
          font-weight: 700;
          color: #FF4800;
        }
        .card-shop {
          display: block;
          margin-top: 6px;
          font-size: 0.85rem;
          color: #888;
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        a.card-shop:hover { color: #FF4800; }
        .remove-wishlist-btn {
          margin-top: 12px;
          padding: 8px 16px;
          background: none;
          color: #e03f00;
          font-size: 0.9rem;
          font-weight: 600;
          border: 1px solid #e03f00;
          border-radius: 8px;
          width: 100%;
        }
        .remove-wishlist-btn:hover {
          background: #fff5f0;
          border-color: #FF4800;
        }
      `}</style>
    </div>
  )
}
