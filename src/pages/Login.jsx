import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import AuthLayout from '../components/auth/AuthLayout'
import AuthAlert from '../components/auth/AuthAlert'
import GoogleSignInButton from '../components/GoogleSignInButton'
import useEstablishSession from '../hooks/useEstablishSession'
import { api } from '../api/client'
import { describeAuthError, EXPIRED_FLAG, GOOGLE_FAILED, SESSION_EXPIRED } from '../lib/authMessages'

const COPY = {
  buyer: {
    title: 'Welcome back, buyer',
    subtitle: 'Sign in to continue to Bazario.',
    footer: <>New to Bazario? <Link to="/register">Create a buyer account</Link></>
  },
  seller: {
    title: 'Welcome back, seller',
    subtitle: 'Sign in to manage your shop on Bazario.',
    footer: <>New to selling on Bazario? <Link to="/register/seller">Create a seller account</Link></>
  }
}

// Login only. The backend never creates an account from this screen.
export default function Login({ buyer = false }) {
  const role = buyer ? 'buyer' : 'seller'
  const copy = COPY[role]
  const establish = useEstablishSession()
  const inFlight = useRef(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(() => {
    try {
      if (sessionStorage.getItem(EXPIRED_FLAG)) { sessionStorage.removeItem(EXPIRED_FLAG); return { message: SESSION_EXPIRED } }
    } catch { /* ignore */ }
    return null
  })

  const onCredential = useCallback(async (credential) => {
    if (inFlight.current) return
    if (!credential) { setError({ message: GOOGLE_FAILED }); return }
    inFlight.current = true
    setSubmitting(true)
    setError(null)
    try {
      establish(await api.loginWithGoogle(credential, role))
    } catch (err) {
      setError(describeAuthError(err))
    } finally {
      inFlight.current = false
      setSubmitting(false)
    }
  }, [role, establish])

  return (
    <AuthLayout title={copy.title} subtitle={copy.subtitle} footer={copy.footer}>
      <AuthAlert error={error} />
      <GoogleSignInButton onCredential={onCredential} disabled={submitting} />
      <p className="auth-status" role="status" aria-live="polite">{submitting ? 'Verifying your Google account…' : ''}</p>
    </AuthLayout>
  )
}
