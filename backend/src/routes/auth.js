import { Router } from 'express'
import * as authController from '../controllers/authController.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// Login only: never creates an account.
router.post('/google/login', authController.loginWithGoogle)
// Registration is two explicit steps: verify Google, then submit the profile.
router.post('/google/register/start', authController.startGoogleRegistration)
router.post('/google/register/complete', authController.completeGoogleRegistration)
// Restores a session from an existing Bazario token (either role).
router.get('/session', requireAuth(), authController.getSession)

// Legacy aliases. These are login-only now.
router.post('/google', authController.loginWithGoogle)
router.post('/buyer/google', authController.loginWithGoogle)
router.post('/seller/google', authController.loginWithGoogle)
// Kept as explicit 410 responses so old clients fail safely rather than
// silently reintroducing password authentication.
router.post('/buyer/login', authController.passwordAuthRemoved)
router.post('/seller/login', authController.passwordAuthRemoved)
router.post('/buyer/register', authController.passwordAuthRemoved)
router.post('/seller/register', authController.passwordAuthRemoved)

export default router
