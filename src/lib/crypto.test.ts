/**
 * Unit tests for src/lib/crypto.ts
 *
 * Run with:  pnpm test
 * Requires:  Node 20+ (uses node:test, node:assert)
 *
 * ENCRYPTION_KEY is set before importing the module so getKey() succeeds.
 */

// Set env vars before any imports that read them
process.env['ENCRYPTION_KEY']         = 'a'.repeat(64)   // 64-char hex = 32-byte key
process.env['ENCRYPTION_KEY_VERSION'] = '1'

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  encrypt,
  decrypt,
  hashToken,
  generateToken,
  computeConfigHmac,
  verifyConfigHmac,
} from './crypto.ts'

// ── encrypt / decrypt ──────────────────────────────────────────────────────

describe('encrypt / decrypt', () => {
  it('round-trips a plain string', () => {
    const plaintext = 'hello world'
    assert.equal(decrypt(encrypt(plaintext)), plaintext)
  })

  it('round-trips an empty string', () => {
    assert.equal(decrypt(encrypt('')), '')
  })

  it('round-trips a JSON payload', () => {
    const payload = JSON.stringify({ apiKey: 'sk-abc123', userId: 'u-xyz' })
    assert.equal(decrypt(encrypt(payload)), payload)
  })

  it('round-trips unicode and special characters', () => {
    const payload = '日本語テスト 🔐 &lt;script&gt;'
    assert.equal(decrypt(encrypt(payload)), payload)
  })

  it('produces different ciphertext each call (random IV)', () => {
    const plaintext = 'same input'
    const c1 = encrypt(plaintext)
    const c2 = encrypt(plaintext)
    assert.notEqual(c1, c2)
  })

  it('ciphertext format is version:iv:tag:ciphertext', () => {
    const parts = encrypt('test').split(':')
    assert.equal(parts.length, 4)
    assert.equal(parts[0], '1')         // version
    assert.equal(parts[1]!.length, 24)  // 12-byte IV → 24 hex chars
    assert.equal(parts[2]!.length, 32)  // 16-byte GCM tag → 32 hex chars
    assert.ok(parts[3]!.length > 0)     // ciphertext non-empty
  })
})

// ── tamper resistance ─────────────────────────────────────────────────────

describe('decrypt — tamper resistance', () => {
  it('throws when the GCM auth tag is tampered', () => {
    const stored = encrypt('sensitive data')
    const parts  = stored.split(':')
    // Flip the first byte of the auth tag
    const tagFirstByte = parseInt(parts[2]!.slice(0, 2), 16) ^ 0xff
    parts[2] = tagFirstByte.toString(16).padStart(2, '0') + parts[2]!.slice(2)
    assert.throws(() => decrypt(parts.join(':')))
  })

  it('throws when the ciphertext body is tampered', () => {
    const stored = encrypt('sensitive data')
    const parts  = stored.split(':')
    // Flip the first byte of the ciphertext
    const ctFirstByte = parseInt(parts[3]!.slice(0, 2), 16) ^ 0xff
    parts[3] = ctFirstByte.toString(16).padStart(2, '0') + parts[3]!.slice(2)
    assert.throws(() => decrypt(parts.join(':')))
  })

  it('throws on an unknown key version', () => {
    const stored = encrypt('data')
    const withBadVersion = '99:' + stored.split(':').slice(1).join(':')
    assert.throws(() => decrypt(withBadVersion), /Unknown encryption key version/)
  })
})

// ── wrong key ─────────────────────────────────────────────────────────────

describe('decrypt — wrong key', () => {
  it('throws when ENCRYPTION_KEY is changed after encryption', () => {
    const stored   = encrypt('secret')
    const original = process.env['ENCRYPTION_KEY']
    process.env['ENCRYPTION_KEY'] = 'b'.repeat(64)
    try {
      assert.throws(() => decrypt(stored))
    } finally {
      process.env['ENCRYPTION_KEY'] = original
    }
  })
})

// ── hashToken ─────────────────────────────────────────────────────────────

describe('hashToken', () => {
  it('returns a 64-char lowercase hex string', () => {
    const hash = hashToken('some-token')
    assert.equal(hash.length, 64)
    assert.match(hash, /^[0-9a-f]+$/)
  })

  it('is deterministic', () => {
    assert.equal(hashToken('abc'), hashToken('abc'))
  })

  it('produces different hashes for different inputs', () => {
    assert.notEqual(hashToken('token-a'), hashToken('token-b'))
  })
})

// ── generateToken ─────────────────────────────────────────────────────────

describe('generateToken', () => {
  it('returns a 64-char hex string', () => {
    const token = generateToken()
    assert.equal(token.length, 64)
    assert.match(token, /^[0-9a-f]+$/)
  })

  it('returns a unique value each call', () => {
    assert.notEqual(generateToken(), generateToken())
  })
})

// ── HMAC binding ──────────────────────────────────────────────────────────

describe('computeConfigHmac / verifyConfigHmac', () => {
  const userId      = 'user-123'
  const connectorId = 'pipedrive'
  const encrypted   = encrypt('{"apiKey":"sk-abc"}')

  it('verifies the correct HMAC', () => {
    const hmac = computeConfigHmac(userId, connectorId, encrypted)
    assert.equal(verifyConfigHmac(userId, connectorId, encrypted, hmac), true)
  })

  it('fails when userId differs', () => {
    const hmac = computeConfigHmac(userId, connectorId, encrypted)
    assert.equal(verifyConfigHmac('other-user', connectorId, encrypted, hmac), false)
  })

  it('fails when connectorId differs', () => {
    const hmac = computeConfigHmac(userId, connectorId, encrypted)
    assert.equal(verifyConfigHmac(userId, 'other-connector', encrypted, hmac), false)
  })

  it('fails when the encrypted blob is changed', () => {
    const hmac    = computeConfigHmac(userId, connectorId, encrypted)
    const tampered = encrypted + 'x'
    assert.equal(verifyConfigHmac(userId, connectorId, tampered, hmac), false)
  })

  it('fails when the HMAC is zeroed out', () => {
    const hmac   = computeConfigHmac(userId, connectorId, encrypted)
    const zeroed = '0'.repeat(hmac.length)
    assert.equal(verifyConfigHmac(userId, connectorId, encrypted, zeroed), false)
  })

  it('is deterministic', () => {
    assert.equal(
      computeConfigHmac(userId, connectorId, encrypted),
      computeConfigHmac(userId, connectorId, encrypted),
    )
  })

  it('admin-keyed HMAC differs from user-keyed HMAC', () => {
    const adminKey  = `admin:${connectorId}`
    assert.notEqual(
      computeConfigHmac(adminKey, connectorId, encrypted),
      computeConfigHmac(userId,   connectorId, encrypted),
    )
  })
})
