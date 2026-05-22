export interface CronPreset {
  label: string;
  value: string;
}

export const dailyCronPresets: CronPreset[] = [
  { label: '每天 6:00', value: '0 6 * * *' },
  { label: '每天 9:00', value: '0 9 * * *' },
  { label: '每天 12:00', value: '0 12 * * *' },
  { label: '每天 14:00', value: '0 14 * * *' },
  { label: '每天 18:00', value: '0 18 * * *' },
  { label: '每天 21:00', value: '0 21 * * *' },
];

export const intervalCronPresets: CronPreset[] = [
  { label: '每 2 小时', value: '0 */2 * * *' },
  { label: '每 4 小时', value: '0 */4 * * *' },
  { label: '每 10 分钟', value: '*/10 * * * *' },
  { label: '每 30 分钟', value: '*/30 * * * *' },
];

export const cronPresets: CronPreset[] = [
  ...dailyCronPresets,
  ...intervalCronPresets,
];

export function formatCron(cronExpression: string): string {
  const preset = cronPresets.find(p => p.value === cronExpression);
  if (preset) return preset.label;

  const daily = cronExpression.match(/^(\d+)\s+(\d+)\s+\*\s+\*\s+\*$/);
  if (daily) return `每天 ${daily[2].padStart(2, '0')}:${daily[1].padStart(2, '0')}`;

  const everyMinutes = cronExpression.match(/^\*\/(\d+)\s+\*\s+\*\s+\*\s+\*$/);
  if (everyMinutes) return `每 ${everyMinutes[1]} 分钟`;

  const hourly = cronExpression.match(/^(\d+)\s+\*\s+\*\s+\*\s+\*$/);
  if (hourly) return `每小时第 ${hourly[1].padStart(2, '0')} 分钟`;

  return cronExpression;
}

export function cronToTimeInput(cronExpression: string): string {
  const daily = cronExpression.match(/^(\d+)\s+(\d+)\s+\*\s+\*\s+\*$/);
  if (!daily) return '';
  return `${daily[2].padStart(2, '0')}:${daily[1].padStart(2, '0')}`;
}

export function timeInputToDailyCron(value: string): string | null {
  const match = value.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return `${minute} ${hour} * * *`;
}
