import test from 'node:test'
import assert from 'node:assert/strict'
import { AuthError, createAuthService, validateProfile } from '../src/services/authService.js'

// In-memory store that enforces the same uniqueness rules as schema.sql
// (buyers/sellers.email, auth_identities provider+subject and per-account role).
function fakeStore() {
  const state = { buyers: [], sellers: [], identities: [], nextId: 1 }
  const tick = () => new Promise((resolve) => setImmediate(resolve))
  const dup = () => Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY', errno: 1062 })
  const rows = (role) => (role === 'buyer' ? state.buyers : state.sellers)
  const store = {
    state,
    async findIdentityBySubject(sub) { await tick(); return state.identities.find((i) => i.sub === sub) || null },
    async findAccountByEmail(role, email) { await tick(); return rows(role).find((r) => r.email === email) || null },
    async findIdentityForAccount(role, id) { await tick(); return state.identities.find((i) => i.role === role && (role === 'buyer' ? i.buyer_id : i.seller_id) === id) || null },
    async getAccount(role, id) { await tick(); return rows(role).find((r) => r.id === id) || null },
    async linkIdentity({ sub, role, accountId, email }) {
      await tick()
      if (state.identities.some((i) => i.sub === sub)) throw dup()
      state.identities.push({ sub, role, email, buyer_id: role === 'buyer' ? accountId : null, seller_id: role === 'seller' ? accountId : null })
    },
    async createAccountWithIdentity({ role, sub, email, profile }) {
      await tick()
      // Atomic: validate every constraint first, then write (mirrors a transaction).
      if (rows(role).some((r) => r.email === email) || state.identities.some((i) => i.sub === sub)) throw dup()
      const id = state.nextId++
      if (role === 'buyer') state.buyers.push({ id, name: profile.name, email, interests: JSON.stringify(profile.interests) })
      else state.sellers.push({ id, owner_name: profile.name, shop_name: profile.shopName, shop_description: profile.shopDescription, email })
      state.identities.push({ sub, role, email, buyer_id: role === 'buyer' ? id : null, seller_id: role === 'seller' ? id : null })
      return id
    }
  }
  return store
}

const GOOGLE = {
  'tok-ann': { sub: 'g-ann', email: 'Ann@Example.com', email_verified: true, name: 'Ann Buyer' },
  'tok-bob': { sub: 'g-bob', email: 'bob@example.com', email_verified: true, name: 'Bob Seller' }
}

function setup() {
  const store = fakeStore()
  const service = createAuthService({
    store,
    verifyGoogle: async (token) => {
      if (token === 'unconfigured') throw Object.assign(new Error('GOOGLE_CLIENT_ID must be configured'), { status: 503 })
      if (!GOOGLE[token]) throw new Error('bad token')
      return GOOGLE[token]
    },
    issueSession: ({ id, role }) => `session:${role}:${id}`,
    issueRegistration: ({ role, sub, email, name }) => ({ token: `reg:${JSON.stringify({ role, sub, email, name })}`, expiresIn: 1800 }),
    readRegistration: (token) => {
      if (!token.startsWith('reg:')) throw new Error('invalid')
      return JSON.parse(token.slice(4))
    }
  })
  return { store, service }
}

const rejects = async (promise, status, code) => {
  await assert.rejects(promise, (e) => e instanceof AuthError && e.status === status && e.code === code, `expected ${status} ${code}`)
}
const register = async (service, idToken, role, profile) => {
  const start = await service.startRegistration({ idToken, role })
  return service.completeRegistration({ registrationToken: start.body.registrationToken, role, profile })
}

test('login never creates an account when none exists', async () => {
  const { store, service } = setup()
  for (const role of ['buyer', 'seller']) {
    await assert.rejects(service.login({ idToken: 'tok-ann', role }), (e) => e.status === 404 && e.code === 'ACCOUNT_NOT_FOUND' && e.message === 'No account was found for this sign-in option. Please register first.' && e.extra.redirectTo === (role === 'buyer' ? '/register' : '/register/seller'))
  }
  assert.equal(store.state.buyers.length + store.state.sellers.length + store.state.identities.length, 0)
})

test('registration start verifies Google but creates nothing (abandoned onboarding leaves no records)', async () => {
  const { store, service } = setup()
  const first = await service.startRegistration({ idToken: 'tok-ann', role: 'buyer' })
  await service.startRegistration({ idToken: 'tok-ann', role: 'buyer' }) // retry
  assert.equal(first.status, 200)
  assert.deepEqual(first.body.profile, { name: 'Ann Buyer', email: 'ann@example.com' })
  assert.equal(store.state.buyers.length, 0)
  assert.equal(store.state.identities.length, 0)
  await rejects(service.login({ idToken: 'tok-ann', role: 'buyer' }), 404, 'ACCOUNT_NOT_FOUND') // still no dashboard access
})

test('new buyer registers, profile persists, session is issued, login then works', async () => {
  const { store, service } = setup()
  const done = await register(service, 'tok-ann', 'buyer', { name: '  Ann B  ', interests: ['Books', 'Books', ' Toys '], email: 'evil@example.com' })
  assert.equal(done.status, 201)
  assert.equal(done.body.role, 'buyer')
  assert.match(done.body.token, /^session:buyer:/)
  assert.equal(done.body.user.email, 'ann@example.com') // from verified claims, not the body
  assert.equal(done.body.user.name, 'Ann B')
  assert.deepEqual(done.body.user.interests, ['Books', 'Toys'])
  assert.equal(store.state.buyers.length, 1)
  const again = await service.login({ idToken: 'tok-ann', role: 'buyer' })
  assert.equal(again.status, 200)
  assert.deepEqual(again.body.user.interests, ['Books', 'Toys'])
})

test('buyer interests are optional', async () => {
  const { service } = setup()
  const done = await register(service, 'tok-ann', 'buyer', { name: 'Ann' })
  assert.deepEqual(done.body.user.interests, [])
})

test('existing buyer registering again is told to sign in; no duplicate is created', async () => {
  const { store, service } = setup()
  await register(service, 'tok-ann', 'buyer', { name: 'Ann' })
  await assert.rejects(service.startRegistration({ idToken: 'tok-ann', role: 'buyer' }), (e) => e.status === 409 && e.code === 'ALREADY_REGISTERED' && e.message === "You're already registered with this Google account. Please sign in to continue." && e.extra.redirectTo === '/login')
  assert.equal(store.state.buyers.length, 1)
})

test('replaying a registration token cannot create a second account', async () => {
  const { store, service } = setup()
  const start = await service.startRegistration({ idToken: 'tok-bob', role: 'seller' })
  const args = { registrationToken: start.body.registrationToken, role: 'seller', profile: { name: 'Bob', shopName: 'Bob Goods' } }
  await service.completeRegistration(args)
  await rejects(service.completeRegistration(args), 409, 'ALREADY_REGISTERED')
  assert.equal(store.state.sellers.length, 1)
  assert.equal(store.state.identities.length, 1)
})

test('concurrent registrations create exactly one account', async () => {
  const { store, service } = setup()
  const start = await service.startRegistration({ idToken: 'tok-ann', role: 'buyer' })
  const args = { registrationToken: start.body.registrationToken, role: 'buyer', profile: { name: 'Ann' } }
  const results = await Promise.allSettled(Array.from({ length: 8 }, () => service.completeRegistration(args)))
  const ok = results.filter((r) => r.status === 'fulfilled')
  const failed = results.filter((r) => r.status === 'rejected')
  assert.equal(ok.length, 1)
  assert.equal(store.state.buyers.length, 1)
  assert.equal(store.state.identities.length, 1)
  for (const f of failed) assert.ok(f.reason instanceof AuthError && f.reason.status === 409, 'losers get an application-level 409, not a raw DB error')
})

test('buyer cannot register as seller (and reverse) using the same Google account', async () => {
  const { store, service } = setup()
  await register(service, 'tok-ann', 'buyer', { name: 'Ann' })
  await assert.rejects(service.startRegistration({ idToken: 'tok-ann', role: 'seller' }), (e) => e.status === 409 && e.code === 'ROLE_CONFLICT' && e.message === 'This email is already registered as a buyer account. Please use a different email to create a seller account.' && e.extra.redirectTo === '/login')
  assert.equal(store.state.sellers.length, 0)

  await register(service, 'tok-bob', 'seller', { name: 'Bob', shopName: 'Bob Goods' })
  await assert.rejects(service.startRegistration({ idToken: 'tok-bob', role: 'buyer' }), (e) => e.code === 'ROLE_CONFLICT' && e.message === 'This email is already registered as a seller account. Please use a different email to create a buyer account.' && e.extra.redirectTo === '/login/seller')
  assert.equal(store.state.buyers.length, 1)
})

test('a buyer session identity cannot log in as seller; no account is created', async () => {
  const { store, service } = setup()
  await register(service, 'tok-ann', 'buyer', { name: 'Ann' })
  await assert.rejects(service.login({ idToken: 'tok-ann', role: 'seller' }), (e) => e.status === 409 && e.code === 'WRONG_ROLE' && e.extra.redirectTo === '/login')
  assert.equal(store.state.sellers.length, 0)
})

test('seller registration needs shop name, keeps owner and shop separate, persists description', async () => {
  const { service } = setup()
  const start = await service.startRegistration({ idToken: 'tok-bob', role: 'seller' })
  await assert.rejects(service.completeRegistration({ registrationToken: start.body.registrationToken, role: 'seller', profile: { name: 'Bob', shopName: '   ' } }), (e) => e.status === 400 && e.code === 'INVALID_PROFILE' && Boolean(e.extra.fieldErrors.shopName))
  const done = await service.completeRegistration({ registrationToken: start.body.registrationToken, role: 'seller', profile: { name: 'Bob Owner', shopName: 'Bob Goods', shopDescription: 'Handmade things' } })
  assert.equal(done.status, 201)
  assert.equal(done.body.seller.ownerName, 'Bob Owner')
  assert.equal(done.body.seller.shopName, 'Bob Goods')
  assert.equal(done.body.seller.email, 'bob@example.com')
})

test('required profile fields are validated on the backend and nothing is created on failure', async () => {
  const { store, service } = setup()
  const start = await service.startRegistration({ idToken: 'tok-ann', role: 'buyer' })
  await assert.rejects(service.completeRegistration({ registrationToken: start.body.registrationToken, role: 'buyer', profile: { name: '' } }), (e) => e.code === 'INVALID_PROFILE' && e.message === 'Please complete the required fields to continue.' && Boolean(e.extra.fieldErrors.name))
  await assert.rejects(service.completeRegistration({ registrationToken: start.body.registrationToken, role: 'buyer', profile: { name: 'Ann', interests: 'books' } }), (e) => e.code === 'INVALID_PROFILE' && Boolean(e.extra.fieldErrors.interests))
  assert.equal(store.state.buyers.length, 0)
  assert.equal(validateProfile('seller', { name: 'x', shopName: 'y' }).value.shopDescription, null)
})

test('registration tokens are bound to a role and must be valid', async () => {
  const { store, service } = setup()
  const start = await service.startRegistration({ idToken: 'tok-ann', role: 'buyer' })
  await rejects(service.completeRegistration({ registrationToken: start.body.registrationToken, role: 'seller', profile: { name: 'Ann', shopName: 'S' } }), 401, 'REGISTRATION_EXPIRED')
  await rejects(service.completeRegistration({ registrationToken: 'forged', role: 'buyer', profile: { name: 'Ann' } }), 401, 'REGISTRATION_EXPIRED')
  assert.equal(store.state.buyers.length + store.state.sellers.length, 0)
})

test('invalid Google tokens are rejected; missing configuration is reported as 503', async () => {
  const { service } = setup()
  await rejects(service.login({ idToken: 'nope', role: 'buyer' }), 401, 'GOOGLE_AUTH_FAILED')
  await rejects(service.startRegistration({ idToken: 'nope', role: 'seller' }), 401, 'GOOGLE_AUTH_FAILED')
  await rejects(service.login({ idToken: 'unconfigured', role: 'buyer' }), 503, 'AUTH_NOT_CONFIGURED')
})

test('legacy email-only account is linked on login, and cannot be taken over by another Google subject', async () => {
  const { store, service } = setup()
  store.state.buyers.push({ id: 99, name: 'Legacy Ann', email: 'ann@example.com', interests: null })
  store.state.nextId = 100
  await assert.rejects(service.startRegistration({ idToken: 'tok-ann', role: 'buyer' }), (e) => e.code === 'ALREADY_REGISTERED')
  const first = await service.login({ idToken: 'tok-ann', role: 'buyer' })
  assert.equal(first.body.user.id, 99)
  assert.equal(store.state.identities.length, 1)
  GOOGLE['tok-ann2'] = { sub: 'g-ann-other', email: 'ann@example.com', email_verified: true, name: 'Other' }
  await rejects(service.login({ idToken: 'tok-ann2', role: 'buyer' }), 409, 'ACCOUNT_CONFLICT')
  assert.equal(store.state.identities.length, 1)
})

test('session restoration returns the account for a valid identity and rejects a vanished one', async () => {
  const { service } = setup()
  const done = await register(service, 'tok-bob', 'seller', { name: 'Bob', shopName: 'Bob Goods' })
  const restored = await service.session({ id: done.body.seller.id, role: 'seller' })
  assert.equal(restored.body.seller.shopName, 'Bob Goods')
  await rejects(service.session({ id: 12345, role: 'seller' }), 401, 'SESSION_INVALID')
  await rejects(service.session({ id: done.body.seller.id, role: 'buyer' }), 401, 'SESSION_INVALID') // seller id is not a buyer account
})
