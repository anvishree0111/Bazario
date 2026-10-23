import { useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import BottomNav from '../components/BottomNav'
import { useApp } from '../context/AppContext'
import useLogout from '../hooks/useLogout'

export default function Account() {
  const navigate = useNavigate()
  const { user } = useApp()
  const handleLogout = useLogout()

  return (
    <div className="account-page">
      <NavBar />
      <BottomNav />
      <div className="account-content">
        <h1>Account</h1>
        <div className="account-card">
          <div className="profile-header">
            <div className="profile-avatar">U</div>
            <div className="profile-info">
              <h2>{user?.name || 'User'}</h2>
              <p>{user?.email || 'user@example.com'}</p>
            </div>
          </div>
          <div className="account-sections">
            <section>
              <h3>Profile Details</h3>
              <p>Manage your personal information and preferences.</p>
            </section>
            <section>
              <h3>Settings</h3>
              <p>Customize your notification and privacy settings.</p>
            </section>
            <section>
              <h3>Order History</h3>
              <p>View and track all your past orders.</p>
              <button className="link-btn" onClick={() => navigate('/orders')}>
                View Orders
              </button>
            </section>
            <section>
              <h3>Preferences</h3>
              <p>Update your product interests and recommendations.</p>
              <button className="link-btn" onClick={() => navigate('/interests')}>
                Edit Interests
              </button>
            </section>
          </div>
          <button
            className="switch-seller-btn"
            onClick={() => navigate('/login/seller')}
          >
            Switch to Seller Login
          </button>
          <button type="button" className="logout-btn" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </div>
      <style>{`
        .account-page { min-height: 100vh; background: var(--bg-alt); padding-bottom: 80px; }
        .account-content { max-width: 700px; margin: 0 auto; padding: 24px; }
        .account-content h1 { margin-bottom: 24px; color: #FF4800; }
        .account-card {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: var(--shadow);
        }
        .profile-header {
          display: flex;
          align-items: center;
          gap: 24px;
          padding: 32px;
          background: linear-gradient(135deg, #fff5f0 0%, #fff 100%);
        }
        .profile-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: #FF4800;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          font-weight: 900;
        }
        .profile-info h2 { font-size: 1.5rem; color: #333; margin-bottom: 4px; }
        .profile-info p { color: #666; }
        .account-sections { padding: 24px 32px; }
        .account-sections section {
          padding: 20px 0;
          border-bottom: 1px solid #eee;
        }
        .account-sections section:last-of-type { border-bottom: none; }
        .account-sections h3 {
          font-size: 1.1rem;
          color: #FF4800;
          margin-bottom: 8px;
        }
        .account-sections p { color: #555; margin-bottom: 12px; }
        .link-btn {
          background: none;
          color: #FF4800;
          font-weight: 600;
          font-size: 0.95rem;
        }
        .link-btn:hover { text-decoration: underline; }
        .switch-seller-btn {
          display: block;
          width: calc(100% - 64px);
          margin: 24px 32px 32px;
          padding: 16px;
          background: white;
          border: 2px solid #FF4800;
          color: #FF4800;
          font-weight: 700;
          font-size: 1rem;
          border-radius: 10px;
        }
        .switch-seller-btn:hover {
          background: #FF4800;
          color: white;
          transform: translateY(-2px);
        }
        .logout-btn {
          display: block;
          width: calc(100% - 64px);
          margin: -8px 32px 32px;
          padding: 16px;
          background: #FF4800;
          border: 2px solid #FF4800;
          color: white;
          font-weight: 700;
          font-size: 1rem;
          border-radius: 10px;
        }
        .logout-btn:hover { background: #e03f00; border-color: #e03f00; }
      `}</style>
    </div>
  )
}
