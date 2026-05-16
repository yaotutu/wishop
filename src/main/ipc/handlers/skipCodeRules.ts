import { ipcMain } from 'electron';
import { getSkipKeywords, setSkipKeywords } from '../../store';

export function registerSkipCodeRulesHandlers(): void {
  ipcMain.handle('skipKeywords:get', (): string[] => {
    return getSkipKeywords();
  });

  ipcMain.handle('skipKeywords:set', (_, keywords: string[]): void => {
    setSkipKeywords(keywords);
  });
}
