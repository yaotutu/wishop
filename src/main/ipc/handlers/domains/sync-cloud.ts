import { registerCloudTaskHandlers } from '../cloudTasks';
import { registerCredentialHandlers } from '../credentials';
import { registerSyncHandlers } from '../sync';

export function registerSyncCloudDomainHandlers(): void {
  registerCloudTaskHandlers();
  registerCredentialHandlers();
  registerSyncHandlers();
}
