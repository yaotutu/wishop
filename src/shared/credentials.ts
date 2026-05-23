import { z } from 'zod';

export const credentialPlatformSchema = z.enum([
  'wechat-shop',
  'taobao',
  'tmall',
  '1688',
]);

export type CredentialPlatform = z.infer<typeof credentialPlatformSchema>;

export const credentialScopeSchema = z.enum(['api', 'login', 'automation', 'cloud-task']);
export type CredentialScope = z.infer<typeof credentialScopeSchema>;

export const credentialMetaSchema = z.object({
  credentialId: z.string().min(1),
  accountId: z.string().min(1),
  platform: credentialPlatformSchema,
  scope: z.array(credentialScopeSchema).min(1),
  authorizedForCloud: z.boolean(),
  updatedAt: z.number(),
  lastUploadedAt: z.number().optional(),
  revokedAt: z.number().optional(),
});

export type CredentialMeta = z.infer<typeof credentialMetaSchema>;

export interface CredentialSecretInput {
  accountId: string;
  platform: CredentialPlatform;
  scope: CredentialScope[];
}

function makeId(): string {
  return globalThis.crypto?.randomUUID?.() || `cred-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createCredentialMeta(input: CredentialSecretInput, now = Date.now()): CredentialMeta {
  return credentialMetaSchema.parse({
    credentialId: makeId(),
    accountId: input.accountId,
    platform: input.platform,
    scope: input.scope,
    authorizedForCloud: false,
    updatedAt: now,
  });
}

export function authorizeCredentialForCloud(meta: CredentialMeta, now = Date.now()): CredentialMeta {
  return credentialMetaSchema.parse({
    ...meta,
    authorizedForCloud: true,
    updatedAt: now,
    revokedAt: undefined,
  });
}

export function revokeCredentialCloudAuthorization(meta: CredentialMeta, now = Date.now()): CredentialMeta {
  return credentialMetaSchema.parse({
    ...meta,
    authorizedForCloud: false,
    updatedAt: now,
    revokedAt: now,
  });
}

