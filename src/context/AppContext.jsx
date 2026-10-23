import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { api, getToken, setToken } from '../api/client'


function mapCartItem(p) {
  return {
    id: p.id,
    name: p.name,
    price: p.price,
    image: p.image,
    category: p.category,
    description: p.description,
    quantity: p.quantity
  }
}

function mapOrdersFromApi(list) {
  return (list || []).map((o) => ({
    ...o,
    date: o.date || o.created_at,
    items: (o.items || []).map((it) => ({
      ...it,
      image: it.image,
      name: it.name,
      price: it.price,
      quantity: it.quantity
    }))
  }))
}

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userType, setUserType] = useState(null)
  // False until an existing Bazario token (if any) has been checked with the
  // backend, so route guards do not bounce a signed-in user to a login page.
  const [authReady, setAuthReady] = useState(() => !getToken())
  const [interests, setInterestsState] = useState([])
  const [cart, setCart] = useState([])
  const [wishlist, setWishlist] = useState([])
  const [orders, setOrders] = useState([])
  const apiBuyerRef = useRef(false)

  // Restore the session from the stored token. The backend decides whether
  // the token is still valid and which role it belongs to.
  useEffect(() => {
    if (!getToken()) return undefined
    let cancelled = false
    api.getSession()
      .then((data) => {
        if (cancelled) return
        if (data.role === 'buyer' && data.user) {
          setUser(data.user)
          setUserType('buyer')
        } else if (data.role === 'seller' && data.seller) {
          setUser({ id: data.seller.id, email: data.seller.email, name: data.seller.ownerName })
          setUserType('seller')
        } else {
          setToken(null)
        }
      })
      .catch((e) => {
        if (cancelled) return
        // Only an explicit rejection clears the token; a network failure keeps it.
        if (e.status === 401 || e.status === 403) {
          setToken(null)
          try { sessionStorage.setItem('bazario_session_expired', '1') } catch { /* ignore */ }
        }
      })
      .finally(() => { if (!cancelled) setAuthReady(true) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!user?.id || userType !== 'buyer') {
      apiBuyerRef.current = false
      return
    }
    let cancelled = false
    apiBuyerRef.current = true
    ;(async () => {
      try {
        const [cartData, wishData, orderData, profile] = await Promise.all([
          api.getCart(user.id),
          api.getWishlist(user.id),
          api.getOrders(user.id),
          api.getBuyerProfile(user.id).catch(() => null)
        ])
        if (cancelled) return
        setCart((cartData || []).map(mapCartItem))
        setWishlist(wishData || [])
        setOrders(mapOrdersFromApi(orderData))
        if (profile && profile.interests != null) {
          const ints = Array.isArray(profile.interests) ? profile.interests : []
          setInterestsState(ints)
        }
      } catch (e) {
        if (e.message?.includes('401') || e.message?.includes('403') || e.message?.toLowerCase().includes('token')) logout()
        else console.warn('Buyer API sync failed', e)
        apiBuyerRef.current = false
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id, userType])

  const setInterests = useCallback((val) => {
    setInterestsState((prev) => {
      const next = typeof val === 'function' ? val(prev) : val
      if (user?.id && userType === 'buyer') {
        api.updateBuyerProfile(user.id, { interests: next }).catch(() => {})
        api.recordEvent(user.id, { eventType: 'interest_change', eventKey: `interest:${Date.now()}`, metadata: { interests: next } }).catch(() => {})
      }
      return next
    })
  }, [user?.id, userType])

  const addToCart = useCallback(
    async (product, quantity = 1) => {
      const pid = product.id
      setCart((prev) => {
        const existing = prev.find((p) => p.id === pid)
        if (existing) {
          return prev.map((p) => (p.id === pid ? { ...p, quantity: p.quantity + quantity } : p))
        }
        return [...prev, { ...product, quantity }]
      })
      if (user?.id && userType === 'buyer') {
        try {
           await api.postCart(user.id, pid, quantity)
           api.recordEvent(user.id, { eventType: 'cart_add', eventKey: `cart_add:${pid}:${Date.now()}`, productId: pid, metadata: { quantity } }).catch(() => {})
          const cartData = await api.getCart(user.id)
          setCart((cartData || []).map(mapCartItem))
        } catch (e) {
          console.warn('addToCart API failed', e)
        }
      }
    },
    [user, userType]
  )

  const updateCartQuantity = useCallback(
    async (productId, quantity) => {
      if (quantity <= 0) {
        setCart((prev) => prev.filter((p) => p.id !== productId))
        if (user?.id && userType === 'buyer') {
          try {
            await api.deleteCartItem(user.id, productId)
            api.recordEvent(user.id, { eventType: 'cart_remove', eventKey: `cart_remove:${productId}:${Date.now()}`, productId }).catch(() => {})
            const cartData = await api.getCart(user.id)
            setCart((cartData || []).map(mapCartItem))
          } catch (e) {
            console.warn(e)
          }
        }
        return
      }
      setCart((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, quantity } : p))
      )
      if (user?.id && userType === 'buyer') {
        try {
          await api.putCartItem(user.id, productId, quantity)
          const cartData = await api.getCart(user.id)
          setCart((cartData || []).map(mapCartItem))
        } catch (e) {
          console.warn(e)
        }
      }
    },
    [user, userType]
  )

  const removeFromCart = useCallback(
    async (productId) => {
      setCart((prev) => prev.filter((p) => p.id !== productId))
      if (user?.id && userType === 'buyer') {
        try {
          await api.deleteCartItem(user.id, productId)
          api.recordEvent(user.id, { eventType: 'cart_remove', eventKey: `cart_remove:${productId}:${Date.now()}`, productId }).catch(() => {})
          const cartData = await api.getCart(user.id)
          setCart((cartData || []).map(mapCartItem))
        } catch (e) {
          console.warn(e)
        }
      }
    },
    [user, userType]
  )

  const toggleWishlist = useCallback(
    async (product) => {
      const pid = product.id
      const exists = wishlist.some((p) => p.id === pid)
      setWishlist((prev) => {
        if (exists) return prev.filter((p) => p.id !== pid)
        return [...prev, product]
      })
      if (user?.id && userType === 'buyer') {
        try {
          if (exists) await api.deleteWishlist(user.id, pid)
          else await api.postWishlist(user.id, pid)
          api.recordEvent(user.id, { eventType: exists ? 'wishlist_remove' : 'wishlist_add', eventKey: `wishlist:${pid}:${Date.now()}`, productId: pid }).catch(() => {})
          const list = await api.getWishlist(user.id)
          setWishlist(list || [])
        } catch (e) {
          console.warn(e)
        }
      }
    },
    [user, userType, wishlist]
  )

  const isInWishlist = useCallback(
    (productId) => wishlist.some((p) => p.id === productId),
    [wishlist]
  )

  const addOrder = useCallback(
    async (order) => {
      const { items, total, subtotal, shipping } = order
      if (user?.id && userType === 'buyer') {
        try {
          await api.postOrder(user.id, { items, total, subtotal, shipping: shipping ?? 0 })
          const orderData = await api.getOrders(user.id)
          setOrders(mapOrdersFromApi(orderData))
          const cartData = await api.getCart(user.id)
          setCart((cartData || []).map(mapCartItem))
           // Checkout records the purchase event inside the same database
           // transaction as the order. Do not emit a second client-timed event.
           return true
        } catch (e) {
          console.warn('postOrder API failed', e)
        }
      }
      throw new Error('Checkout requires a signed-in buyer and a reachable server.')
    },
    [user, userType]
  )

  const logout = useCallback(() => {
    window.google?.accounts?.id?.disableAutoSelect?.()
    setUser(null)
    setUserType(null)
    setInterestsState([])
    setToken(null)
    setCart([])
    setWishlist([])
    setOrders([])
  }, [])

  useEffect(() => {
    const handleInvalidSession = () => {
      try { sessionStorage.setItem('bazario_session_expired', '1') } catch { /* ignore */ }
      logout()
    }
    window.addEventListener('bazario:session-invalid', handleInvalidSession)
    return () => window.removeEventListener('bazario:session-invalid', handleInvalidSession)
  }, [logout])

  const value = {
    user,
    setUser,
    authReady,
    userType,
    setUserType,
    interests,
    setInterests,
    cart,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    wishlist,
    toggleWishlist,
    isInWishlist,
    orders,
    addOrder,
    logout
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
