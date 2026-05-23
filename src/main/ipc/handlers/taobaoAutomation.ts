import { BrowserWindow, ipcMain } from 'electron';
import { getOrderAssociations, setOrderAssociation } from '../../store';
import type {
  CheckoutAddressFillResult,
  OrderAddressInfo,
  PurchaseLookupAutomationInput,
  PurchaseLookupAutomationResult,
  TaobaoRefundAutomationInput,
  TaobaoRefundAutomationResult,
} from '../../../shared/types';
import {
  fillCurrentTaobaoCheckoutAddress,
  runPurchaseLookupAutomation,
  runTaobaoRefundAutomation,
} from '../../services/taobao-automation-service';

export function registerTaobaoAutomationHandlers(): void {
  ipcMain.handle('taobaoAutomation:lookupPurchase', async (event, input: PurchaseLookupAutomationInput): Promise<PurchaseLookupAutomationResult> => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) throw new Error('主窗口不存在');
    return runPurchaseLookupAutomation(win, input, { getOrderAssociations, setOrderAssociation });
  });

  ipcMain.handle('taobaoAutomation:prepareRefund', async (event, input: TaobaoRefundAutomationInput): Promise<TaobaoRefundAutomationResult> => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) throw new Error('主窗口不存在');
    return runTaobaoRefundAutomation(win, input);
  });

  ipcMain.handle('taobaoAutomation:fillCheckoutAddress', async (_, address: OrderAddressInfo): Promise<CheckoutAddressFillResult> => {
    return fillCurrentTaobaoCheckoutAddress(address);
  });
}
