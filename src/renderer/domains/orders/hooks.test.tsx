/**
 * @vitest-environment jsdom
 */
import React, { useEffect } from 'react';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useOrderDelivery, useOrders, useTaobaoOrderAutomation } from './hooks';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  listCompanies: vi.fn(),
  shipFromPurchase: vi.fn(),
  lookupPurchase: vi.fn(),
  prepareRefund: vi.fn(),
}));

vi.mock('./client', () => ({
  ordersClient: {
    list: mocks.list,
    detail: vi.fn(),
    search: vi.fn(),
    decodeAddress: vi.fn(),
    productSources: { list: vi.fn(), save: vi.fn() },
    associations: { list: vi.fn(), save: vi.fn() },
    realAddresses: { list: vi.fn(), fetch: vi.fn() },
    delivery: { listCompanies: mocks.listCompanies, shipFromPurchase: mocks.shipFromPurchase },
    taobao: { lookupPurchase: mocks.lookupPurchase, prepareRefund: mocks.prepareRefund, fillCheckoutAddress: vi.fn() },
  },
}));

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

describe('useOrders', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('keeps fetchOrders stable after a list request resolves', async () => {
    mocks.list.mockResolvedValue({ orders: [], hasMore: false });

    function Probe() {
      const { fetchOrders } = useOrders('account-1');
      useEffect(() => {
        void fetchOrders(undefined, false, 'all');
      }, [fetchOrders]);
      return null;
    }

    const client = createQueryClient();
    render(
      <QueryClientProvider client={client}>
        <Probe />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(mocks.list).toHaveBeenCalled());
    await new Promise(resolve => setTimeout(resolve, 30));

    expect(mocks.list).toHaveBeenCalledTimes(1);
  });

  it('wraps delivery calls with account scope', async () => {
    mocks.listCompanies.mockResolvedValue([{ deliveryId: 'sf', deliveryName: '顺丰' }]);
    mocks.shipFromPurchase.mockResolvedValue({ deliveryName: '顺丰', waybillId: 'SF123' });
    let api: ReturnType<typeof useOrderDelivery> | undefined;

    function Probe() {
      api = useOrderDelivery('account-1');
      return null;
    }

    const client = createQueryClient();
    render(
      <QueryClientProvider client={client}>
        <Probe />
      </QueryClientProvider>,
    );

    await act(async () => {
      await api?.listDeliveryCompanies();
      await api?.shipFromPurchase({
        orderId: 'order-1',
        logisticsCompany: '顺丰',
        trackingNumber: 'SF123',
      });
    });

    expect(mocks.listCompanies).toHaveBeenCalledWith('account-1');
    expect(mocks.shipFromPurchase).toHaveBeenCalledWith({
      accountId: 'account-1',
      orderId: 'order-1',
      logisticsCompany: '顺丰',
      trackingNumber: 'SF123',
    });
  });

  it('wraps Taobao automation calls with account scope', async () => {
    mocks.lookupPurchase.mockResolvedValue({ snapshot: {} });
    mocks.prepareRefund.mockResolvedValue({ snapshot: { autoSubmitted: false } });
    let api: ReturnType<typeof useTaobaoOrderAutomation> | undefined;

    function Probe() {
      api = useTaobaoOrderAutomation('account-1');
      return null;
    }

    const client = createQueryClient();
    render(
      <QueryClientProvider client={client}>
        <Probe />
      </QueryClientProvider>,
    );

    await act(async () => {
      await api?.lookupPurchase({ orderId: 'order-1', platformOrderId: 'tb-1' });
      await api?.prepareRefund({
        orderId: 'order-1',
        platformOrderId: 'tb-1',
        reason: '不想要了',
        autoSubmit: true,
      });
    });

    expect(mocks.lookupPurchase).toHaveBeenCalledWith({
      accountId: 'account-1',
      orderId: 'order-1',
      platformOrderId: 'tb-1',
    });
    expect(mocks.prepareRefund).toHaveBeenCalledWith({
      accountId: 'account-1',
      orderId: 'order-1',
      platformOrderId: 'tb-1',
      reason: '不想要了',
      autoSubmit: true,
    });
  });
});
