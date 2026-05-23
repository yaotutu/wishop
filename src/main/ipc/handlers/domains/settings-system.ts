import { registerAccountHandlers } from '../accounts';
import { registerAppSystemHandlers } from '../appSystem';
import { registerConfigHandlers } from '../config';
import { registerGlobalLogHandlers } from '../globalLogs';
import { registerLicenseHandlers } from '../license';
import { registerNotificationHandlers } from '../notifications';
import { registerSettingsHandlers } from '../settings';

type AccountContext = Parameters<typeof registerAccountHandlers>[0];

export function registerSettingsSystemDomainHandlers(context: AccountContext): void {
  registerAccountHandlers(context);
  registerAppSystemHandlers();
  registerConfigHandlers();
  registerGlobalLogHandlers();
  registerLicenseHandlers();
  registerNotificationHandlers();
  registerSettingsHandlers();
}
