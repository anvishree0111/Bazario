import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import NavBar from '../components/NavBar'
import BottomNav from '../components/BottomNav'
import { useApp } from '../context/AppContext'

export default function Cart() {
  const navigate = useNavigate()
  const { cart, updateCartQuantity, removeFromCart, addOrder } = useApp()
  const [checkoutError, setCheckoutError] = useState(''); const [checkingOut, setCheckingOut] = useState(false)

  const subtotal = cart.reduce((sum, p) => sum + p.price * p.quantity, 0)
  const shipping = subtotal > 500 ? 0 : 99
  const total = subtotal + shipping

  const formatPrice = (n) => `₹${n.toLocaleString('en-IN')}`

  const handleCheckout = async () => {
    setCheckingOut(true); setCheckoutError('')
    try { await addOrder({ items: [...cart], total, subtotal, shipping }); navigate('/orders') }
    catch (e) { setCheckoutError(e.message || 'Checkout failed. Please try again.') }
    finally { setCheckingOut(false) }
  }

  if (cart.length === 0) {
    return (
      <div className="cart-page">
        <NavBar />
        <div className="cart-empty">
          <h2>Your Cart is Empty</h2>
          <p>Add some products to get started!</p>
          <Link to="/home" className="shop-btn">Continue Shopping</Link>
        </div>
        <BottomNav />
        <style>{`
          .cart-page { min-height: 100vh; background: var(--bg-alt); padding-bottom: 80px; }
          .cart-empty {
            max-width: 500px;
            margin: 80px auto;
            text-align: center;
            padding: 48px;
          }
          .cart-empty h2 { color: #FF4800; margin-bottom: 12px; }
          .cart-empty p { color: #666; margin-bottom: 24px; }
          .shop-btn {
            display: inline-block;
            padding: 14px 32px;
            background: #FF4800;
            color: white;
            font-weight: 700;
            border-radius: 10px;
            transition: all 0.2s;
          }
          .shop-btn:hover {
            background: #e03f00;
            transform: translateY(-2px);
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="cart-page">
      <NavBar />
      <BottomNav />
      <div className="cart-content">
        <h1>My Cart</h1>
        <div className="cart-layout">
          <div className="cart-items">
            {cart.map(item => (
              <div key={item.id} className="cart-item">
                <img src={item.image} alt={item.name} />
                <div className="cart-item-info">
                  <h3>{item.name}</h3>
                  <p className="cart-price">{formatPrice(item.price)}</p>
                  <div className="cart-item-actions">
                    <div className="qty-control">
                      <button onClick={() => updateCartQuantity(item.id, item.quantity - 1)}>−</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateCartQuantity(item.id, item.quantity + 1)}>+</button>
                    </div>
                    <button className="remove-btn" onClick={() => removeFromCart(item.id)}>Remove</button>
                  </div>
                </div>
                <div className="cart-item-total">
                  {formatPrice(item.price * item.quantity)}
                </div>
              </div>
            ))}
          </div>
          <div className="cart-summary">
            <h2>Order Summary</h2>
            <div className="summary-row">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="summary-row">
              <span>Shipping</span>
              <span>{shipping === 0 ? 'FREE' : formatPrice(shipping)}</span>
            </div>
            <div className="summary-row total">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
             {checkoutError && <p className="checkout-error">{checkoutError}</p>}
             <button className="checkout-btn" onClick={handleCheckout} disabled={checkingOut}>
               {checkingOut ? 'Processing…' : 'Proceed to Checkout'}
            </button>
          </div>
        </div>
      </div>
      <style>{`
        .cart-page { min-height: 100vh; background: var(--bg-alt); }
        .cart-content { max-width: 1100px; margin: 0 auto; padding: 24px; }
        .cart-content h1 { margin-bottom: 24px; color: #FF4800; }
        .cart-layout {
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 32px;
        }
        .cart-items { display: flex; flex-direction: column; gap: 16px; }
        .cart-item {
          display: flex;
          gap: 24px;
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: var(--shadow);
        }
        .cart-item img {
          width: 120px;
          height: 120px;
          object-fit: cover;
          border-radius: 8px;
        }
        .cart-item-info { flex: 1; }
        .cart-item-info h3 { margin-bottom: 8px; font-size: 1.1rem; color: #333; }
        .cart-price { color: #FF4800; font-weight: 700; margin-bottom: 12px; }
        .cart-item-actions { display: flex; align-items: center; gap: 16px; }
        .qty-control {
          display: flex;
          align-items: center;
          gap: 8px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          padding: 4px;
        }
        .qty-control button {
          width: 32px;
          height: 32px;
          background: #f5f5f5;
          font-size: 1rem;
          font-weight: 700;
          border-radius: 6px;
        }
        .qty-control button:hover { background: #FF4800; color: white; }
        .qty-control span { min-width: 24px; text-align: center; }
        .remove-btn {
          background: none;
          color: #e03f00;
          font-size: 0.9rem;
          font-weight: 600;
        }
        .remove-btn:hover { text-decoration: underline; }
        .cart-item-total {
          font-weight: 700;
          font-size: 1.1rem;
          color: #FF4800;
        }
        .cart-summary {
          background: white;
          padding: 28px;
          border-radius: 12px;
          box-shadow: var(--shadow);
          height: fit-content;
          position: sticky;
          top: 100px;
        }
        .cart-summary h2 { font-size: 1.25rem; margin-bottom: 20px; color: #FF4800; }
        .summary-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          color: #555;
        }
        .summary-row.total {
          font-size: 1.25rem;
          font-weight: 700;
          color: #FF4800;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 2px solid #eee;
        }
        .checkout-btn {
          width: 100%;
          padding: 16px;
          background: #FF4800;
          color: white;
          font-weight: 700;
          font-size: 1.05rem;
          border-radius: 10px;
          margin-top: 24px;
        }
        .checkout-btn:hover {
          background: #e03f00;
          transform: translateY(-2px);
        }
        @media (max-width: 768px) {
          .cart-layout { grid-template-columns: 1fr; }
          .cart-item { flex-wrap: wrap; }
          .cart-item-total { width: 100%; text-align: right; }
        }
      `}</style>
    </div>
  )
}
