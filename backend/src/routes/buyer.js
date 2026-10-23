import { Router } from 'express'
import * as buyerController from '../controllers/buyerController.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/test', buyerController.buyerTest)
router.get('/:buyerId/profile', requireAuth('buyer'), buyerController.getProfile)
router.put('/:buyerId/profile', requireAuth('buyer'), buyerController.updateProfile)
router.post('/:buyerId/events', requireAuth('buyer'), buyerController.recordBehavioralEvent)
router.get('/:buyerId/cart', requireAuth('buyer'), buyerController.getCart)
router.post('/:buyerId/cart', requireAuth('buyer'), buyerController.postCart)
router.put('/:buyerId/cart', requireAuth('buyer'), buyerController.putCart)
router.delete('/:buyerId/cart/:productId', requireAuth('buyer'), buyerController.deleteCartItem)
router.get('/:buyerId/wishlist', requireAuth('buyer'), buyerController.getWishlist)
router.post('/:buyerId/wishlist', requireAuth('buyer'), buyerController.postWishlist)
router.delete('/:buyerId/wishlist/:productId', requireAuth('buyer'), buyerController.deleteWishlistItem)
router.get('/:buyerId/orders', requireAuth('buyer'), buyerController.getOrders)
router.post('/:buyerId/orders', requireAuth('buyer'), buyerController.postOrder)
router.get('/:buyerId/follows/:sellerId', requireAuth('buyer'), buyerController.getFollowState)
router.post('/:buyerId/follows', requireAuth('buyer'), buyerController.followShop)
router.delete('/:buyerId/follows/:sellerId', requireAuth('buyer'), buyerController.unfollowShop)

export default router
