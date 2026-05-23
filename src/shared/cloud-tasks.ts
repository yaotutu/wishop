import { z } from 'zod';
import { syncModuleKeySchema } from './sync';

export const cloudTaskTargetSchema = z.enum(['local', 'cloud']);
export type CloudTaskTarget = z.infer<typeof cloudTaskTargetSchema>;

export const cloudTaskStatusSchema = z.enum([
  'unavailable',
  'idle',
  'queued',
  'running',
  'waiting_user',
  'completed',
  'failed',
  'cancelled',
]);

export type CloudTaskStatus = z.infer<typeof cloudTaskStatusSchema>;

export const cloudTaskCapabilitiesSchema = z.object({
  connected: z.boolean(),
  supportedModules: z.array(syncModuleKeySchema),
  credentialUploadSupported: z.boolean(),
  message: z.string(),
});

export type CloudTaskCapabilities = z.infer<typeof cloudTaskCapabilitiesSchema>;

export const DEFAULT_CLOUD_TASK_CAPABILITIES: CloudTaskCapabilities = {
  connected: false,
  supportedModules: [],
  credentialUploadSupported: false,
  message: '未连接云服务',
};

