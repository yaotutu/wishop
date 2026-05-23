import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DraftProduct } from '../../shared/types';

const mocks = vi.hoisted(() => ({
  products: [] as DraftProduct[],
}));

vi.mock('./fetch-draft-products', () => ({
  streamDraftProducts: async function* () {
    for (const product of mocks.products) {
      yield product;
    }
  },
}));

vi.mock('../utils/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

const { batchScan, findMatches } = await import('./violation-detect');

function product(productId: string, title: string, editStatus = 72): DraftProduct {
  return {
    productId,
    title,
    editStatus,
    status: 0,
    headImgs: [],
  };
}

describe('violation detection', () => {
  beforeEach(() => {
    mocks.products = [];
  });

  it('matches words case-insensitively and ignores empty words', () => {
    expect(findMatches('Alpha 禁词 title', ['', 'alpha', '禁词'])).toEqual(['alpha', '禁词']);
  });

  it('stops batch scanning at the scanned product limit even when later products also match', async () => {
    mocks.products = [
      product('product-1', '含禁词商品'),
      product('product-2', '普通商品'),
      product('product-3', '另一个禁词商品'),
    ];
    const addLog = vi.fn();

    const result = await batchScan({} as any, addLog, ['禁词'], 'run-1', undefined, 2, 'account-1');

    expect(result).toMatchObject({
      scanned: 2,
      errors: 0,
      stopped: false,
    });
    expect(result.violations).toEqual([
      { productId: 'product-1', title: '含禁词商品', matchedWords: ['禁词'] },
    ]);
  });
});
