import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { categories } from '../data/products'

export default function Interests() {
  const navigate = useNavigate()
  const { interests, setInterests } = useApp()
  const [selected, setSelected] = useState(() => interests || [])

  const toggle = (cat) => {
    setSelected(prev =>
      prev.includes(cat)
        ? prev.filter(c => c !== cat)
        : [...prev, cat]
    )
  }

  const [saving, setSaving] = useState(false)
  const handleContinue = async () => {
    setSaving(true)
    setInterests(selected)
    navigate('/home')
  }
  const handleSkip = () => navigate('/home')

  return (
    <div className="interests-page">
      <div className="interests-container">
        <h1>What are your interests?</h1>
        <p className="interests-subtitle">
          Select categories to get personalized product recommendations
        </p>
        <div className="interests-grid">
          {categories.map(cat => (
         <button
              key={cat}
              className={`interest-chip ${selected.includes(cat) ? 'active' : ''}`}
              onClick={() => toggle(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
        <button
          className="continue-btn"
           onClick={handleContinue}
           disabled={saving}
         >
           {saving ? 'Saving…' : 'Save and continue'}
         </button>
         <button className="skip-btn" onClick={handleSkip}>Skip for now</button>
      </div>
      <style>{`
        .interests-page {
          min-height: 100vh;
          padding: 40px 24px;
          background: linear-gradient(180deg, #fff 0%, #fff8f5 100%);
        }
        .interests-container {
          max-width: 700px;
          margin: 0 auto;
        }
        .interests-page h1 {
          font-size: 1.75rem;
          margin-bottom: 8px;
          color: #FF4800;
        }
        .interests-subtitle {
          color: #666;
          margin-bottom: 32px;
        }
        .interests-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 40px;
        }
        .interest-chip {
          padding: 12px 24px;
          border: 2px solid #e0e0e0;
          background: white;
          border-radius: 50px;
          font-size: 1rem;
          font-weight: 600;
          color: #333;
          transition: all 0.2s ease;
        }
        .interest-chip:hover {
          border-color: #FF4800;
          color: #FF4800;
        }
        .interest-chip.active {
          background: #FF4800;
          border-color: #FF4800;
          color: white;
        }
        .continue-btn {
          padding: 16px 48px;
          background: #FF4800;
          color: white;
          font-weight: 700;
          font-size: 1.1rem;
          border-radius: 12px;
        }
         .continue-btn:hover {
          background: #e03f00;
          transform: translateY(-2px);
         }
         .continue-btn:disabled { opacity: .65; cursor: wait; }
         .skip-btn { display: block; margin: 16px auto; background: none; color: #666; font-weight: 600; }
         .skip-btn:hover { color: #FF4800; }
      `}</style>
    </div>
  )
}
