// Deliberately opt-in local development helper. It is never imported by the
// API or migration runner. It preserves schema and only clears the explicitly
// approved marketplace tables.
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
dotenv.config()

const database = process.env.DB_NAME
const allowed = (process.env.RESET_ALLOWED_DATABASES || '').split(',').map((value) => value.trim()).filter(Boolean)
const confirmation = `RESET_BAZARIO_DATABASE:${database}`
const tables = [
  'purchase_events',
  'behavioral_events',
  'order_items',
  'orders',
  'cart',
  'wishlist',
  'follows',
  'buyer_interests',
  'products',
  'auth_identities',
  'buyers',
  'sellers'
]

if (process.env.NODE_ENV === 'production' || !database || allowed.length === 0 || !allowed.includes(database) || process.env.RESET_DATABASE_CONFIRM !== confirmation) {
  console.error(`Refusing database reset. Configure RESET_ALLOWED_DATABASES with the exact local database name and RESET_DATABASE_CONFIRM=${confirmation}.`)
  process.exit(1)
}

const connection = await mysql.createConnection({ host: process.env.DB_HOST || 'localhost', user: process.env.DB_USER, password: process.env.DB_PASSWORD, database })
try {
  console.log(`About to delete marketplace records from database: ${database}`)
  for (const table of tables) {
    const [rows] = await connection.query(`SELECT COUNT(*) AS count FROM \`${table}\``)
    console.log(`  ${table}: ${rows[0].count} rows`)
  }
  console.log(`Confirmation required: RESET_DATABASE_CONFIRM=${confirmation}`)
  await connection.beginTransaction()
  const counts = {}
  for (const table of tables) {
    const [result] = await connection.query(`DELETE FROM \`${table}\``)
    counts[table] = result.affectedRows
  }
  await connection.commit()
  console.log('Marketplace records removed; schema and unrelated tables were preserved.')
  console.table(counts)
  console.log('Run npm run migrate only if the schema itself still needs provisioning. Verify the database and restore from backup if required.')
} catch (error) {
  await connection.rollback()
  throw error
} finally { await connection.end() }
