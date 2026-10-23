import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import NavBar from '../components/NavBar'
import BottomNav from '../components/BottomNav'
import ProductCard from '../components/ProductCard'
import { useApp } from '../context/AppContext'
import { api } from '../api/client'

export default function Shop() {
  const { sellerId } = useParams()
  const sid = Number(sellerId)
  const { user, userType } = useApp()

  const [shop, setShop] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Follow state — always derived from MySQL via the API, never assumed.
  const [following, setFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followBusy, setFollowBusy] = useState(false)
  const [followError, setFollowError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setShop(null)
    setProducts([])
    setFollowError(null)

    ;(async () => {
      try {
        const shopData = await api.getShop(sid)
        if (cancelled) return
        setShop(shopData)
        setFollowerCount(shopData.followerCount || 0)
      } catch (e) {
        if (!cancelled) setError(e.message || 'Unable to load shop')
        return
      }

      try {
        const prods = await api.getProducts({ sellerId: sid })
        if (!cancelled) setProducts(prods || [])
      } catch (_) {
        // Non-critical: shop info still loaded, product list just stays empty.
      }

      if (user?.id && userType === 'buyer') {
        try {
          const state = await api.getFollowState(user.id, sid)
          if (!cancelled) setFollowing(!!state.following)
        } catch (_) {
          // Follow state failing to load isn't fatal — button just defaults
          // to "Follow Shop" until the buyer interacts with it.
        }
      }

      if (!cancelled) setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [sid, user?.id, userType])

  const handleFollowToggle = useCallback(async () => {
    if (!user?.id || userType !== 'buyer' || followBusy) return
    setFollowBusy(true)
    setFollowError(null)
    const wasFollowing = following
    try {
      if (wasFollowing) {
        const res = await api.unfollowShop(user.id, sid)
        setFollowing(false)
        setFollowerCount(res.followerCount)
      } else {
        const res = await api.followShop(user.id, sid)
        setFollowing(true)
        setFollowerCount(res.followerCount)
      }
    } catch (e) {
      // Real failure: leave the button exactly as it was and surface the
      // error, instead of pretending the follow/unfollow succeeded.
      setFollowError(e.message || 'Something went wrong. Please try again.')
    } finally {
      setFollowBusy(false)
    }
  }, [following, followBusy, sid, user, userType])

  if (loading) {
    return (
      <div className="shop-page">
        <NavBar />
        <div className="shop-content">
          <p className="state-msg">Loading shop...</p>
        </div>
        <BottomNav />
        <style>{pageStyles}</style>
      </div>
    )
  }

  if (error || !shop) {
    return (
      <div className="shop-page">
        <NavBar />
        <div className="shop-content">
          <div className="state-msg error-msg">
            <p>{error === 'Shop not found' ? 'This shop could not be found.' : 'Unable to load shop.'}</p>
            <button type="button" className="retry-btn" onClick={() => window.location.reload()}>Retry</button>
          </div>
        </div>
        <BottomNav />
        <style>{pageStyles}</style>
      </div>
    )
  }

  const canFollow = userType === 'buyer' && !!user?.id

  return (
    <div className="shop-page">
      <NavBar />
      <BottomNav />
      <div className="shop-content">
        <div className="shop-header">
          <h1>{shop.shopName}</h1>
          <p className="shop-owner">Owner: {shop.ownerName}</p>

          {shop.shopDescription ? (
            <p className="shop-desc">{shop.shopDescription}</p>
          ) : (
            <p className="shop-desc empty">This shop hasn&apos;t added a description yet.</p>
          )}

          <div className="shop-stats">
            <span className="followers-count">
              {followerCount} {followerCount === 1 ? 'Follower' : 'Followers'}
            </span>
            {canFollow && (
              <button
                type="button"
                className={`follow-toggle-btn ${following ? 'following' : ''}`}
                onClick={handleFollowToggle}
                disabled={followBusy}
              >
                {followBusy ? 'Please wait...' : following ? 'Following' : 'Follow Shop'}
              </button>
            )}
          </div>
          {followError && <p className="follow-error">{followError}</p>}
        </div>

        <section className="shop-products">
          <h2>All Products</h2>
          {products.length === 0 ? (
            <p className="state-msg">No products from this shop yet.</p>
          ) : (
            <div className="products-grid">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>
      </div>
      <style>{pageStyles}</style>
    </div>
  )
}

const pageStyles = `
  .shop-page { min-height: 100vh; background: var(--bg-alt); padding-bottom: 80px; }
  .shop-content { max-width: 1200px; margin: 0 auto; padding: 24px; }
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
  .shop-header {
    background: white;
    border-radius: 16px;
    box-shadow: var(--shadow);
    padding: 32px;
    margin-bottom: 32px;
  }
  .shop-header h1 {
    font-size: 1.75rem;
    color: #FF4800;
    margin-bottom: 8px;
  }
  .shop-owner {
    color: #666;
    font-weight: 600;
    margin-bottom: 16px;
  }
  .shop-desc {
    color: #333;
    line-height: 1.6;
    margin-bottom: 24px;
  }
  .shop-desc.empty {
    color: #999;
    font-style: italic;
  }
  .shop-stats {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }
  .followers-count {
    font-weight: 700;
    color: #333;
  }
  .follow-toggle-btn {
    padding: 10px 24px;
    background: #FF4800;
    color: white;
    font-weight: 700;
    border-radius: 10px;
    transition: background 0.2s, transform 0.2s;
  }
  .follow-toggle-btn:hover:not(:disabled) {
    background: #e03f00;
    transform: translateY(-1px);
  }
  .follow-toggle-btn.following {
    background: white;
    border: 2px solid #FF4800;
    color: #FF4800;
  }
  .follow-toggle-btn.following:hover:not(:disabled) {
    background: #fff5f0;
  }
  .follow-toggle-btn:disabled {
    opacity: 0.7;
    cursor: default;
  }
  .follow-error {
    margin-top: 12px;
    color: #e03f00;
    font-size: 0.9rem;
    font-weight: 600;
  }
  .shop-products h2 {
    font-size: 1.35rem;
    margin-bottom: 20px;
    color: #FF4800;
  }
  .products-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 20px;
  }
`
