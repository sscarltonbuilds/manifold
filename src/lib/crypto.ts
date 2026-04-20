import { createCipheriv, createDecipheriv, randomBytes, createHash, createHmac } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_VERSION = process.env.ENCRYPTION_KEY_VERSION ?? '1'

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY
  if (!hex || hex.length !== 64) throw new Error('ENCRYPTION_KEY must be a 64-char hex string')
  return Buffer.from(hex, 'hex')
}

export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  // Ensure we always use a 128-bit (16-byte) auth tag — the GCM default, but be explicit
  if (tag.length !== 16) throw new Error('GCM auth tag length mismatch')
  return `${KEY_VERSION}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decrypt(stored: string): string {
  const [version, ivHex, tagHex, ciphertextHex] = stored.split(':')
  if (version !== KEY_VERSION) throw new Error(`Unknown encryption key version: ${version}`)
  const key = getKey()
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const ciphertext = Buffer.from(ciphertextHex, 'hex')
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(ciphertext) + decipher.final('utf8')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function generateToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Compute a binding HMAC that ties an encrypted config blob to its owner context.
 * Prevents an attacker with DB write access from swapping one user's encrypted
 * config for another's — the HMAC would fail verification.
 */
export function computeConfigHmac(
  ownerKey: string,       // userId or 'admin:connectorId'
  connectorId: string,
  encryptedConfig: string,
): string {
  const key = getKey()
  return createHmac('sha256', key)
    .update(`${ownerKey}:${connectorId}:${encryptedConfig}`)
    .digest('hex')
}

export function verifyConfigHmac(
  ownerKey: string,
  connectorId: string,
  encryptedConfig: string,
  storedHmac: string,
): boolean {
  const expected = computeConfigHmac(ownerKey, connectorId, encryptedConfig)
  // Constant-time comparison
  if (expected.length !== storedHmac.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ storedHmac.charCodeAt(i)
  }
  return diff === 0
}
