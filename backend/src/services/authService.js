// Google-based login and registration rules for Bazario.
//
// This module holds NO framework or database code: Google verification, the
// persistence layer and token signing are injected. That keeps the rules
// (login never creates accounts, one Google identity <-> one account type,
// atomic registration, duplicate protection) unit-testable without MySQL.
import { normalizeEmail } from '../utils/validate.js'

export const PATHS = {
  buyer: { login: '/login', register: '/register' },
  seller: { login: '/login/seller', register: '/register/seller' }
}

export const MESSAGES = {
  alreadyRegistered: "You're already registered with this Google account. Please sign in to continue.",
  accountNotFound: 'No account was found for this sign-in option. Please register first.',
  googleFailed: 'Invalid Google ID token',
  registrationExpired: 'Your registration session has expired. Please continue with Google again.',
  sessionExpired: 'Your session has expired. Please sign in again.',
  incompleteProfile: 'Please complete the required fields to continue.',
  registrationConflict: "We couldn't finish creating your account. Please try again."
}

export class AuthError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message)
    this.name = 'AuthError'
    this.status = status
    this.code = code
    this.extra = extra
  }
}

const otherRole = (role) => (role === 'buyer' ? 'seller' : 'buyer')
const isDuplicate = (error) => error?.code === 'ER_DUP_ENTRY' || error?.errno === 1062

export function roleConflictMessage(requestedRole, existingRole) {
  return `This email is already registered as a ${existingRole} account. Please use a different email to create a ${requestedRole} account.`
}

function parseInterests(row) {
  const raw = row?.interests
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : [] } catch { return [] }
}

function accountPayload(role, row) {
  if (role === 'buyer') {
    return { role, user: { id: row.id, name: row.name, email: row.email, interests: parseInterests(row) } }
  }
  return { role, seller: { id: row.id, shopName: row.shop_name, ownerName: row.owner_name, email: row.email } }
}

// Validates and normalises profile input. Email is never read from here: it
// always comes from the backend-verified Google claims.
export function validateProfile(role, input = {}) {
  const fieldErrors = {}
  const text = (v) => (typeof v === 'string' ? v.trim() : '')
  const name = text(input.name)
  if (!name) fieldErrors.name = role === 'seller' ? "Enter the owner's full name." : 'Enter your full name.'
  else if (name.length > 255) fieldErrors.name = 'Name must be 255 characters or fewer.'

  if (role === 'buyer') {
    let interests = []
    if (input.interests != null) {
      if (!Array.isArray(input.interests) || input.interests.length > 50 || input.interests.some((i) => typeof i !== 'string' || i.trim().length === 0 || i.trim().length > 100)) {
        fieldErrors.interests = 'Choose up to 50 interests.'
      } else interests = [...new Set(input.interests.map((i) => i.trim()))]
    }
    return { fieldErrors, value: { name, interests } }
  }

  const shopName = text(input.shopName)
  if (!shopName) fieldErrors.shopName = 'Enter your shop name.'
  else if (shopName.length > 255) fieldErrors.shopName = 'Shop name must be 255 characters or fewer.'
  const shopDescription = text(input.shopDescription)
  if (shopDescription.length > 2000) fieldErrors.shopDescription = 'Description must be 2000 characters or fewer.'
  return { fieldErrors, value: { name, shopName, shopDescription: shopDescription || null } }
}

export function createAuthService({ verifyGoogle, store, issueSession, issueRegistration, readRegistration, log = () => {} }) {
  async function verified(idToken) {
    try {
      return await verifyGoogle(idToken)
    } catch (error) {
      if (error instanceof AuthError) throw error
      if (error?.status >= 500) throw new AuthError(503, 'AUTH_NOT_CONFIGURED', error.message)
      log('google verification failed', { name: error?.name || 'Error', code: error?.code || 'UNKNOWN' })
      throw new AuthError(401, 'GOOGLE_AUTH_FAILED', MESSAGES.googleFailed)
    }
  }

  // Where does this verified Google identity stand for the requested role?
  async function resolve({ sub, email }, role) {
    const identity = await store.findIdentityBySubject(sub)
    if (identity) {
      if (identity.role === role) return { kind: 'account', id: role === 'buyer' ? identity.buyer_id : identity.seller_id }
      return { kind: 'other-role', role: identity.role }
    }
    const normalized = normalizeEmail(email)
    const same = await store.findAccountByEmail(role, normalized)
    if (same) return { kind: 'legacy', id: same.id }
    const other = await store.findAccountByEmail(otherRole(role), normalized)
    if (other) return { kind: 'other-role', role: otherRole(role) }
    return { kind: 'none' }
  }

  const alreadyRegistered = (role) => new AuthError(409, 'ALREADY_REGISTERED', MESSAGES.alreadyRegistered, { redirectTo: PATHS[role].login })
  const roleConflict = (role, existing) => new AuthError(409, 'ROLE_CONFLICT', roleConflictMessage(role, existing), { redirectTo: PATHS[existing].login })

  async function sessionFor(role, id, status = 200) {
    const row = await store.getAccount(role, id)
    if (!row) throw new AuthError(404, 'ACCOUNT_NOT_FOUND', MESSAGES.accountNotFound, { redirectTo: PATHS[role].register })
    return { status, body: { token: issueSession({ id, role }), ...accountPayload(role, row) } }
  }

  // LOGIN: never creates an account.
  async function login({ idToken, role }) {
    const google = await verified(idToken)
    const state = await resolve(google, role)
    if (state.kind === 'account') return sessionFor(role, state.id)
    if (state.kind === 'legacy') {
      // Pre-Google account with the same verified email and no identity yet:
      // link it (this is not account creation). Never take over an account that
      // is already linked to a different Google subject.
      if (await store.findIdentityForAccount(role, state.id)) {
        throw new AuthError(409, 'ACCOUNT_CONFLICT', 'This account is linked to a different Google account. Please sign in with that account.', { redirectTo: PATHS[role].login })
      }
      try {
        await store.linkIdentity({ sub: google.sub, role, accountId: state.id, email: normalizeEmail(google.email) })
      } catch (error) {
        if (!isDuplicate(error)) throw error
        const again = await store.findIdentityBySubject(google.sub)
        if (!again || again.role !== role || (role === 'buyer' ? again.buyer_id : again.seller_id) !== state.id) {
          throw new AuthError(409, 'ACCOUNT_CONFLICT', 'This account could not be linked. Please try again.', { redirectTo: PATHS[role].login })
        }
      }
      return sessionFor(role, state.id)
    }
    if (state.kind === 'other-role') {
      const existing = state.role
      throw new AuthError(409, 'WRONG_ROLE', `This Google account is registered as a ${existing} account. Please use ${existing} sign in.`, { redirectTo: PATHS[existing].login })
    }
    throw new AuthError(404, 'ACCOUNT_NOT_FOUND', MESSAGES.accountNotFound, { redirectTo: PATHS[role].register })
  }

  // REGISTRATION step 1: verify Google, make sure registration is allowed and
  // hand back a short-lived, server-signed pending-registration token. No
  // account is created here.
  async function startRegistration({ idToken, role }) {
    const google = await verified(idToken)
    const state = await resolve(google, role)
    if (state.kind === 'account' || state.kind === 'legacy') throw alreadyRegistered(role)
    if (state.kind === 'other-role') throw roleConflict(role, state.role)
    const email = normalizeEmail(google.email)
    const { token, expiresIn } = issueRegistration({ role, sub: google.sub, email, name: google.name || '' })
    return { status: 200, body: { registrationToken: token, expiresIn, profile: { name: google.name || '', email } } }
  }

  // REGISTRATION step 2: validate the profile and create account + identity
  // (+ interests) atomically. Identity comes only from the signed token.
  async function completeRegistration({ registrationToken, role, profile }) {
    let claims
    try { claims = readRegistration(registrationToken) } catch { throw new AuthError(401, 'REGISTRATION_EXPIRED', MESSAGES.registrationExpired) }
    if (!claims || claims.role !== role || !claims.sub || !claims.email) throw new AuthError(401, 'REGISTRATION_EXPIRED', MESSAGES.registrationExpired)

    const { fieldErrors, value } = validateProfile(role, profile)
    if (Object.keys(fieldErrors).length) throw new AuthError(400, 'INVALID_PROFILE', MESSAGES.incompleteProfile, { fieldErrors })

    const identity = { sub: claims.sub, email: claims.email }
    const classify = async () => {
      const state = await resolve(identity, role)
      if (state.kind === 'account' || state.kind === 'legacy') throw alreadyRegistered(role)
      if (state.kind === 'other-role') throw roleConflict(role, state.role)
    }
    await classify()
    let id
    try {
      id = await store.createAccountWithIdentity({ role, sub: claims.sub, email: claims.email, profile: value })
    } catch (error) {
      if (!isDuplicate(error)) throw error
      // Lost a race (or a retry/replay): the DB constraint stopped the duplicate.
      await classify()
      throw new AuthError(409, 'REGISTRATION_CONFLICT', MESSAGES.registrationConflict)
    }
    return sessionFor(role, id, 201)
  }

  // Restores a session from an already-issued Bazario token.
  async function session({ id, role }) {
    const row = await store.getAccount(role, id)
    if (!row) throw new AuthError(401, 'SESSION_INVALID', MESSAGES.sessionExpired)
    return { status: 200, body: accountPayload(role, row) }
  }

  return { login, startRegistration, completeRegistration, session }
}
