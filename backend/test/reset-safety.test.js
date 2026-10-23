import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const script = path.join(here, '..', 'scripts', 'reset-db.js')

function run(env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script], {
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let output = ''
    child.stdout.on('data', (chunk) => { output += chunk })
    child.stderr.on('data', (chunk) => { output += chunk })
    child.on('close', (code) => resolve({ code, output }))
  })
}

test('reset refuses to run without an explicit database allowlist and confirmation', async () => {
  const result = await run({ DB_NAME: 'bazario_local', RESET_ALLOWED_DATABASES: '', RESET_DATABASE_CONFIRM: '' })
  assert.notEqual(result.code, 0)
  assert.match(result.output, /Refusing database reset/)
})

test('reset refuses production even with confirmation', async () => {
  const result = await run({
    DB_NAME: 'bazario_local',
    NODE_ENV: 'production',
    RESET_ALLOWED_DATABASES: 'bazario_local',
    RESET_DATABASE_CONFIRM: 'RESET_BAZARIO_DATABASE:bazario_local'
  })
  assert.notEqual(result.code, 0)
  assert.match(result.output, /Refusing database reset/)
})
