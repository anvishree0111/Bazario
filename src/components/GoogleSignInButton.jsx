import { useEffect, useRef, useState } from 'react'
import { getGoogleClientId } from '../api/client'
import { getGoogleCredential, loadGoogleIdentityServices } from '../lib/google'

let initializedClientId = ''
let activeCallback

export default function GoogleSignInButton({ onCredential, disabled }) {
  const ref = useRef(null)
  const callbackRef = useRef(onCredential)
  const [ready, setReady] = useState(Boolean(window.google?.accounts?.id))
  callbackRef.current = onCredential
  activeCallback = (response) => callbackRef.current?.(getGoogleCredential(response))

  useEffect(() => {
    let cancelled = false
    if (!getGoogleClientId()) return undefined
    loadGoogleIdentityServices()
      .then(() => { if (!cancelled) setReady(true) })
      .catch(() => { if (!cancelled) setReady(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const clientId = getGoogleClientId()
    if (!ready || !ref.current || !window.google?.accounts?.id || !clientId) return undefined

    if (initializedClientId !== clientId) {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => activeCallback?.(response),
        cancel_on_tap_outside: true
      })
      initializedClientId = clientId
    }

    ref.current.replaceChildren()
    // GIS only accepts a pixel width (200-400); fit it to the card on phones.
    const available = Math.floor(ref.current.clientWidth || 320)
    window.google.accounts.id.renderButton(ref.current, {
      theme: 'outline', size: 'large', width: Math.max(200, Math.min(320, available)), text: 'continue_with', shape: 'rectangular'
    })
    return undefined
    // Rendered once per mount: toggling `disabled` must not re-render the
    // Google button (it is greyed out and click-blocked with CSS instead).
  }, [ready])

  if (!getGoogleClientId()) return <p className="auth-alert" role="alert">Google sign-in is not configured. Add VITE_GOOGLE_CLIENT_ID to the frontend environment.</p>
  return <div ref={ref} className={`google-signin${disabled ? ' is-disabled' : ''}`} aria-busy={disabled ? 'true' : undefined} aria-label="Continue with Google">{!ready && <span className="auth-status">Loading Google sign-in…</span>}</div>
}
