import { z } from 'zod'

const InjectionSchema = z.discriminatedUnion('method', [
  z.object({ method: z.literal('header'), name: z.string() }),
  z.object({ method: z.literal('query'),  name: z.string() }),
  z.object({ method: z.literal('bearer') }),
])

const AuthFieldSchema = z.object({
  key:         z.string(),
  label:       z.string(),
  description: z.string().optional(),
  docsUrl:     z.string().url().optional(),
  secret:      z.boolean(),
  required:    z.boolean(),
  type:        z.enum(['text', 'password', 'url']).default('text'),
  injection:   InjectionSchema.optional(),
})

const AuthSchema = z.discriminatedUnion('type', [
  z.object({
    type:    z.literal('api_key'),
    managed: z.enum(['user', 'admin']),
    fields:  z.array(AuthFieldSchema).min(1),
  }),
  z.object({
    type:         z.literal('oauth2'),
    managed:      z.enum(['user', 'admin']),
    scopes:       z.array(z.string()),
    authorizeUrl: z.string().url(),
    tokenUrl:     z.string().url(),
    adminNote:    z.string().optional(),
  }),
  z.object({
    type:    z.literal('bearer_token'),
    managed: z.enum(['user', 'admin']),
    fields:  z.array(AuthFieldSchema),
  }),
  z.object({ type: z.literal('admin_managed') }),
  z.object({ type: z.literal('none') }),
])

export const ManifestSchema = z.object({
  manifestVersion: z.literal('1'),
  id:              z.string().regex(/^[a-z0-9-]+$/, 'ID must be lowercase, digits, and hyphens only'),
  name:            z.string().min(1),
  version:         z.string().min(1),
  description:     z.string().min(1),
  icon:            z.string().url().optional(),
  endpoint:        z.string().url(),
  auth:            AuthSchema,
})

export type Manifest    = z.infer<typeof ManifestSchema>
export type AuthField   = z.infer<typeof AuthFieldSchema>
export type Injection   = z.infer<typeof InjectionSchema>

/** Extract auth fields from any auth type that has them */
export function getAuthFields(manifest: Manifest): AuthField[] {
  const auth = manifest.auth
  if (auth.type === 'api_key' || auth.type === 'bearer_token') return auth.fields
  return []
}

/** Get managedBy from the manifest's auth config */
export function getManagedBy(manifest: Manifest): 'user' | 'admin' {
  const auth = manifest.auth
  if (auth.type === 'admin_managed' || auth.type === 'none') return 'admin'
  return auth.managed
}
