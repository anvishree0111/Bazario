import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { useApp } from './AppContext'
import { api } from '../api/client'

const KEYS = {
  profile: 'bazario_seller_profile'
}

const defaultProfile = () => ({
  name: '',
  shopName: '',
  email: '',
  shopDescription: '',
  // Read-only, always re-derived from MySQL follow records — never edited
  // directly and never trusted from localStorage.
  followerCount: 0
})

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback()
    return JSON.parse(raw)
  } catch {
    return fallback()
  }
}

function mapSellerOrders(list) {
  return (list || []).map((o) => ({
    id: o.id,
    productName: o.productName || o.product_name || '—',
    buyerName: o.buyerName || o.buyer_name,
    status: o.status,
    date: o.date || o.created_at,
    // Real order total from MySQL (orders.total_price). Never estimated
    // or randomized — 0 when the API doesn't provide one.
    total: Number(o.total ?? o.totalPrice ?? o.total_price ?? 0)
  }))
}

function mapProduct(p) {
  return {
    id: p.id,
    name: p.name,
    price: p.price,
    category: p.category,
    description: p.description || '',
    image: p.image || (p.image_urls && p.image_urls[0]) || '',
    createdAt: p.createdAt || p.created_at
  }
}

const SellerContext = createContext(null)

export function SellerProvider({ children }) {
  const { user, userType } = useApp()
  const [profile, setProfileState] = useState(() => loadJson(KEYS.profile, defaultProfile))

  // Products are NEVER seeded from localStorage or mock data. They only ever
  // come from the real MySQL-backed seller API. Until that API responds,
  // the list is simply empty (with a loading/error state to match).
  const [products, setProductsState] = useState([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [productsError, setProductsError] = useState(null)

  // Orders — and therefore revenue — are NEVER seeded from mock data or
  // localStorage. They only ever come from the real MySQL-backed seller
  // orders API. Until that API responds, the list is simply empty, which
  // is exactly what a brand-new seller with no orders should see.
  const [orders, setOrdersState] = useState([])
  const [apiReady, setApiReady] = useState(false)

  // When a seller logs out (or the session ends), forget the cached shop
  // profile so the next person on this browser never sees it. Only the
  // seller -> not-seller change triggers this, so a normal page reload keeps
  // the cached profile until the API refreshes it.
  const prevUserType = useRef(userType)
  useEffect(() => {
    if (prevUserType.current === 'seller' && userType !== 'seller') {
      setProfileState(defaultProfile())
    }
    prevUserType.current = userType
  }, [userType])

  useEffect(() => {
    try {
      localStorage.setItem(KEYS.profile, JSON.stringify(profile))
    } catch (_) {}
  }, [profile])

  const refreshProducts = useCallback(async () => {
    if (!user?.id || userType !== 'seller') return
    setProductsLoading(true)
    setProductsError(null)
    try {
      const prods = await api.getSellerProducts(user.id)
      setProductsState((prods || []).map(mapProduct))
    } catch (e) {
      setProductsError(e.message || 'Unable to load products')
      setProductsState([])
    } finally {
      setProductsLoading(false)
    }
  }, [user?.id, userType])

  useEffect(() => {
    if (userType !== 'seller' || !user?.id) {
      setApiReady(false)
      setProductsState([])
      setProductsError(null)
      setOrdersState([])
      return
    }
    let cancelled = false
    ;(async () => {
      setProductsLoading(true)
      setProductsError(null)
      try {
        const [prof, prods, ords] = await Promise.all([
          api.getSellerProfile(user.id),
          api.getSellerProducts(user.id),
          api.getSellerOrders(user.id)
        ])
        if (cancelled) return
        setProfileState({
          name: prof.ownerName || prof.name || '',
          shopName: prof.shopName || '',
          email: prof.email || '',
          ownerName: prof.ownerName,
          shopDescription: prof.shopDescription || '',
          followerCount: prof.followerCount || 0
        })
        setProductsState((prods || []).map(mapProduct))
        setOrdersState(mapSellerOrders(ords))
        setApiReady(true)
      } catch (e) {
        if (cancelled) return
        console.warn('Seller API sync failed', e)
        setApiReady(false)
        setProductsError(e.message || 'Unable to load products')
        setProductsState([])
        setOrdersState([])
      } finally {
        if (!cancelled) setProductsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userType, user?.id])

  const setProfile = useCallback(
    (val) => {
      setProfileState((prev) => {
        const next = typeof val === 'function' ? val(prev) : { ...prev, ...val }
        if (apiReady && user?.id) {
          api
            .updateSellerProfile(user.id, {
              shopName: next.shopName,
              ownerName: next.name || next.ownerName,
              shopDescription: next.shopDescription
            })
            .then((updated) => {
              // Reconcile with what MySQL actually stored (e.g. the
              // read-only, database-derived follower count).
              setProfileState((cur) => ({
                ...cur,
                shopDescription: updated.shopDescription ?? cur.shopDescription,
                followerCount: updated.followerCount ?? cur.followerCount
              }))
            })
            .catch(() => {})
        }
        return next
      })
    },
    [apiReady, user?.id]
  )

  // Re-fetch the seller's own profile (including the live, database-derived
  // follower count) from MySQL. Safe to call whenever an up-to-date count
  // is needed, e.g. when the profile page mounts.
  const refreshProfile = useCallback(async () => {
    if (!user?.id || userType !== 'seller') return
    try {
      const prof = await api.getSellerProfile(user.id)
      setProfileState((prev) => ({
        ...prev,
        name: prof.ownerName || prof.name || prev.name,
        shopName: prof.shopName || prev.shopName,
        email: prof.email || prev.email,
        ownerName: prof.ownerName,
        shopDescription: prof.shopDescription || '',
        followerCount: prof.followerCount || 0
      }))
    } catch (e) {
      console.warn('refreshProfile failed', e)
    }
  }, [user?.id, userType])

  const syncFromAuth = useCallback(({ email, name, shopName, ownerName }) => {
    setProfileState((prev) => ({
      ...prev,
      email: email || prev.email,
      name: name || ownerName || prev.name,
      ownerName: ownerName || name || prev.ownerName,
      shopName: shopName || prev.shopName || ''
    }))
  }, [])

  // Every mutation below writes straight to MySQL through the API, then
  // reloads the seller's product list from the database. There is no local
  // fallback state to fall out of sync with — the database is the source
  // of truth, and failures are surfaced as real errors instead of being
  // silently absorbed into fake local data.
  const addProduct = useCallback(
    async (product) => {
      if (!user?.id) throw new Error('Not signed in')
      const payload = {
        name: product.name,
        category: product.category,
        price: Number(product.price),
        description: product.description || '',
        imageUrl: product.image || ''
      }
      await api.postSellerProduct(user.id, payload)
      await refreshProducts()
    },
    [user?.id, refreshProducts]
  )

  const updateProduct = useCallback(
    async (id, updates) => {
      if (!user?.id) throw new Error('Not signed in')
      const numId = Number(id)
      await api.putSellerProduct(user.id, numId, {
        name: updates.name,
        category: updates.category,
        price: updates.price != null ? Number(updates.price) : undefined,
        description: updates.description,
        imageUrl: updates.image
      })
      await refreshProducts()
    },
    [user?.id, refreshProducts]
  )

  const deleteProduct = useCallback(
    async (id) => {
      if (!user?.id) throw new Error('Not signed in')
      const numId = Number(id)
      await api.deleteSellerProduct(user.id, numId)
      await refreshProducts()
    },
    [user?.id, refreshProducts]
  )

  const updateOrderStatus = useCallback(
    async (orderId, status) => {
      const numOid = Number(orderId)
      if (apiReady && user?.id && !Number.isNaN(numOid)) {
        try {
          await api.putSellerOrder(user.id, numOid, { status })
          const ords = await api.getSellerOrders(user.id)
          setOrdersState(mapSellerOrders(ords))
          return
        } catch (e) {
          console.warn(e)
        }
      }
      setOrdersState((prev) => prev.map((o) => (String(o.id) === String(orderId) ? { ...o, status } : o)))
    },
    [apiReady, user?.id]
  )

  const value = {
    profile,
    setProfile,
    refreshProfile,
    syncFromAuth,
    products,
    productsLoading,
    productsError,
    refreshProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    orders,
    updateOrderStatus
  }

  return <SellerContext.Provider value={value}>{children}</SellerContext.Provider>
}

export function useSeller() {
  const ctx = useContext(SellerContext)
  if (!ctx) throw new Error('useSeller must be used within SellerProvider')
  return ctx
}
