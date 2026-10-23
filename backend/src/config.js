import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectEnv = path.join(__dirname, '..', '..', '.env')
const backendEnv = path.join(__dirname, '..', '.env')

// Backend settings win over the project-level file, while shell-provided values
// remain authoritative. This module is imported before auth/db initialization.
dotenv.config({ path: backendEnv })
dotenv.config({ path: projectEnv })

export function requiredEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw Object.assign(new Error(`${name} must be configured`), {
      status: name === 'GOOGLE_CLIENT_ID' ? 503 : undefined
    })
  }
  return value
}

export function googleClientId() {
  const value = requiredEnv('GOOGLE_CLIENT_ID')
  if (value.includes('your-google') || !value.endsWith('.apps.googleusercontent.com')) {
    throw Object.assign(new Error('GOOGLE_CLIENT_ID is not configured with a Google web client ID'), { status: 503 })
  }
  return value
}
