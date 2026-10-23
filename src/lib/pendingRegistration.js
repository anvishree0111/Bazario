// A pending registration is the server-signed, short-lived token the backend
// returns after it has verified Google. It is NOT a Google ID token and NOT a
// Bazario session: it only allows finishing registration for that identity.
// sessionStorage keeps it per tab so a reload can resume the profile step.
const key = (role) => `bazario_pending_registration_${role}`

export function savePending(role, { registrationToken, expiresIn, name, email }) {
  try {
    sessionStorage.setItem(key(role), JSON.stringify({ registrationToken, name, email, expiresAt: Date.now() + expiresIn * 1000 }))
  } catch { /* storage unavailable: the user simply restarts */ }
}

export function loadPending(role) {
  try {
    const raw = sessionStorage.getItem(key(role))
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data?.registrationToken || !(data.expiresAt > Date.now())) { sessionStorage.removeItem(key(role)); return null }
    return data
  } catch { return null }
}

export function clearPending(role) {
  try { sessionStorage.removeItem(key(role)) } catch { /* ignore */ }
}
