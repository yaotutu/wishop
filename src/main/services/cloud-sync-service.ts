import type { CloudTaskCapabilities } from '../../shared/cloud-tasks';
import { DEFAULT_CLOUD_TASK_CAPABILITIES } from '../../shared/cloud-tasks';
import type { CredentialMeta } from '../../shared/credentials';

export interface CloudCredentialTransport {
  upload(meta: CredentialMeta): Promise<CredentialMeta>;
  revoke(credentialId: string): Promise<void>;
  getStatus(credentialId: string): Promise<{ connected: boolean; uploaded: boolean; message: string }>;
}

export interface CloudTaskTransport {
  getCapabilities(): Promise<CloudTaskCapabilities>;
  getStatus(): Promise<{ connected: boolean; message: string }>;
}

export interface CloudRuntime {
  credentials: CloudCredentialTransport;
  tasks: CloudTaskTransport;
}

function unavailableError(): Error {
  return new Error('未连接云服务');
}

export function createNoopCloudRuntime(): CloudRuntime {
  return {
    credentials: {
      async upload(): Promise<CredentialMeta> {
        throw unavailableError();
      },
      async revoke(): Promise<void> {
        throw unavailableError();
      },
      async getStatus(): Promise<{ connected: boolean; uploaded: boolean; message: string }> {
        return { connected: false, uploaded: false, message: '未连接云服务' };
      },
    },
    tasks: {
      async getCapabilities(): Promise<CloudTaskCapabilities> {
        return DEFAULT_CLOUD_TASK_CAPABILITIES;
      },
      async getStatus(): Promise<{ connected: boolean; message: string }> {
        return { connected: false, message: '未连接云服务' };
      },
    },
  };
}

export const cloudRuntime = createNoopCloudRuntime();

