import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL:           z.string().url(),
  NEXTAUTH_URL:           z.string().url(),
  NEXTAUTH_SECRET:        z.string().min(32),
  GOOGLE_CLIENT_ID:       z.string().min(1),
  GOOGLE_CLIENT_SECRET:   z.string().min(1),
  // At least one of these must be set
  ALLOWED_EMAIL_DOMAIN:   z.string().optional(),
  ALLOWED_EMAILS:         z.string().optional(),
  ENCRYPTION_KEY:         z.string().length(64),
  ENCRYPTION_KEY_VERSION: z.string().default('1'),
  NEXT_PUBLIC_APP_URL:    z.string().url().optional().default('http://localhost:3000'),
}).refine(
  data => data.ALLOWED_EMAIL_DOMAIN ?? data.ALLOWED_EMAILS,
  { message: 'At least one of ALLOWED_EMAIL_DOMAIN or ALLOWED_EMAILS must be set' }
)

export const env = envSchema.parse(process.env)
