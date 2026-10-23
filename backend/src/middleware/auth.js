import jwt from 'jsonwebtoken'

export function requireAuth(role) {
  return (req, res, next) => {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) return res.status(401).json({ error: 'Unauthorized' })
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET, { issuer: 'bazario-api', audience: 'bazario-client' })
      if (!['buyer', 'seller'].includes(payload.role) || !Number.isInteger(Number(payload.id))) {
        return res.status(401).json({ error: 'Invalid token' })
      }
      if (role && (Array.isArray(role) ? !role.includes(payload.role) : payload.role !== role)) {
        return res.status(403).json({ error: 'Forbidden' })
      }
      req.auth = payload
      next()
    } catch {
      return res.status(401).json({ error: 'Invalid token' })
    }
  }
}
