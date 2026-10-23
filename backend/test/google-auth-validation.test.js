import test from 'node:test'
import assert from 'node:assert/strict'
import { loginWithGoogle } from '../src/controllers/authController.js'

function response() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this },
    json(value) { this.body = value; return this }
  }
}

test('Google auth rejects missing, non-string, and malformed token input', async () => {
  for (const idToken of [undefined, { credential: 'token' }, '']) {
    const res = response()
    await loginWithGoogle({ body: { idToken, role: 'buyer' }, path: '/google' }, res)
    assert.equal(res.statusCode, 400)
    assert.equal(res.body.error, 'Google ID token required')
  }
})

test('Google auth reports missing client configuration without pretending the token is invalid', async () => {
  const previous = process.env.GOOGLE_CLIENT_ID
  delete process.env.GOOGLE_CLIENT_ID
  try {
    const res = response()
    await loginWithGoogle({ body: { idToken: 'a'.repeat(64), role: 'buyer' }, path: '/google' }, res)
    assert.equal(res.statusCode, 503)
    assert.match(res.body.error, /GOOGLE_CLIENT_ID|Google authentication is not configured/)
  } finally {
    if (previous === undefined) delete process.env.GOOGLE_CLIENT_ID
    else process.env.GOOGLE_CLIENT_ID = previous
  }
})

test('Google auth rejects a token that fails Google verification safely', async () => {
  const res = response()
  await loginWithGoogle({ body: { idToken: 'not-a-real-google-id-token'.repeat(3), role: 'seller' }, path: '/google' }, res)
  assert.equal(res.statusCode, 401)
  assert.equal(res.body.error, 'Invalid Google ID token')
})
