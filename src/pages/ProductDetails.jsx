import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import NavBar from '../components/NavBar'
import BottomNav from '../components/BottomNav'
import ProductCard from '../components/ProductCard'
import { useApp } from '../context/AppContext'
import { api } from '../api/client'

const faqs = [
  { q: 'What is the return policy?', a: 'Items can be returned within 7 days of delivery if unused and in original packaging.' },
  { q: 'How long does shipping take?', a: 'Standard delivery takes 3-5 business days across India.' },
  { q: 'Is COD available?', a: 'Yes, Cash on Delivery is available for orders under ₹10,000.' }
]

export default function ProductDetails() {
  const { id } = useParams()
  const { addToCart, toggleWishlist, isInWishlist, user } = useApp()
  const [quantity, setQuantity] = useState(1)
  const [openFaq, setOpenFaq] = useState(null)
  const [imgIndex, setImgIndex] = useState(0)

  const [product, setProduct] = useState(null)
  const [moreFromShop, setMoreFromShop] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setProduct(null)
    setQuantity(1)
    setImgIndex(0)

    api.getProduct(id)
      .then(async (p) => {
        if (cancelled) return
        setProduct(p)
        if (user?.id) api.recordEvent(user.id, { eventType: 'product_view', eventKey: `product_view:${p.id}:${Date.now()}`, productId: p.id, sellerId: p.sellerId }).catch(() => {})
        try {
          const shopProducts = await api.getProducts({ sellerId: p.sellerId })
          if (!cancelled) setMoreFromShop((shopProducts || []).filter(x => x.id !== p.id))
        } catch (_) {
          // Non-critical: the "more from this shop" section simply stays empty.
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || 'Unable to load product')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [id, user?.id])

  const formatPrice = (n) => `₹${Number(n).toLocaleString('en-IN')}`

  if (loading) {
    return (
      <div className="product-page">
        <NavBar />
        <div className="product-content">
          <p className="state-msg">Loading product...</p>
        </div>
        <BottomNav />
        <style>{pageStyles}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div className="product-page">
        <NavBar />
        <div className="product-content">
          <div className="state-msg error-msg">
            <p>Unable to load product.</p>
            <button type="button" className="retry-btn" onClick={() => window.location.reload()}>Retry</button>
          </div>
        </div>
        <BottomNav />
        <style>{pageStyles}</style>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="product-page">
        <NavBar />
        <div className="product-content">
          <p className="state-msg">Product not found.</p>
        </div>
        <BottomNav />
        <style>{pageStyles}</style>
      </div>
    )
  }

  const productImages = product.image_urls?.length ? product.image_urls : (product.image ? [product.image] : [])

  return (
    <div className="product-page">
      <NavBar />
      <BottomNav />
      <div className="product-content">
        <div className="product-layout">
          <div className="product-gallery">
            {productImages.length > 0 ? (
              <>
                <div
                  className="product-image-carousel"
                  style={{ transform: `translateX(-${imgIndex * 100}%)` }}
                >
                  {productImages.map((img, i) => (
                    <img key={i} src={img} alt={`${product.name} ${i + 1}`} />
                  ))}
                </div>
                {productImages.length > 1 && (
                  <div className="gallery-dots">
                    {productImages.map((_, i) => (
                      <button
                        key={i}
                        className={i === imgIndex ? 'active' : ''}
                        onClick={() => setImgIndex(i)}
                        aria-label={`View image ${i + 1}`}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="no-image">No image available</div>
            )}
          </div>
          <div className="product-info">
            <h1>{product.name}</h1>
            {product.rating != null && (
              <div className="product-meta">
                <span className="rating">★ {product.rating}</span>
                {product.reviews != null && <span className="reviews">({product.reviews} reviews)</span>}
              </div>
            )}
            <p className="price">{formatPrice(product.price)}</p>
            <p className="description">{product.description}</p>

            <div className="quantity-row">
              <label>Quantity:</label>
              <div className="quantity-control">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))}>−</button>
                <span>{quantity}</span>
                <button onClick={() => setQuantity(q => q + 1)}>+</button>
              </div>
            </div>

            <div className="actions">
              <button
                className="add-cart"
                onClick={() => addToCart(product, quantity)}
              >
                Add to Cart
              </button>
              <button
                className={`wishlist-btn ${isInWishlist(product.id) ? 'saved' : ''}`}
                onClick={() => toggleWishlist(product)}
              >
                ♥ {isInWishlist(product.id) ? 'Saved' : 'Save'}
              </button>
            </div>

            <div className="shop-info">
              <h3>Shop Details</h3>
              <p><strong>{product.shopName}</strong></p>
              {product.ownerName && <p>Owner: {product.ownerName}</p>}
              <div className="shop-actions">
                <Link to={`/shop/${product.sellerId}`} className="msg-btn">Visit Shop</Link>
              </div>
            </div>
          </div>
        </div>

        <section className="faq-section">
          <h2>Frequently Asked Questions</h2>
          {faqs.map((faq, i) => (
            <div
              key={i}
              className={`faq-item ${openFaq === i ? 'open' : ''}`}
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
            >
              <h4>{faq.q}</h4>
              <p>{faq.a}</p>
            </div>
          ))}
        </section>

        {moreFromShop.length > 0 && (
          <section className="more-section">
            <h2>More from {product.shopName}</h2>
            <div className="more-grid">
              {moreFromShop.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>
      <style>{pageStyles}</style>
    </div>
  )
}

const pageStyles = `
  .product-page { min-height: 100vh; background: var(--bg-alt); padding-bottom: 80px; }
  .product-content { max-width: 1200px; margin: 0 auto; padding: 24px; }
  .state-msg {
    background: white;
    border-radius: 12px;
    padding: 40px 24px;
    text-align: center;
    color: #666;
    box-shadow: var(--shadow);
  }
  .state-msg.error-msg { color: #e03f00; }
  .retry-btn {
    margin-top: 12px;
    padding: 10px 24px;
    background: #FF4800;
    color: white;
    font-weight: 700;
    border-radius: 8px;
  }
  .retry-btn:hover { background: #e03f00; }
  .product-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 48px;
    margin-bottom: 48px;
  }
  .product-gallery {
    position: relative;
    background: white;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: var(--shadow);
  }
  .product-gallery .product-image-carousel {
    display: flex;
    transition: transform 0.4s ease;
    height: 100%;
  }
  .product-gallery .product-image-carousel img {
    flex: 0 0 100%;
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
  }
  .no-image {
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #999;
    background: #f5f5f5;
  }
  .gallery-dots {
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 8px;
  }
  .gallery-dots button {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: rgba(0,0,0,0.3);
    transition: all 0.2s;
  }
  .gallery-dots button.active {
    background: #FF4800;
    width: 24px;
    border-radius: 6px;
  }
  .product-info h1 {
    font-size: 1.75rem;
    color: #333;
    margin-bottom: 12px;
  }
  .product-meta {
    font-size: 1rem;
    margin-bottom: 16px;
  }
  .product-meta .rating { color: #FF4800; font-weight: 700; }
  .product-meta .reviews { color: #666; }
  .price {
    font-size: 1.75rem;
    font-weight: 700;
    color: #FF4800;
    margin-bottom: 16px;
  }
  .description {
    color: #555;
    line-height: 1.6;
    margin-bottom: 24px;
  }
  .quantity-row {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
  }
  .quantity-row label { font-weight: 600; }
  .quantity-control {
    display: flex;
    align-items: center;
    gap: 12px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    padding: 4px;
  }
  .quantity-control button {
    width: 36px;
    height: 36px;
    background: #f5f5f5;
    font-size: 1.2rem;
    font-weight: 700;
    border-radius: 6px;
    transition: background 0.2s;
  }
  .quantity-control button:hover { background: #FF4800; color: white; }
  .quantity-control span { min-width: 32px; text-align: center; font-weight: 700; }
  .actions {
    display: flex;
    gap: 12px;
    margin-bottom: 32px;
  }
  .add-cart {
    padding: 16px 32px;
    background: #FF4800;
    color: white;
    font-weight: 700;
    font-size: 1rem;
    border-radius: 10px;
  }
  .add-cart:hover {
    background: #e03f00;
    transform: translateY(-2px);
  }
  .wishlist-btn {
    padding: 16px 24px;
    background: white;
    color: #666;
    border: 2px solid #e0e0e0;
    font-weight: 600;
    border-radius: 10px;
  }
  .wishlist-btn:hover, .wishlist-btn.saved {
    border-color: #FF4800;
    color: #FF4800;
  }
  .shop-info {
    background: #f8f8f8;
    padding: 24px;
    border-radius: 12px;
  }
  .shop-info h3 { margin-bottom: 12px; font-size: 1.1rem; }
  .shop-info p { margin-bottom: 8px; color: #333; }
  .shop-actions {
    display: flex;
    gap: 12px;
    margin-top: 16px;
  }
  .msg-btn, .follow-btn {
    padding: 10px 20px;
    font-weight: 600;
    border-radius: 8px;
    font-size: 0.95rem;
  }
  .msg-btn {
    background: #FF4800;
    color: white;
  }
  .msg-btn:hover { background: #e03f00; }
  .follow-btn {
    background: white;
    border: 2px solid #FF4800;
    color: #FF4800;
  }
  .follow-btn:hover { background: #fff5f0; }
  .faq-section, .reviews-section, .more-section {
    margin-bottom: 48px;
  }
  .faq-section h2, .reviews-section h2, .more-section h2 {
    font-size: 1.35rem;
    margin-bottom: 20px;
    color: #FF4800;
  }
  .faq-item {
    background: white;
    padding: 20px;
    border-radius: 10px;
    margin-bottom: 12px;
    cursor: pointer;
    box-shadow: var(--shadow);
    transition: all 0.2s;
  }
  .faq-item:hover { box-shadow: var(--shadow-hover); }
  .faq-item h4 { margin-bottom: 8px; color: #333; font-size: 1rem; }
  .faq-item p {
    color: #666;
    font-size: 0.95rem;
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease;
  }
  .faq-item.open p { max-height: 200px; }
  .more-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 20px;
  }
  @media (max-width: 768px) {
    .product-layout { grid-template-columns: 1fr; }
  }
`
