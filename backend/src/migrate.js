import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load the repository-level file first, then the backend file for values which
// are only defined by the backend.  dotenv does not overwrite an existing env.
for (const envPath of [path.join(__dirname, '..', '..', '.env'), path.join(__dirname, '..', '.env')]) {
  dotenv.config({ path: envPath })
}

const migrations = [{
  version: 1,
  name: 'phase3_identity_events_orders',
  statements: [
    'ALTER TABLE buyers MODIFY COLUMN password VARCHAR(255) NULL',
    'ALTER TABLE sellers MODIFY COLUMN password VARCHAR(255) NULL',
    'ALTER TABLE orders MODIFY COLUMN seller_id INT NULL',
    'ALTER TABLE orders ADD COLUMN parent_order_id INT NULL',
    'ALTER TABLE orders ADD CONSTRAINT fk_orders_parent FOREIGN KEY (parent_order_id) REFERENCES orders(id) ON DELETE CASCADE',
     "CREATE TABLE auth_identities (id BIGINT AUTO_INCREMENT PRIMARY KEY, provider VARCHAR(32) NOT NULL, provider_subject VARCHAR(255) NOT NULL, role ENUM('buyer','seller') NOT NULL, buyer_id INT NULL, seller_id INT NULL, email VARCHAR(255) NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, UNIQUE KEY uq_identity_provider_subject (provider, provider_subject), UNIQUE KEY uq_identity_buyer_role (buyer_id, role), UNIQUE KEY uq_identity_seller_role (seller_id, role), FOREIGN KEY (buyer_id) REFERENCES buyers(id) ON DELETE CASCADE, FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE, CONSTRAINT chk_identity_owner CHECK ((role = 'buyer' AND buyer_id IS NOT NULL AND seller_id IS NULL) OR (role = 'seller' AND seller_id IS NOT NULL AND buyer_id IS NULL)), KEY idx_identity_email (email)) ENGINE=InnoDB",
     'CREATE TABLE buyer_interests (buyer_id INT NOT NULL, interest VARCHAR(100) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (buyer_id, interest), FOREIGN KEY (buyer_id) REFERENCES buyers(id) ON DELETE CASCADE) ENGINE=InnoDB',
    'CREATE TABLE behavioral_events (id BIGINT AUTO_INCREMENT PRIMARY KEY, buyer_id INT NULL, seller_id INT NULL, product_id INT NULL, event_type VARCHAR(64) NOT NULL, event_key VARCHAR(191) NULL, metadata JSON NULL, occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uq_behavioral_event_key (event_key), KEY idx_behavioral_buyer_time (buyer_id, occurred_at), KEY idx_behavioral_product_time (product_id, occurred_at), FOREIGN KEY (buyer_id) REFERENCES buyers(id) ON DELETE SET NULL, FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE SET NULL, FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL) ENGINE=InnoDB',
    'CREATE TABLE purchase_events (id BIGINT AUTO_INCREMENT PRIMARY KEY, buyer_id INT NOT NULL, parent_order_id INT NOT NULL, idempotency_key VARCHAR(191) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uq_purchase_idempotency (buyer_id, idempotency_key), UNIQUE KEY uq_purchase_order (parent_order_id), FOREIGN KEY (buyer_id) REFERENCES buyers(id) ON DELETE CASCADE, FOREIGN KEY (parent_order_id) REFERENCES orders(id) ON DELETE CASCADE) ENGINE=InnoDB',
    'ALTER TABLE order_items ADD UNIQUE KEY uq_order_product (order_id, product_id)',
    'ALTER TABLE orders ADD KEY idx_orders_buyer_created (buyer_id, created_at)',
    'ALTER TABLE orders ADD KEY idx_orders_seller_status (seller_id, status)'
  ]
}]

const expectedColumns = {
  'buyers.password': { columnType: 'varchar(255)', nullable: 'YES' },
  'sellers.password': { columnType: 'varchar(255)', nullable: 'YES' },
  'orders.seller_id': { columnType: 'int', nullable: 'YES' },
  'orders.parent_order_id': { columnType: 'int', nullable: 'YES' }
}

// Only the legacy definitions represented by the repository's original
// schema are eligible for automatic, data-preserving conversion.
const supportedLegacyColumns = {
  'buyers.password': [{ columnType: 'varchar(255)', nullable: 'NO' }],
  'sellers.password': [{ columnType: 'varchar(255)', nullable: 'NO' }],
  'orders.seller_id': [{ columnType: 'int', nullable: 'NO' }]
}

const expectedChecks = {
  'auth_identities.chk_identity_owner': "(role = 'buyer' AND buyer_id IS NOT NULL AND seller_id IS NULL) OR (role = 'seller' AND seller_id IS NOT NULL AND buyer_id IS NULL)"
}

const index = (unique, columns, subParts = [null, ...columns.slice(1).map(() => null)]) => ({ unique, columns, subParts, indexType: 'BTREE' })
const expectedIndexes = {
  'order_items.uq_order_product': index(true, ['order_id', 'product_id']),
  'orders.idx_orders_buyer_created': index(false, ['buyer_id', 'created_at']),
  'orders.idx_orders_seller_status': index(false, ['seller_id', 'status'])
}

const fk = (columns, table, referencedColumns, deleteRule, updateRule = 'RESTRICT') => ({ columns, table, referencedColumns, deleteRule, updateRule })
const expectedForeignKeys = {
  'orders.parent_order_id': fk(['parent_order_id'], 'orders', ['id'], 'CASCADE'),
  'auth_identities.buyer_id': fk(['buyer_id'], 'buyers', ['id'], 'CASCADE'),
  'auth_identities.seller_id': fk(['seller_id'], 'sellers', ['id'], 'CASCADE'),
  'buyer_interests.buyer_id': fk(['buyer_id'], 'buyers', ['id'], 'CASCADE'),
  'behavioral_events.buyer_id': fk(['buyer_id'], 'buyers', ['id'], 'SET NULL'),
  'behavioral_events.seller_id': fk(['seller_id'], 'sellers', ['id'], 'SET NULL'),
  'behavioral_events.product_id': fk(['product_id'], 'products', ['id'], 'SET NULL'),
  'purchase_events.buyer_id': fk(['buyer_id'], 'buyers', ['id'], 'CASCADE'),
  'purchase_events.parent_order_id': fk(['parent_order_id'], 'orders', ['id'], 'CASCADE')
}

const tableExpectations = {
  auth_identities: {
    columns: [['id', { columnType: 'bigint', nullable: 'NO', extra: 'auto_increment' }], ['provider', { columnType: 'varchar(32)', nullable: 'NO' }], ['provider_subject', { columnType: 'varchar(255)', nullable: 'NO' }], ['role', { columnType: "enum('buyer','seller')", nullable: 'NO' }], ['buyer_id', { columnType: 'int', nullable: 'YES' }], ['seller_id', { columnType: 'int', nullable: 'YES' }], ['email', { columnType: 'varchar(255)', nullable: 'YES' }], ['created_at', { columnType: 'timestamp', nullable: 'YES' }], ['updated_at', { columnType: 'timestamp', nullable: 'YES' }]],
    indexes: [['PRIMARY', index(true, ['id'])], ['uq_identity_provider_subject', index(true, ['provider', 'provider_subject'])], ['uq_identity_buyer_role', index(true, ['buyer_id', 'role'])], ['uq_identity_seller_role', index(true, ['seller_id', 'role'])], ['idx_identity_email', index(false, ['email'])]],
    foreignKeys: [
      ['buyer_id', expectedForeignKeys['auth_identities.buyer_id']],
      ['seller_id', expectedForeignKeys['auth_identities.seller_id']]
    ],
    checks: [['chk_identity_owner', expectedChecks['auth_identities.chk_identity_owner']]]
  },
  buyer_interests: {
    columns: [['buyer_id', { columnType: 'int', nullable: 'NO' }], ['interest', { columnType: 'varchar(100)', nullable: 'NO' }], ['created_at', { columnType: 'timestamp', nullable: 'YES' }]],
    indexes: [['PRIMARY', index(true, ['buyer_id', 'interest'])]], foreignKeys: [
      ['buyer_id', expectedForeignKeys['buyer_interests.buyer_id']]
    ]
  },
  behavioral_events: {
    columns: [['id', { columnType: 'bigint', nullable: 'NO', extra: 'auto_increment' }], ['buyer_id', { columnType: 'int', nullable: 'YES' }], ['seller_id', { columnType: 'int', nullable: 'YES' }], ['product_id', { columnType: 'int', nullable: 'YES' }], ['event_type', { columnType: 'varchar(64)', nullable: 'NO' }], ['event_key', { columnType: 'varchar(191)', nullable: 'YES' }], ['metadata', { columnType: 'json', nullable: 'YES' }], ['occurred_at', { columnType: 'timestamp', nullable: 'YES' }]],
    indexes: [['PRIMARY', index(true, ['id'])], ['uq_behavioral_event_key', index(true, ['event_key'])], ['idx_behavioral_buyer_time', index(false, ['buyer_id', 'occurred_at'])], ['idx_behavioral_product_time', index(false, ['product_id', 'occurred_at'])]],
    foreignKeys: [
      ['buyer_id', expectedForeignKeys['behavioral_events.buyer_id']],
      ['seller_id', expectedForeignKeys['behavioral_events.seller_id']],
      ['product_id', expectedForeignKeys['behavioral_events.product_id']]
    ]
  },
  purchase_events: {
    columns: [['id', { columnType: 'bigint', nullable: 'NO', extra: 'auto_increment' }], ['buyer_id', { columnType: 'int', nullable: 'NO' }], ['parent_order_id', { columnType: 'int', nullable: 'NO' }], ['idempotency_key', { columnType: 'varchar(191)', nullable: 'NO' }], ['created_at', { columnType: 'timestamp', nullable: 'YES' }]],
    indexes: [['PRIMARY', index(true, ['id'])], ['uq_purchase_idempotency', index(true, ['buyer_id', 'idempotency_key'])], ['uq_purchase_order', index(true, ['parent_order_id'])]],
    foreignKeys: [
      ['buyer_id', expectedForeignKeys['purchase_events.buyer_id']],
      ['parent_order_id', expectedForeignKeys['purchase_events.parent_order_id']]
    ]
  }
}

async function hasTable(conn, table) {
  const [rows] = await conn.query('SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?', [table])
  return rows.length > 0
}

async function getColumn(conn, table, column) {
  const [rows] = await conn.query('SELECT column_type AS column_type, data_type AS data_type, is_nullable AS is_nullable, column_default AS column_default, extra AS extra FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?', [table, column])
  const row = rows[0]
  return row ? { column_type: row.column_type ?? row.COLUMN_TYPE, data_type: row.data_type ?? row.DATA_TYPE, is_nullable: row.is_nullable ?? row.IS_NULLABLE, column_default: row.column_default ?? row.COLUMN_DEFAULT, extra: row.extra ?? row.EXTRA } : null
}

function columnMatches(actual, expected) {
  if (!actual) return false
  if (!expected || typeof expected !== 'object') throw new Error(`Invalid expected column definition: ${JSON.stringify(expected)}`)
  const requiredStrings = [['actual.column_type', actual.column_type], ['actual.is_nullable', actual.is_nullable], ['expected.columnType', expected.columnType], ['expected.nullable', expected.nullable]]
  for (const [field, value] of requiredStrings) {
    if (typeof value !== 'string') throw new Error(`Invalid column metadata: ${field} must be a string; received ${JSON.stringify(value)}. Actual: ${JSON.stringify(actual)}, expected: ${JSON.stringify(expected)}`)
  }
  if (expected.extra !== undefined && (typeof actual.extra !== 'string' || typeof expected.extra !== 'string')) throw new Error(`Invalid column EXTRA metadata: actual=${JSON.stringify(actual.extra)}, expected=${JSON.stringify(expected.extra)}`)
  return actual.column_type.toLowerCase() === expected.columnType.toLowerCase() && actual.is_nullable === expected.nullable && (expected.extra === undefined || actual.extra.toLowerCase() === expected.extra.toLowerCase())
}

function isSupportedLegacyColumn(table, column, actual) {
  return (supportedLegacyColumns[`${table}.${column}`] || []).some((legacy) => columnMatches(actual, legacy))
}

async function getIndexes(conn, table) {
  const [rows] = await conn.query('SELECT index_name AS index_name, non_unique AS non_unique, seq_in_index AS seq_in_index, column_name AS column_name, sub_part AS sub_part, index_type AS index_type FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? ORDER BY index_name, seq_in_index', [table])
  const indexes = new Map()
  for (const row of rows) {
    const indexName = row.index_name ?? row.INDEX_NAME
    const nonUnique = row.non_unique ?? row.NON_UNIQUE
    const columnName = row.column_name ?? row.COLUMN_NAME
    const subPart = row.sub_part ?? row.SUB_PART
    const indexType = row.index_type ?? row.INDEX_TYPE
    if (typeof indexName !== 'string' || ![0, 1].includes(Number(nonUnique)) || typeof columnName !== 'string' || typeof indexType !== 'string') throw new Error(`Invalid index metadata for ${table}: ${JSON.stringify(row)}`)
    if (!indexes.has(indexName)) indexes.set(indexName, { unique: Number(nonUnique) === 0, columns: [], subParts: [], indexType })
    const item = indexes.get(indexName)
    item.columns.push(columnName)
    item.subParts.push(subPart == null ? null : Number(subPart))
  }
  return indexes
}

function indexMatches(actual, expected) {
  if (!actual || typeof actual.indexType !== 'string' || !Array.isArray(actual.columns) || !Array.isArray(actual.subParts)) throw new Error(`Invalid index metadata: ${JSON.stringify(actual)}`)
  if (!expected || typeof expected.indexType !== 'string' || !Array.isArray(expected.columns) || !Array.isArray(expected.subParts)) throw new Error(`Invalid expected index definition: ${JSON.stringify(expected)}`)
  return actual.unique === expected.unique && actual.indexType.toUpperCase() === expected.indexType.toUpperCase() && JSON.stringify(actual.columns) === JSON.stringify(expected.columns) && JSON.stringify(actual.subParts) === JSON.stringify(expected.subParts)
}

async function ensureIndex(conn, table, name, expected) {
  const indexes = await getIndexes(conn, table)
  const named = indexes.get(name)
  if (named && !indexMatches(named, expected)) throw new Error(`Schema mismatch: ${table}.${name} index conflicts: ${JSON.stringify(named)}, expected ${JSON.stringify(expected)}`)
  if (named) return true
  for (const actual of indexes.values()) if (indexMatches(actual, expected)) return true
  return false
}

async function getForeignKeys(conn, table) {
  const [rows] = await conn.query(`SELECT kcu.constraint_name AS constraint_name, kcu.ordinal_position AS ordinal_position, kcu.column_name AS column_name, kcu.referenced_table_name AS referenced_table_name,
      kcu.referenced_column_name AS referenced_column_name, rc.delete_rule AS delete_rule, rc.update_rule AS update_rule
    FROM information_schema.key_column_usage kcu
    JOIN information_schema.referential_constraints rc ON rc.constraint_schema = kcu.constraint_schema
      AND rc.constraint_name = kcu.constraint_name AND rc.table_name = kcu.table_name
    WHERE kcu.constraint_schema = DATABASE() AND kcu.table_name = ? AND kcu.referenced_table_name IS NOT NULL
    ORDER BY kcu.constraint_name, kcu.ordinal_position`, [table])
  const keys = new Map()
  for (const row of rows) {
    const constraintName = row.constraint_name ?? row.CONSTRAINT_NAME
    if (!keys.has(constraintName)) keys.set(constraintName, { columns: [], referencedColumns: [], table: row.referenced_table_name ?? row.REFERENCED_TABLE_NAME, deleteRule: row.delete_rule ?? row.DELETE_RULE, updateRule: row.update_rule ?? row.UPDATE_RULE })
    const key = keys.get(constraintName)
    if (typeof key.table !== 'string' || typeof key.deleteRule !== 'string' || typeof key.updateRule !== 'string' || typeof (row.column_name ?? row.COLUMN_NAME) !== 'string' || typeof (row.referenced_column_name ?? row.REFERENCED_COLUMN_NAME) !== 'string') throw new Error(`Invalid foreign-key metadata for ${table}: ${JSON.stringify(row)}`)
    key.columns.push(row.column_name ?? row.COLUMN_NAME)
    key.referencedColumns.push(row.referenced_column_name ?? row.REFERENCED_COLUMN_NAME)
  }
  return keys
}

function foreignKeyMatches(actual, expected) {
  const rule = (value) => value === 'NO ACTION' ? 'RESTRICT' : value
  return actual && actual.table === expected.table && JSON.stringify(actual.columns) === JSON.stringify(expected.columns) && JSON.stringify(actual.referencedColumns) === JSON.stringify(expected.referencedColumns) && rule(actual.deleteRule) === rule(expected.deleteRule) && rule(actual.updateRule) === rule(expected.updateRule)
}

async function ensureForeignKey(conn, table, name, expected) {
  const keys = await getForeignKeys(conn, table)
  const named = keys.get(name)
  if (named && !foreignKeyMatches(named, expected)) throw new Error(`Schema mismatch: ${table}.${name} foreign key conflicts: ${JSON.stringify(named)}, expected ${JSON.stringify(expected)}`)
  if (named) return true
  for (const actual of keys.values()) if (foreignKeyMatches(actual, expected)) return true
  const sameSource = [...keys.values()].filter((actual) => JSON.stringify(actual.columns) === JSON.stringify(expected.columns))
  if (sameSource.length) throw new Error(`Schema mismatch: ${table} foreign key for ${expected.columns.join(', ')} conflicts with the expected relationship: ${JSON.stringify(sameSource)}`)
  return false
}

function normalizeCheckClause(clause) {
  return String(clause).toLowerCase().replace(/`/g, '').replace(/\\'/g, "'").replace(/_utf8mb4|_utf8mb3|_latin1/g, '').replace(/[()]/g, '').replace(/\s+/g, '')
}

async function getCheckConstraint(conn, table, name) {
  const [rows] = await conn.query(`SELECT cc.check_clause AS check_clause FROM information_schema.check_constraints cc
    JOIN information_schema.table_constraints tc ON tc.constraint_schema = cc.constraint_schema AND tc.constraint_name = cc.constraint_name
    WHERE cc.constraint_schema = DATABASE() AND tc.table_name = ? AND tc.constraint_name = ? AND tc.constraint_type = 'CHECK'`, [table, name])
  const row = rows[0]
  if (!row) return null
  const checkClause = row.check_clause ?? row.CHECK_CLAUSE
  if (typeof checkClause !== 'string') throw new Error(`Invalid check-constraint metadata for ${table}.${name}: ${JSON.stringify(row)}`)
  return { check_clause: checkClause }
}

async function ensureCheckConstraint(conn, table, name, expectedClause) {
  if (typeof expectedClause !== 'string') throw new Error(`Invalid expected check constraint for ${table}.${name}: ${JSON.stringify(expectedClause)}`)
  const actual = await getCheckConstraint(conn, table, name)
  if (!actual) return false
  if (normalizeCheckClause(actual.check_clause) !== normalizeCheckClause(expectedClause)) throw new Error(`Schema mismatch: ${table}.${name} check constraint conflicts`)
  return true
}

async function validateTable(conn, table) {
  const expected = tableExpectations[table]
  if (!expected) return
  await validateTableColumns(conn, table)
  for (const [name, definition] of expected.indexes) if (!await ensureIndex(conn, table, name, definition)) throw new Error(`Schema mismatch: ${table}.${name} index is missing`)
  for (const [column, definition] of expected.foreignKeys) if (!await ensureForeignKey(conn, table, column, definition)) throw new Error(`Schema mismatch: ${table}.${column} foreign key is missing`)
  for (const [name, clause] of expected.checks || []) if (!await ensureCheckConstraint(conn, table, name, clause)) throw new Error(`Schema mismatch: ${table}.${name} check constraint is missing`)
}

async function validateTableColumns(conn, table) {
  const expected = tableExpectations[table]
  if (!expected) return
  for (const [column, definition] of expected.columns) {
    const actual = await getColumn(conn, table, column)
    if (!actual || !columnMatches(actual, definition)) throw new Error(`Schema mismatch: ${table}.${column} is missing or has ${JSON.stringify(actual)}, expected ${JSON.stringify(definition)}`)
  }
}

function identifier(value) {
  if (!/^[A-Za-z0-9_]+$/.test(value)) throw new Error(`Unsafe schema identifier: ${value}`)
  return `\`${value}\``
}

async function repairMissingTableObjects(conn) {
  for (const [table, expected] of Object.entries(tableExpectations)) {
    try {
      await validateTableColumns(conn, table)
    } catch (error) {
      throw new Error(`Schema repair validation failed for table ${table}: ${error.message}`, { cause: error })
    }
    for (const [name, definition] of expected.indexes) {
      if (!await ensureIndex(conn, table, name, definition)) {
        const columns = definition.columns.map(identifier).join(', ')
        const uniqueness = definition.unique ? 'UNIQUE ' : ''
        await conn.query(`ALTER TABLE ${identifier(table)} ADD ${uniqueness}KEY ${identifier(name)} (${columns})`)
      }
    }
    for (const [columnName, definition] of expected.foreignKeys) {
      if (!await ensureForeignKey(conn, table, columnName, definition)) {
        const name = `fk_${table}_${definition.columns.join('_')}`
        const columns = definition.columns.map(identifier).join(', ')
        const referencedColumns = definition.referencedColumns.map(identifier).join(', ')
        await conn.query(`ALTER TABLE ${identifier(table)} ADD CONSTRAINT ${identifier(name)} FOREIGN KEY (${columns}) REFERENCES ${identifier(definition.table)} (${referencedColumns}) ON DELETE ${definition.deleteRule} ON UPDATE ${definition.updateRule}`)
      }
    }
    for (const [name, clause] of expected.checks || []) {
      if (!await ensureCheckConstraint(conn, table, name, clause)) {
        await conn.query(`ALTER TABLE ${identifier(table)} ADD CONSTRAINT ${identifier(name)} CHECK (${clause})`)
      }
    }
  }

  // These migration indexes and the parent-order foreign key belong to the
  // pre-existing orders/order_items tables, so they are repaired separately
  // from the migration-created tables above.
  for (const [key, definition] of Object.entries(expectedIndexes)) {
    const [table, name] = key.split('.')
    if (!await ensureIndex(conn, table, name, definition)) {
      const columns = definition.columns.map(identifier).join(', ')
      const uniqueness = definition.unique ? 'UNIQUE ' : ''
      await conn.query(`ALTER TABLE ${identifier(table)} ADD ${uniqueness}KEY ${identifier(name)} (${columns})`)
    }
  }
  for (const [key, definition] of Object.entries(expectedForeignKeys)) {
    const [table, columnName] = key.split('.')
    if (!await ensureForeignKey(conn, table, columnName, definition)) {
      const name = `fk_${table}_${definition.columns.join('_')}`
      const columns = definition.columns.map(identifier).join(', ')
      const referencedColumns = definition.referencedColumns.map(identifier).join(', ')
      await conn.query(`ALTER TABLE ${identifier(table)} ADD CONSTRAINT ${identifier(name)} FOREIGN KEY (${columns}) REFERENCES ${identifier(definition.table)} (${referencedColumns}) ON DELETE ${definition.deleteRule} ON UPDATE ${definition.updateRule}`)
    }
  }
  for (const [key, clause] of Object.entries(expectedChecks)) {
    const [table, name] = key.split('.')
    if (!await ensureCheckConstraint(conn, table, name, clause)) {
      await conn.query(`ALTER TABLE ${identifier(table)} ADD CONSTRAINT ${identifier(name)} CHECK (${clause})`)
    }
  }
}

async function validateCriticalObjects(conn) {
  for (const table of Object.keys(tableExpectations)) {
    if (!await hasTable(conn, table)) throw new Error(`Schema mismatch: required table ${table} is missing`)
    try {
      await validateTable(conn, table)
    } catch (error) {
      throw new Error(`Critical schema validation failed for table ${table}: ${error.message}`, { cause: error })
    }
  }
  for (const [key, expected] of Object.entries(expectedColumns)) {
    const [table, column] = key.split('.')
    const actual = await getColumn(conn, table, column)
    if (!actual || !columnMatches(actual, expected)) throw new Error(`Schema mismatch: ${key} is missing or has ${JSON.stringify(actual)}`)
  }
  for (const [key, expected] of Object.entries(expectedIndexes)) {
    const [table, name] = key.split('.')
    if (!await ensureIndex(conn, table, name, expected)) throw new Error(`Schema mismatch: ${key} index is missing`)
  }
  for (const [key, expected] of Object.entries(expectedForeignKeys)) {
    const [table, column] = key.split('.')
    if (!await ensureForeignKey(conn, table, column, expected)) throw new Error(`Schema mismatch: ${key} foreign key is missing`)
  }
  for (const [key, expected] of Object.entries(expectedChecks)) {
    const [table, name] = key.split('.')
    if (!await ensureCheckConstraint(conn, table, name, expected)) throw new Error(`Schema mismatch: ${key} check constraint is missing`)
  }
}

async function getMigration(conn, version) {
  const [rows] = await conn.query('SELECT version, name FROM schema_migrations WHERE version = ?', [version])
  const row = rows[0]
  return row ? { version: row.version ?? row.VERSION, name: row.name ?? row.NAME } : null
}

function statementExpectation(statement) {
  let match = statement.match(/^ALTER TABLE (\w+) MODIFY COLUMN (\w+)/i)
  if (match) return { type: 'modifyColumn', table: match[1], column: match[2], expected: expectedColumns[`${match[1]}.${match[2]}`] }
  match = statement.match(/^ALTER TABLE (\w+) ADD COLUMN (\w+) (.+)$/i)
  if (match) return { type: 'column', table: match[1], column: match[2], expected: expectedColumns[`${match[1]}.${match[2]}`] || { columnType: match[3].split(/\s+/)[0], nullable: /\bNULL\b/i.test(match[3]) ? 'YES' : 'NO' } }
  match = statement.match(/^ALTER TABLE (\w+) ADD CONSTRAINT (\w+) FOREIGN KEY \(([^)]+)\) REFERENCES (\w+)\(([^)]+)\) ON DELETE (\w+)(?: ON UPDATE (\w+))?/i)
  if (match) return { type: 'foreignKey', table: match[1], name: match[2], expected: fk(match[3].split(',').map((x) => x.trim()), match[4], match[5].split(',').map((x) => x.trim()), match[6].toUpperCase(), (match[7] || 'RESTRICT').toUpperCase()) }
  match = statement.match(/^ALTER TABLE (\w+) ADD CONSTRAINT (\w+) CHECK \((.*)\)$/i)
  if (match) return { type: 'check', table: match[1], name: match[2], expected: match[3] }
  match = statement.match(/^ALTER TABLE (\w+) ADD (UNIQUE )?KEY (\w+) \(([^)]+)\)/i)
  if (match) return { type: 'index', table: match[1], name: match[3], expected: expectedIndexes[`${match[1]}.${match[3]}`] || index(Boolean(match[2]), match[4].split(',').map((x) => x.trim())) }
  match = statement.match(/^CREATE TABLE (\w+)/i)
  if (match) return { type: 'table', table: match[1] }
  return null
}

async function applyStatement(conn, statement, version) {
  const expectation = statementExpectation(statement)
  if (expectation?.type === 'modifyColumn') {
    const actual = await getColumn(conn, expectation.table, expectation.column)
    if (actual) {
      if (columnMatches(actual, expectation.expected)) return
      if (!isSupportedLegacyColumn(expectation.table, expectation.column, actual)) {
        throw new Error(`Migration ${version} cannot safely modify ${expectation.table}.${expectation.column}: unsupported existing definition ${JSON.stringify(actual)}, expected ${JSON.stringify(expectation.expected)}`)
      }
    }
  } else if (expectation?.type === 'column') {
    const actual = await getColumn(conn, expectation.table, expectation.column)
    if (actual) {
      if (!columnMatches(actual, expectation.expected)) throw new Error(`Migration ${version} cannot add ${expectation.table}.${expectation.column}: existing definition does not match`)
      return
    }
  } else if (expectation?.type === 'index') {
    if (await ensureIndex(conn, expectation.table, expectation.name, expectation.expected)) return
  } else if (expectation?.type === 'foreignKey') {
    if (await ensureForeignKey(conn, expectation.table, expectation.name, expectation.expected)) return
  } else if (expectation?.type === 'check') {
    if (await ensureCheckConstraint(conn, expectation.table, expectation.name, expectation.expected)) return
  } else if (expectation?.type === 'table' && await hasTable(conn, expectation.table)) {
    await validateTableColumns(conn, expectation.table)
    return
  }
  try {
    await conn.query(statement)
    if (expectation?.type === 'modifyColumn') {
      const actual = await getColumn(conn, expectation.table, expectation.column)
      if (!actual || !columnMatches(actual, expectation.expected)) throw new Error(`Migration ${version} modified ${expectation.table}.${expectation.column}, but the resulting definition is ${JSON.stringify(actual)} instead of ${JSON.stringify(expectation.expected)}`)
    }
  } catch (error) {
    throw new Error(`Migration ${version} failed for statement "${statement}": ${error.message}`, { cause: error })
  }
}

async function main() {
  const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']
  const missing = required.filter((key) => !process.env[key] || process.env[key].trim() === '')
  if (missing.length) throw new Error(`Missing required database configuration: ${missing.join(', ')}`)

  const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true'
    ? { minVersion: 'TLSv1.2', rejectUnauthorized: true }
    : undefined,
  multipleStatements: true
})
  try {
    await conn.query('CREATE TABLE IF NOT EXISTS schema_migrations (version INT PRIMARY KEY, name VARCHAR(191) NOT NULL, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB')
    await conn.query(fs.readFileSync(path.join(__dirname, '..', 'sql', 'schema.sql'), 'utf8'))
    for (const migration of migrations) {
      const recorded = await getMigration(conn, migration.version)
      if (recorded && recorded.name !== migration.name) throw new Error(`Migration ${migration.version} is recorded as ${recorded.name}, expected ${migration.name}`)
       if (!recorded) {
         for (const statement of migration.statements) {
           console.log(`[Migration ${migration.version}] Executing: ${statement}`)
           try {
             await applyStatement(conn, statement, migration.version)
           } catch (error) {
             console.error('[Migration step failed]', { version: migration.version, migration: migration.name, statement, database: process.env.DB_NAME })
             throw error
           }
         }
       }
       try {
         await repairMissingTableObjects(conn)
       } catch (error) {
         throw new Error(`Migration ${migration.version} schema repair failed: ${error.message}`, { cause: error })
       }
      // A recorded row is only a hint: objects are checked on every run.
      await validateCriticalObjects(conn)
      if (!recorded) await conn.query('INSERT INTO schema_migrations (version, name) VALUES (?, ?)', [migration.version, migration.name])
      if (!recorded) console.log(`Migration ${migration.version} applied: ${migration.name}`)
    }
    console.log('Migration OK')
  } finally {
    await conn.end()
  }
}

main().catch((error) => {
  console.error('\n=== BAZARIO MIGRATION FAILED ===')
  console.error(error.stack || error)
  let cause = error.cause
  let depth = 1
  while (cause && depth <= 5) {
    console.error(`\n--- Error cause ${depth} ---`)
    console.error(cause.stack || cause)
    cause = cause.cause
    depth++
  }
  process.exitCode = 1
})
