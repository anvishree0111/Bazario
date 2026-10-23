import jwt from 'jsonwebtoken'
import { OAuth2Client } from 'google-auth-library'
import * as authModel from '../models/authModel.js'
import { googleClientId, requiredEnv } from '../config.js'
import { AuthError, createAuthService } from '../services/authService.js'

let googleClient
const REGISTRATION_TTL_SECONDS = 30 * 60

function secret() {
  const value = requiredEnv('JWT_SECRET')
  if (value.length < 32) {
    throw Object.assign(new Error('JWT_SECRET must be configured with at least 32 characters'), { status: 503 })
  }
  return value
}

function signToken({ id, role }) {
  return jwt.sign({ id, role }, secret(), { expiresIn: '7d', issuer: 'bazario-api', audience: 'bazario-client' })
}

// Pending registrations use a different audience, so they can never be used
// as a Bazario session (requireAuth only accepts 'bazario-client').
function issueRegistration({ role, sub, email, name }) {
  const token = jwt.sign({ purpose: 'registration', role, sub, email, name }, secret(), {
    expiresIn: REGISTRATION_TTL_SECONDS, issuer: 'bazario-api', audience: 'bazario-registration'
  })
  return { token, expiresIn: REGISTRATION_TTL_SECONDS }
}

function readRegistration(token) {
  const payload = jwt.verify(token, secret(), { issuer: 'bazario-api', audience: 'bazario-registration' })
  if (payload.purpose !== 'registration') throw new Error('wrong token purpose')
  return payload
}

async function verifyGoogle(idToken) {
  const clientId = googleClientId()
  googleClient ||= new OAuth2Client(clientId)
  const ticket = await googleClient.verifyIdToken({ idToken, audience: clientId })
  const p = ticket.getPayload()
  if (!p?.sub || p.email_verified !== true || !p.email) throw Object.assign(new Error('Google account email is not verified'), { status: 401 })
  return p
}

const service = createAuthService({
  verifyGoogle,
  store: authModel,
  issueSession: signToken,
  issueRegistration,
  readRegistration,
  log: (message, details) => console.error(message, details)
})

function send(res, error) {
  if (error instanceof AuthError) {
    if (error.status >= 500) console.error('Google authentication configuration error')
    return res.status(error.status).json({ error: error.message, code: error.code, ...error.extra })
  }
  // Never leak SQL, stack traces or driver messages.
  console.error('Authentication request failed', {
  name: error?.name || 'Error',
  code: error?.code || 'UNKNOWN',
  hostname: error?.hostname,
  message: error?.message
})
  return res.status(500).json({ error: 'Something went wrong. Please try again.', code: 'SERVER_ERROR' })
}

async function run(res, fn) {
  try {
    const { status, body } = await fn()
    return res.status(status).json(body)
  } catch (error) {
    return send(res, error)
  }
}

function requestedRole(req) {
  return req.body?.role || (req.path.startsWith('/buyer/') ? 'buyer' : req.path.startsWith('/seller/') ? 'seller' : null)
}

function googleRequest(req, res) {
  const role = requestedRole(req)
  if (!['buyer', 'seller'].includes(role)) { res.status(400).json({ error: 'role must be buyer or seller' }); return null }
  const idToken = typeof req.body?.idToken === 'string' ? req.body.idToken.trim() : ''
  if (idToken.length < 20) { res.status(400).json({ error: 'Google ID token required' }); return null }
  return { role, idToken }
}

// Login only. Also serves the legacy /google, /buyer/google and /seller/google
// routes, which used to create accounts silently and no longer do.
export async function loginWithGoogle(req, res) {
  const input = googleRequest(req, res)
  if (!input) return undefined
  return run(res, () => service.login(input))
}

export async function startGoogleRegistration(req, res) {
  const input = googleRequest(req, res)
  if (!input) return undefined
  return run(res, () => service.startRegistration(input))
}

export async function completeGoogleRegistration(req, res) {
  const role = requestedRole(req)
  if (!['buyer', 'seller'].includes(role)) return res.status(400).json({ error: 'role must be buyer or seller' })
  const registrationToken = typeof req.body?.registrationToken === 'string' ? req.body.registrationToken : ''
  if (!registrationToken) return res.status(401).json({ error: 'Your registration session has expired. Please continue with Google again.', code: 'REGISTRATION_EXPIRED' })
  return run(res, () => service.completeRegistration({ registrationToken, role, profile: req.body?.profile }))
}

export async function getSession(req, res) {
  return run(res, () => service.session(req.auth))
}

export function passwordAuthRemoved(req, res) {
  return res.status(410).json({ error: 'Password authentication has been replaced by Google ID token authentication', code: 'PASSWORD_AUTH_REMOVED' })
}
