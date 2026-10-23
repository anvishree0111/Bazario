import { Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { SellerProvider } from './context/SellerContext'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Interests from './pages/Interests'
import Home from './pages/Home'
import ProductDetails from './pages/ProductDetails'
import Shop from './pages/Shop'
import Cart from './pages/Cart'
import Wishlist from './pages/Wishlist'
import Orders from './pages/Orders'
import Account from './pages/Account'
import SellerDashboardPage from './pages/seller/SellerDashboardPage'
import SellerProductsPage from './pages/seller/SellerProductsPage'
import SellerProductFormPage from './pages/seller/SellerProductFormPage'
import SellerOrdersPage from './pages/seller/SellerOrdersPage'
import SellerProfilePage from './pages/seller/SellerProfilePage'

function AuthLoading() {
  return <div role="status" aria-live="polite" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', color: '#5B4F3F' }}>Loading…</div>
}

function ProtectedBuyer({ children }) {
  const { user, userType, authReady } = useApp()
  if (!authReady) return <AuthLoading />
  if (!user) return <Navigate to="/login" replace />
  if (userType !== 'buyer') return <Navigate to="/" replace />
  return children
}

function BuyerLoginRedirect() {
  const { user, userType, authReady } = useApp()
  if (!authReady) return <AuthLoading />
  if (user && userType === 'buyer') return <Navigate to="/home" replace />
  return <Login buyer />
}

function SellerLoginRedirect() {
  const { user, userType, authReady } = useApp()
  if (!authReady) return <AuthLoading />
  if (user && userType === 'seller') return <Navigate to="/seller/dashboard" replace />
  return <Login />
}

function BuyerRegisterRedirect() {
  const { user, userType, authReady } = useApp()
  if (!authReady) return <AuthLoading />
  if (user && userType === 'buyer') return <Navigate to="/home" replace />
  return <Register buyer />
}

function SellerRegisterRedirect() {
  const { user, userType, authReady } = useApp()
  if (!authReady) return <AuthLoading />
  if (user && userType === 'seller') return <Navigate to="/seller/dashboard" replace />
  return <Register />
}

function ProtectedSeller({ children }) {
  const { user, userType, authReady } = useApp()
  if (!authReady) return <AuthLoading />
  if (!user) return <Navigate to="/login/seller" replace />
  if (userType !== 'seller') return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<BuyerLoginRedirect />} />
      <Route path="/login/seller" element={<SellerLoginRedirect />} />
      <Route path="/register" element={<BuyerRegisterRedirect />} />
      <Route path="/register/seller" element={<SellerRegisterRedirect />} />
      <Route
        path="/interests"
        element={
          <ProtectedBuyer>
            <Interests />
          </ProtectedBuyer>
        }
      />
      <Route
        path="/home"
        element={
          <ProtectedBuyer>
            <Home />
          </ProtectedBuyer>
        }
      />
      <Route
        path="/product/:id"
        element={
          <ProtectedBuyer>
            <ProductDetails />
          </ProtectedBuyer>
        }
      />
      <Route
        path="/shop/:sellerId"
        element={
          <ProtectedBuyer>
            <Shop />
          </ProtectedBuyer>
        }
      />
      <Route
        path="/cart"
        element={
          <ProtectedBuyer>
            <Cart />
          </ProtectedBuyer>
        }
      />
      <Route
        path="/wishlist"
        element={
          <ProtectedBuyer>
            <Wishlist />
          </ProtectedBuyer>
        }
      />
      <Route
        path="/orders"
        element={
          <ProtectedBuyer>
            <Orders />
          </ProtectedBuyer>
        }
      />
      <Route
        path="/account"
        element={
          <ProtectedBuyer>
            <Account />
          </ProtectedBuyer>
        }
      />
      <Route
        path="/seller/dashboard"
        element={
          <ProtectedSeller>
            <SellerDashboardPage />
          </ProtectedSeller>
        }
      />
      <Route
        path="/seller/products"
        element={
          <ProtectedSeller>
            <SellerProductsPage />
          </ProtectedSeller>
        }
      />
      <Route
        path="/seller/add-product"
        element={
          <ProtectedSeller>
            <SellerProductFormPage />
          </ProtectedSeller>
        }
      />
      <Route
        path="/seller/edit-product/:id"
        element={
          <ProtectedSeller>
            <SellerProductFormPage />
          </ProtectedSeller>
        }
      />
      <Route
        path="/seller/orders"
        element={
          <ProtectedSeller>
            <SellerOrdersPage />
          </ProtectedSeller>
        }
      />
      <Route
        path="/seller/profile"
        element={
          <ProtectedSeller>
            <SellerProfilePage />
          </ProtectedSeller>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AppProvider>
      <SellerProvider>
        <AppRoutes />
      </SellerProvider>
    </AppProvider>
  )
}
