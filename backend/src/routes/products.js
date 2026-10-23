import { Router } from 'express'
import * as productsController from '../controllers/productsController.js'

const router = Router()

// Public — no auth required. This is the real marketplace catalogue.
router.get('/', productsController.listProducts)
router.get('/:id', productsController.getProduct)

export default router
