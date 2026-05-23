import { describe, expect, it } from 'vitest';
import { createOrderRepository } from './order-repository';
import type { FullAccount, OrderAddressInfo } from '../../../shared/types';

function makeAccount(): FullAccount {
  return {
    id: 'account-1',
    name: '店铺',
    config: { appId: 'app', appSecret: 'secret' },
    taskConfig: { listUnreviewed: true, listUnreviewedQuantity: 2, autoDeleteFailed: true },
    logs: [],
    violationWords: [],
    productSources: [],
    orderAssociations: [],
    realAddressCaches: [],
    createdAt: 1,
  };
}

function makeAddress(name: string): OrderAddressInfo {
  return {
    user_name: name,
    postal_code: '',
    province_name: '浙江省',
    city_name: '杭州市',
    county_name: '西湖区',
    detail_info: '文一路',
    tel_number: '13800000000',
    house_number: '',
  };
}

describe('order repository', () => {
  it('normalizes product sources and removes empty source lists', () => {
    let accounts = [makeAccount()];
    const repo = createOrderRepository({
      getAccounts: () => accounts,
      setAccounts: next => { accounts = next; },
      now: () => 100,
      createId: () => 'source-id',
    });

    repo.setProductSources('account-1', 'product-1', [
      { id: '', url: ' https://item.taobao.com/1 ', quantity: 0, remark: ' 备注 ', createdAt: 0, updatedAt: 0 },
      { id: '', url: '   ', quantity: 1, remark: '', createdAt: 0, updatedAt: 0 },
    ]);

    expect(accounts[0].productSources).toEqual([{
      productId: 'product-1',
      sources: [{
        id: 'source-id',
        url: 'https://item.taobao.com/1',
        quantity: 1,
        remark: '备注',
        createdAt: 100,
        updatedAt: 100,
      }],
    }]);

    repo.setProductSources('account-1', 'product-1', []);
    expect(accounts[0].productSources).toEqual([]);
  });

  it('removes an order association when no user-maintained content remains', () => {
    let accounts = [makeAccount()];
    const repo = createOrderRepository({
      getAccounts: () => accounts,
      setAccounts: next => { accounts = next; },
      now: () => 200,
      createId: () => 'linked-id',
    });

    repo.setOrderAssociation('account-1', 'order-1', {
      internalRemark: '  important ',
      linkedOrders: [],
    });
    expect(accounts[0].orderAssociations).toHaveLength(1);

    repo.setOrderAssociation('account-1', 'order-1', {
      internalRemark: '   ',
      linkedOrders: [],
    });
    expect(accounts[0].orderAssociations).toEqual([]);
  });

  it('overwrites real address cache for the same order', () => {
    let accounts = [makeAccount()];
    const repo = createOrderRepository({
      getAccounts: () => accounts,
      setAccounts: next => { accounts = next; },
      now: () => 300,
      createId: () => 'unused',
    });

    repo.setRealAddressCache('account-1', 'order-1', makeAddress('张三'));
    repo.setRealAddressCache('account-1', 'order-1', makeAddress('李四'));

    expect(accounts[0].realAddressCaches).toHaveLength(1);
    expect(accounts[0].realAddressCaches[0]).toMatchObject({
      orderId: 'order-1',
      address: { user_name: '李四' },
      fetchedAt: 300,
      updatedAt: 300,
    });
  });
});
