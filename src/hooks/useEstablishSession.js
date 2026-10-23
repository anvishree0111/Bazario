import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useSeller } from '../context/SellerContext'
import { setToken } from '../api/client'

// Called only after the backend has confirmed a login or a completed
// registration: stores the Bazario session and opens the role's dashboard.
export default function useEstablishSession() {
  const navigate = useNavigate()
  const { setUser, setUserType } = useApp()
  const { syncFromAuth } = useSeller()
  return useCallback((data) => {
    setToken(data.token)
    if (data.role === 'buyer') {
      setUser(data.user)
      setUserType('buyer')
      navigate('/home', { replace: true })
    } else {
      setUser({ id: data.seller.id, email: data.seller.email, name: data.seller.ownerName })
      setUserType('seller')
      syncFromAuth({ email: data.seller.email, name: data.seller.ownerName, ownerName: data.seller.ownerName, shopName: data.seller.shopName })
      navigate('/seller/dashboard', { replace: true })
    }
  }, [navigate, setUser, setUserType, syncFromAuth])
}
