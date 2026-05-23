import type { CloudTaskCapabilities } from '../../../shared/cloud-tasks';

export const cloudClient = {
  getCapabilities(): Promise<CloudTaskCapabilities> {
    return window.wishop.cloudTasks.getCapabilities();
  },
};
