import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { clearPending } from '../lib/pendingRegistration'

// One logout for both roles. AppContext.logout() does the real work: it
// removes the stored Bazario token, signs out of Google auto-select, and clears
// the user, role, cart, wishlist, orders and interests held in memory. The
// seller dashboard data is cleared by SellerContext when the role changes.
// Here we also drop any half-finished registration and return to the welcome page.
export default function useLogout() {
  const navigate = useNavigate()
  const { logout } = useApp()
  return useCallback(() => {
    logout()
    clearPending('buyer')
    clearPending('seller')
    navigate('/', { replace: true })
  }, [logout, navigate])
}
