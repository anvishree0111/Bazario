import { useState, useEffect } from 'react'
import SellerLayout from '../../components/seller/SellerLayout'
import Logo from '../../components/Logo'
import { useSeller } from '../../context/SellerContext'
import useLogout from '../../hooks/useLogout'

export default function SellerProfilePage() {
  const { profile, setProfile, refreshProfile } = useSeller()
  const handleLogout = useLogout()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(profile.name)
  const [shopName, setShopName] = useState(profile.shopName)
  const [email, setEmail] = useState(profile.email)
  const [shopDescription, setShopDescription] = useState(profile.shopDescription || '')

  // Pull the latest MySQL-backed follower count (and description) whenever
  // the profile page is opened, so it never shows a stale number.
  useEffect(() => {
    refreshProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openEdit = () => {
    setName(profile.name)
    setShopName(profile.shopName)
    setEmail(profile.email)
    setShopDescription(profile.shopDescription || '')
    setEditing(true)
  }

  const save = (e) => {
    e.preventDefault()
    setProfile({ name, shopName, email, shopDescription })
    setEditing(false)
  }

  return (
    <SellerLayout>
      <div className="prof-card">
        <div className="prof-logo-row">
          <Logo size={80} />
        </div>
        <h1>Seller Profile</h1>
        {!editing ? (
          <>
            <dl className="prof-dl">
              <dt>Name</dt>
              <dd>{profile.name || '—'}</dd>
              <dt>Shop Name</dt>
              <dd>{profile.shopName || '—'}</dd>
              <dt>Email</dt>
              <dd>{profile.email || '—'}</dd>
              <dt>Shop Description</dt>
              <dd className={!profile.shopDescription ? 'muted' : ''}>
                {profile.shopDescription || 'No description added yet.'}
              </dd>
              <dt>Followers</dt>
              <dd className="followers-value">{profile.followerCount ?? 0}</dd>
            </dl>
            <div className="prof-actions">
              <button type="button" className="prof-edit-btn" onClick={openEdit}>
                Edit profile
              </button>
              <button type="button" className="prof-logout-btn" onClick={handleLogout}>
                Log out
              </button>
            </div>
          </>
        ) : (
          <form className="prof-form" onSubmit={save}>
            <label>
              Name
              <input value={name} onChange={e => setName(e.target.value)} required />
            </label>
            <label>
              Shop Name
              <input value={shopName} onChange={e => setShopName(e.target.value)} required />
            </label>
            <label>
              Email
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </label>
            <label>
              Shop Description
              <textarea
                value={shopDescription}
                onChange={e => setShopDescription(e.target.value)}
                rows={4}
                placeholder="Tell buyers what your shop is about..."
              />
            </label>
            <div className="prof-readonly-row">
              <span>Followers</span>
              <strong>{profile.followerCount ?? 0}</strong>
            </div>
            <div className="prof-form-actions">
              <button type="button" className="prof-cancel" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button type="submit" className="prof-save">Save</button>
            </div>
          </form>
        )}
      </div>
      <style>{`
        .prof-card {
          max-width: 520px;
          background: white;
          padding: 32px;
          border-radius: 16px;
          box-shadow: var(--shadow, 0 2px 12px rgba(0,0,0,0.08));
        }
        .prof-logo-row {
          margin-bottom: 20px;
        }
        .prof-card h1 {
          font-size: 1.5rem;
          color: #FF4800;
          margin-bottom: 24px;
        }
        .prof-dl {
          display: grid;
          gap: 12px;
          margin-bottom: 24px;
        }
        .prof-dl dt {
          font-size: 0.8rem;
          font-weight: 700;
          color: #FF4800;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .prof-dl dd {
          font-size: 1.05rem;
          color: #333;
          margin-bottom: 8px;
          white-space: pre-wrap;
        }
        .prof-dl dd.muted {
          color: #999;
          font-style: italic;
        }
        .prof-dl dd.followers-value {
          font-weight: 700;
          color: #FF4800;
        }
        .prof-edit-btn {
          padding: 14px 28px;
          background: #FF4800;
          color: white;
          font-weight: 700;
          border-radius: 10px;
        }
        .prof-edit-btn:hover { background: #e03f00; }
        .prof-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }
        .prof-logout-btn {
          padding: 14px 28px;
          background: white;
          border: 2px solid #FF4800;
          color: #FF4800;
          font-weight: 700;
          border-radius: 10px;
        }
        .prof-logout-btn:hover { background: #FF4800; color: white; }
        .prof-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .prof-form label {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-weight: 600;
          color: #333;
        }
        .prof-form input {
          padding: 12px 14px;
          border: 2px solid #e0e0e0;
          border-radius: 10px;
          font-family: inherit;
        }
        .prof-form input:focus, .prof-form textarea:focus {
          outline: none;
          border-color: #FF4800;
        }
        .prof-form textarea {
          padding: 12px 14px;
          border: 2px solid #e0e0e0;
          border-radius: 10px;
          font-family: inherit;
          font-size: 1rem;
          resize: vertical;
        }
        .prof-readonly-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          background: #f8f8f8;
          border-radius: 10px;
          color: #666;
          font-weight: 600;
        }
        .prof-readonly-row strong {
          color: #FF4800;
          font-size: 1.1rem;
        }
        .prof-form-actions {
          display: flex;
          gap: 12px;
          margin-top: 8px;
        }
        .prof-cancel {
          flex: 1;
          padding: 12px;
          background: white;
          border: 2px solid #e0e0e0;
          font-weight: 600;
          border-radius: 10px;
        }
        .prof-save {
          flex: 1;
          padding: 12px;
          background: #FF4800;
          color: white;
          font-weight: 700;
          border-radius: 10px;
        }
        .prof-save:hover { background: #e03f00; }
      `}</style>
    </SellerLayout>
  )
}
