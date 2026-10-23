import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import AuthLayout from '../components/auth/AuthLayout'
import AuthAlert from '../components/auth/AuthAlert'
import GoogleSignInButton from '../components/GoogleSignInButton'
import useEstablishSession from '../hooks/useEstablishSession'
import { api } from '../api/client'
import { categories } from '../data/products'
import { describeAuthError, GOOGLE_FAILED } from '../lib/authMessages'
import { clearPending, loadPending, savePending } from '../lib/pendingRegistration'

const REQUIRED = 'Please complete the required fields to continue.'

const COPY = {
  buyer: {
    title: 'Create your buyer account',
    subtitle: 'Discover products and shops on Bazario.',
    footer: <>Already have an account? <Link to="/login">Sign in</Link></>
  },
  seller: {
    title: 'Create your seller account',
    subtitle: 'Set up your shop and start selling on Bazario.',
    footer: <>Already have a seller account? <Link to="/login/seller">Sign in</Link></>
  }
}

function Field({ id, label, required, optional = true, hint, error, children }) {
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}{required ? <span className="auth-req" aria-hidden="true"> *</span> : optional ? <span className="auth-opt"> (optional)</span> : null}</label>
      {children}
      {hint && !error && <p className="auth-hint" id={`${id}-hint`}>{hint}</p>}
      {error && <p className="auth-field-error" id={`${id}-error`}>{error}</p>}
    </div>
  )
}

// Registration, in two explicit steps: (1) verify Google, (2) complete the
// profile. The account is only created by step 2, on the backend.
export default function Register({ buyer = false }) {
  const role = buyer ? 'buyer' : 'seller'
  const copy = COPY[role]
  const establish = useEstablishSession()
  const inFlight = useRef(false)
  const headingRef = useRef(null)
  const [pending, setPending] = useState(() => loadPending(role))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [form, setForm] = useState(() => ({ name: pending?.name || '', interests: [], shopName: '', shopDescription: '' }))

  useEffect(() => { if (pending) headingRef.current?.focus() }, [pending])

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  const toggleInterest = (cat) => setForm((f) => ({ ...f, interests: f.interests.includes(cat) ? f.interests.filter((c) => c !== cat) : [...f.interests, cat] }))

  const restart = (message) => {
    clearPending(role)
    setPending(null)
    setFieldErrors({})
    if (message !== undefined) setError(message)
  }

  const onCredential = useCallback(async (credential) => {
    if (inFlight.current) return
    if (!credential) { setError({ message: GOOGLE_FAILED }); return }
    inFlight.current = true
    setSubmitting(true)
    setError(null)
    try {
      const data = await api.startGoogleRegistration(credential, role)
      savePending(role, { registrationToken: data.registrationToken, expiresIn: data.expiresIn, name: data.profile.name, email: data.profile.email })
      setForm((f) => ({ ...f, name: data.profile.name || f.name }))
      setPending(loadPending(role))
    } catch (err) {
      setError(describeAuthError(err))
    } finally {
      inFlight.current = false
      setSubmitting(false)
    }
  }, [role])

  const validate = () => {
    const errors = {}
    if (!form.name.trim()) errors.name = role === 'seller' ? 'Enter the owner\u2019s full name.' : 'Enter your full name.'
    if (role === 'seller' && !form.shopName.trim()) errors.shopName = 'Enter your shop name.'
    return errors
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (inFlight.current) return
    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length) {
      setError({ message: REQUIRED })
      document.getElementById(Object.keys(errors)[0] === 'name' ? 'reg-name' : 'reg-shop')?.focus()
      return
    }
    inFlight.current = true
    setSubmitting(true)
    setError(null)
    try {
      const profile = role === 'buyer'
        ? { name: form.name, interests: form.interests }
        : { name: form.name, shopName: form.shopName, shopDescription: form.shopDescription }
      const data = await api.completeGoogleRegistration(pending.registrationToken, role, profile)
      clearPending(role)
      establish(data)
    } catch (err) {
      const described = describeAuthError(err)
      if (err.fieldErrors) setFieldErrors(err.fieldErrors)
      if (['REGISTRATION_EXPIRED', 'ALREADY_REGISTERED', 'ROLE_CONFLICT'].includes(err.code)) restart(described)
      else setError(described)
    } finally {
      inFlight.current = false
      setSubmitting(false)
    }
  }

  // Step 1: Google
  if (!pending) {
    return (
      <AuthLayout ref={headingRef} title={copy.title} subtitle={copy.subtitle} footer={copy.footer}>
        <AuthAlert error={error} />
        <GoogleSignInButton onCredential={onCredential} disabled={submitting} />
        <p className="auth-status" role="status" aria-live="polite">{submitting ? 'Verifying your Google account…' : ''}</p>
      </AuthLayout>
    )
  }

  // Step 2: profile completion
  const isSeller = role === 'seller'
  return (
    <AuthLayout
      ref={headingRef}
      wide
      title={isSeller ? 'Tell us about you and your shop' : 'Finish your buyer profile'}
      subtitle={isSeller ? 'Your Google account is verified. Add your details to open your shop.' : 'Your Google account is verified. Add a few details to finish.'}
      footer={<button type="button" className="auth-link-btn" onClick={() => restart(null)} disabled={submitting}>Use a different Google account</button>}
    >
      <AuthAlert error={error} />
      <form className="auth-form" onSubmit={onSubmit} noValidate aria-busy={submitting}>
        <fieldset disabled={submitting}>
          {isSeller && <legend>About you (the owner)</legend>}
          <Field id="reg-name" label={isSeller ? 'Owner\u2019s full name' : 'Full name'} required error={fieldErrors.name}>
            <input id="reg-name" type="text" autoComplete="name" value={form.name} onChange={set('name')} maxLength={255}
              aria-required="true" aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? 'reg-name-error' : undefined} />
          </Field>
          <Field id="reg-email" label="Email" optional={false} hint={'Verified by Google. This can\u2019t be changed here.'}>
            <input id="reg-email" type="email" value={pending.email} readOnly aria-readonly="true" aria-describedby="reg-email-hint" />
          </Field>
        </fieldset>

        {isSeller ? (
          <fieldset disabled={submitting}>
            <legend>About your shop</legend>
            <Field id="reg-shop" label="Shop name" required error={fieldErrors.shopName}>
              <input id="reg-shop" type="text" autoComplete="organization" value={form.shopName} onChange={set('shopName')} maxLength={255}
                aria-required="true" aria-invalid={Boolean(fieldErrors.shopName)} aria-describedby={fieldErrors.shopName ? 'reg-shop-error' : undefined} />
            </Field>
            <Field id="reg-desc" label="Shop description" required={false} error={fieldErrors.shopDescription}>
              <textarea id="reg-desc" rows={4} value={form.shopDescription} onChange={set('shopDescription')} maxLength={2000} />
            </Field>
          </fieldset>
        ) : (
          <fieldset disabled={submitting}>
            <legend>Shopping interests <span className="auth-opt">(optional)</span></legend>
            <div className="auth-chips">
              {categories.map((cat) => (
                <button type="button" key={cat} className={`auth-chip${form.interests.includes(cat) ? ' active' : ''}`} aria-pressed={form.interests.includes(cat)} onClick={() => toggleInterest(cat)}>{cat}</button>
              ))}
            </div>
          </fieldset>
        )}

        <button type="submit" className="auth-submit" disabled={submitting}>
          {submitting ? 'Creating your account…' : isSeller ? 'Create seller account' : 'Create buyer account'}
        </button>
        <p className="auth-status" role="status" aria-live="polite">{submitting ? 'Saving your details…' : ''}</p>
      </form>
    </AuthLayout>
  )
}
