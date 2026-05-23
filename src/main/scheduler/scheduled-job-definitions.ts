import { registerListingScheduledJobs } from './listing-job-executor';
import { registerOrderShipmentScheduledJobs } from './order-shipment-job-executor';
import { registerViolationScheduledJobs } from './violation-job-executor';

export function registerCoreScheduledJobs(): void {
  registerListingScheduledJobs();
  registerViolationScheduledJobs();
  registerOrderShipmentScheduledJobs();
}
