// Turns backend auth errors into user-facing text and (where useful) a link.
// Only these four internal routes are ever offered as links.
const LINKS = {
  '/login': 'Sign in as a buyer',
  '/login/seller': 'Sign in as a seller',
  '/register': 'Create a buyer account',
  '/register/seller': 'Create a seller account'
}

export const GOOGLE_FAILED = 'We couldn\u2019t sign you in with Google. Please try again.'
export const SERVER_FAILED = 'Something went wrong on our side. Please try again in a moment.'
export const SESSION_EXPIRED = 'Your session has expired. Please sign in again.'
export const EXPIRED_FLAG = 'bazario_session_expired'

const SERVER_TEXT_CODES = new Set([
  'ALREADY_REGISTERED', 'ROLE_CONFLICT', 'WRONG_ROLE', 'ACCOUNT_NOT_FOUND', 'ACCOUNT_CONFLICT',
  'REGISTRATION_CONFLICT', 'REGISTRATION_EXPIRED', 'INVALID_PROFILE', 'SESSION_INVALID'
])

export function describeAuthError(err) {
  const code = err?.code
  const to = LINKS[err?.redirectTo] ? err.redirectTo : null
  const link = to ? { to, label: LINKS[to] } : null
  if (code === 'NETWORK') return { message: err.message, link: null, code }
  if (code === 'GOOGLE_AUTH_FAILED') return { message: GOOGLE_FAILED, link: null, code }
  if (SERVER_TEXT_CODES.has(code)) return { message: err.message, link, code, fieldErrors: err.fieldErrors }
  if (code === 'AUTH_NOT_CONFIGURED' || err?.status >= 500) return { message: SERVER_FAILED, link: null, code }
  return { message: GOOGLE_FAILED, link: null, code }
}
