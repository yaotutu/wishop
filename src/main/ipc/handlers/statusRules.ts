import { ipcMain } from 'electron';
import { getStatusRules, setStatusRules, getDefaultStatusRules } from '../../store';
import type { StatusRule } from '../../../shared/types';

// 处理规则 IPC handler — 管理 editStatus → action 的映射规则
// statusRules:get  获取当前规则列表
// statusRules:set  保存规则列表
// statusRules:reset 恢复默认规则

export function registerStatusRulesHandlers(): void {
  ipcMain.handle('statusRules:get', (): StatusRule[] => {
    return getStatusRules();
  });

  ipcMain.handle('statusRules:set', (_, rules: StatusRule[]): void => {
    setStatusRules(rules);
  });

  ipcMain.handle('statusRules:reset', (): StatusRule[] => {
    const defaults = getDefaultStatusRules();
    setStatusRules(defaults);
    return defaults;
  });
}
