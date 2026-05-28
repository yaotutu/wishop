export interface AppSettings {}

export interface AppSettingsPatch {}

export const DEFAULT_APP_SETTINGS: AppSettings = {};

export function normalizeAppSettings(_input?: AppSettingsPatch): AppSettings {
  return {};
}
