import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import SellerLayout from '../../components/seller/SellerLayout'
import { useSeller } from '../../context/SellerContext'
import { categories } from '../../data/products'

export default function SellerProductFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const { products, addProduct, updateProduct } = useSeller()

  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState(categories[0] || '')
  const [description, setDescription] = useState('')
  const [image, setImage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  useEffect(() => {
    if (!isEdit) return
    const p = products.find(x => String(x.id) === String(id))
    if (p) {
      setName(p.name)
      setPrice(String(p.price))
      setCategory(p.category || categories[0])
      setDescription(p.description || '')
      setImage(p.image || '')
    }
  }, [isEdit, id, products])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name || !price || !image) return
    setFormError(null)
    setSubmitting(true)
    const payload = { name, price, category, description, image }
    try {
      if (isEdit) await updateProduct(id, payload)
      else await addProduct(payload)
      navigate('/seller/products')
    } catch (err) {
      setFormError(err.message || 'Unable to save product. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SellerLayout>
      <h1 className="pf-title">{isEdit ? 'Edit Product' : 'Add Product'}</h1>
      <form className="pf-form" onSubmit={handleSubmit}>
        <label>
          Product Name
          <input value={name} onChange={e => setName(e.target.value)} required placeholder="Product name" />
        </label>
        <label>
          Category
          <select value={category} onChange={e => setCategory(e.target.value)}>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Price (₹)
          <input
            type="number"
            min="0"
            step="1"
            value={price}
            onChange={e => setPrice(e.target.value)}
            required
            placeholder="0"
          />
        </label>
        <label>
          Description
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
            placeholder="Product description"
          />
        </label>
        <label>
          Image URL
          <input value={image} onChange={e => setImage(e.target.value)} required placeholder="https://..." />
        </label>
        {formError && <p className="pf-error">{formError}</p>}
        <button type="submit" className="pf-submit" disabled={submitting}>
          {submitting ? 'Saving...' : (isEdit ? 'Save Changes' : 'Add Product')}
        </button>
      </form>
      <style>{`
        .pf-title { font-size: 1.75rem; color: #FF4800; margin-bottom: 24px; }
        .pf-form {
          max-width: 560px;
          background: white;
          padding: 32px;
          border-radius: 16px;
          box-shadow: var(--shadow, 0 2px 12px rgba(0,0,0,0.08));
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .pf-form label {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-weight: 600;
          color: #333;
          font-size: 0.95rem;
        }
        .pf-form input,
        .pf-form select,
        .pf-form textarea {
          padding: 14px 16px;
          border: 2px solid #e0e0e0;
          border-radius: 10px;
          font-size: 1rem;
          font-family: inherit;
        }
        .pf-form input:focus,
        .pf-form select:focus,
        .pf-form textarea:focus {
          outline: none;
          border-color: #FF4800;
        }
        .pf-submit {
          padding: 16px;
          background: #FF4800;
          color: white;
          font-weight: 700;
          font-size: 1.05rem;
          border-radius: 10px;
          margin-top: 8px;
        }
        .pf-submit:hover { background: #e03f00; transform: translateY(-1px); }
        .pf-submit:disabled { opacity: 0.7; transform: none; cursor: default; }
        .pf-error {
          margin: -8px 0 0;
          padding: 12px 16px;
          background: #fff5f0;
          color: #e03f00;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 600;
        }
      `}</style>
    </SellerLayout>
  )
}
