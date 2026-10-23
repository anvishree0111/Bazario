import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import NavBar from '../components/NavBar'
import BottomNav from '../components/BottomNav'
import ProductCard from '../components/ProductCard'
import { useApp } from '../context/AppContext'
import { api } from '../api/client'
import { categories as allCategories } from '../data/products'

export default function Home() {
  const { interests, user } = useApp()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef(null)

  // Real catalogue state — always sourced from the MySQL-backed API.
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false)
    }
    if (filterOpen) document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [filterOpen])

  // Which categories should drive the query sent to Express/MySQL:
  // - an explicit dropdown selection wins
  // - otherwise fall back to the buyer's saved interests
  // - otherwise no category constraint (full catalogue)
  const activeCategories = filter !== 'all' ? [filter] : (interests.length > 0 ? interests : null)
  const activeCategoriesKey = activeCategories ? activeCategories.join(',') : ''

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
       const data = await api.getProducts({ ...(activeCategories ? { categories: activeCategories } : {}), search: search.trim() || undefined })
      setProducts(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message || 'Unable to load products')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategoriesKey, search])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const searched = products

  useEffect(() => {
    if (!search.trim() || !user?.id) return
    const timer = setTimeout(() => api.recordEvent(user.id, { eventType: 'search', eventKey: `search:${search.trim().toLowerCase()}`, metadata: { query: search.trim() } }).catch(() => {}), 500)
    return () => clearTimeout(timer)
  }, [search, user?.id])

  // Group real products by category, then by the real shop that sells them.
  // A shop only ever appears here because it has an actual matching row in MySQL.
  const groups = useMemo(() => {
    const byCategory = new Map()
    for (const p of searched) {
      if (!byCategory.has(p.category)) byCategory.set(p.category, new Map())
      const shopsMap = byCategory.get(p.category)
      const shopKey = p.sellerId
      if (!shopsMap.has(shopKey)) shopsMap.set(shopKey, { sellerId: shopKey, shopName: p.shopName, products: [] })
      shopsMap.get(shopKey).products.push(p)
    }

    let orderedCats
    if (filter !== 'all') {
      orderedCats = [filter]
    } else if (interests.length > 0) {
      orderedCats = interests.filter(c => byCategory.has(c))
    } else {
      orderedCats = Array.from(byCategory.keys())
    }

    return orderedCats
      .filter(cat => byCategory.has(cat))
      .map(cat => ({
        category: cat,
        shops: Array.from(byCategory.get(cat).values())
      }))
  }, [searched, filter, interests])

  const heading = filter !== 'all'
    ? filter
    : (interests.length > 0 ? 'Personalized For You' : 'All Products')

  const dropdownCategories = ['all', ...allCategories]

  return (
    <div className="home-page">
      <NavBar />
      <div className="home-content">
        <div className="search-section">
          <div className="search-bar">
            <input
              type="search"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="filter-wrapper" ref={filterRef}>
              <button
                type="button"
                className="filter-icon-btn"
                onClick={() => setFilterOpen(f => !f)}
                aria-label="Filter"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
              </button>
              {filterOpen && (
                <div className="filter-dropdown">
                  {dropdownCategories.map(cat => (
                    <button
                      key={cat}
                      className={filter === cat ? 'active' : ''}
                      onClick={() => { setFilter(cat); setFilterOpen(false); }}
                    >
                      {cat === 'all' ? 'All Categories' : cat}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <section className="catalogue-section">
          <h2>{heading}</h2>

          {loading && <p className="state-msg">Loading products...</p>}

          {!loading && error && (
            <div className="state-msg error-msg">
              <p>Unable to load products.</p>
              <button type="button" className="retry-btn" onClick={fetchProducts}>Retry</button>
            </div>
          )}

          {!loading && !error && searched.length === 0 && (
            <p className="state-msg">
              {filter !== 'all'
                ? `No products found in ${filter}.`
                : 'No products available.'}
            </p>
          )}

          {!loading && !error && groups.map(group => (
            <div key={group.category} className="category-group">
              {groups.length > 1 && <h3 className="category-heading">{group.category}</h3>}
              {group.shops.map(shop => (
                <div key={shop.sellerId} className="shop-group">
                  <h4 className="shop-heading">{shop.shopName}</h4>
                  <div className="products-grid">
                    {shop.products.map(p => (
                      <ProductCard key={p.id} product={p} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </section>
      </div>
      <BottomNav />
      <style>{`
        .home-page { min-height: 100vh; background: var(--bg-alt); padding-bottom: 80px; }
        .home-content { max-width: 1200px; margin: 0 auto; padding: 24px; }
        .search-section { margin-bottom: 24px; }
        .search-bar {
          display: flex;
          gap: 12px;
          max-width: 600px;
        }
        .search-bar input {
          flex: 1;
          padding: 14px 20px;
          border: 2px solid #e0e0e0;
          border-radius: 10px;
          font-size: 1rem;
          font-family: inherit;
        }
        .search-bar input:focus {
          outline: none;
          border-color: #FF4800;
        }
        .filter-wrapper { position: relative; }
        .filter-icon-btn {
          padding: 14px 18px;
          border: 2px solid #e0e0e0;
          border-radius: 10px;
          background: white;
          color: #666;
          display: flex;
          align-items: center;
        }
        .filter-icon-btn:hover {
          border-color: #FF4800;
          color: #FF4800;
        }
        .filter-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 8px;
          background: white;
          border-radius: 10px;
          box-shadow: var(--shadow);
          padding: 8px;
          min-width: 180px;
          z-index: 50;
          max-height: 320px;
          overflow-y: auto;
        }
        .filter-dropdown button {
          display: block;
          width: 100%;
          padding: 10px 16px;
          text-align: left;
          border-radius: 8px;
          font-size: 0.95rem;
          background: none;
          color: #333;
        }
        .filter-dropdown button:hover {
          background: #fff5f0;
          color: #FF4800;
        }
        .filter-dropdown button.active {
          background: #fff5f0;
          color: #FF4800;
          font-weight: 700;
        }
        .banner-slider {
          position: relative;
          border-radius: 16px;
          overflow: hidden;
          margin-bottom: 40px;
          height: 320px;
        }
        .banner-track {
          display: flex;
          transition: transform 0.5s ease;
          height: 100%;
        }
        .banner-slide {
          flex: 0 0 100%;
          position: relative;
          height: 100%;
        }
        .banner-slide img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .banner-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, rgba(0,0,0,0.5) 0%, transparent 60%);
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 48px;
          color: white;
        }
        .banner-overlay h2 { font-size: 2rem; margin-bottom: 8px; }
        .banner-overlay p { font-size: 1.1rem; margin-bottom: 20px; opacity: 0.9; }
        .banner-cta {
          display: inline-block;
          padding: 12px 28px;
          background: #FF4800;
          color: white;
          font-weight: 700;
          border-radius: 8px;
          width: fit-content;
          transition: all 0.2s;
        }
        .banner-cta:hover {
          background: white;
          color: #FF4800;
        }
        .banner-dots {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 8px;
        }
        .banner-dots button {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: rgba(255,255,255,0.5);
          transition: all 0.2s;
        }
        .banner-dots button.active {
          background: #FF4800;
          width: 28px;
          border-radius: 5px;
        }
        .catalogue-section { margin-bottom: 48px; }
        .catalogue-section > h2 {
          font-size: 1.5rem;
          margin-bottom: 20px;
          color: #FF4800;
        }
        .category-group { margin-bottom: 32px; }
        .category-heading {
          font-size: 1.2rem;
          color: #333;
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 2px solid #ffe4d6;
        }
        .shop-group { margin-bottom: 28px; }
        .shop-heading {
          font-size: 1rem;
          font-weight: 700;
          color: #666;
          margin-bottom: 14px;
        }
        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 24px;
        }
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
        @media (max-width: 768px) {
          .banner-slider { height: 220px; }
          .banner-overlay { padding: 24px; }
          .banner-overlay h2 { font-size: 1.5rem; }
          .search-bar { flex-direction: column; }
        }
      `}</style>
    </div>
  )
}
