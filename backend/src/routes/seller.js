import { Router } from 'express'
import * as sellerController from '../controllers/sellerController.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/test', sellerController.sellerTest)

// Public — no auth. Buyer-facing "Visit Shop" page. Real MySQL data only,
// shop name / owner / description / follower count and nothing else.
router.get('/:sellerId/shop', sellerController.getShopPublic)

router.get('/:sellerId/profile', requireAuth('seller'), sellerController.getProfile)
router.put('/:sellerId/profile', requireAuth('seller'), sellerController.updateProfile)
router.get('/:sellerId/products', requireAuth('seller'), sellerController.listProducts)
router.post('/:sellerId/products', requireAuth('seller'), sellerController.createProduct)
router.put('/:sellerId/products/:productId', requireAuth('seller'), sellerController.updateProduct)
router.delete('/:sellerId/products/:productId', requireAuth('seller'), sellerController.deleteProduct)
router.get('/:sellerId/orders', requireAuth('seller'), sellerController.listOrders)
router.put('/:sellerId/orders/:orderId', requireAuth('seller'), sellerController.updateOrder)

export default router
