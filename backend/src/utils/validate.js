// Shared, dependency-free validation helpers.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_RE.test(email.trim())
}

export function normalizeEmail(email) {
  return String(email).trim().toLowerCase()
}
