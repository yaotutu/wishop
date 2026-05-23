import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DraftProduct, StatusRule, TaskConfig } from '../../shared/types';

const mocks = vi.hoisted(() => ({
  products: [] as DraftProduct[],
  deleteOne: vi.fn(),
  listOne: vi.fn(),
}));

vi.mock('./fetch-draft-products', () => ({
  streamDraftProducts: async function* () {
    for (const product of mocks.products) {
      yield product;
    }
  },
}));

vi.mock('./delete-failed-products', () => ({
  deleteOne: mocks.deleteOne,
}));

vi.mock('./list-unreviewed-products', () => ({
  listOne: mocks.listOne,
}));

vi.mock('../utils/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

const { runTaskCycle } = await import('./task-cycle');

const taskConfig: TaskConfig = {
  listUnreviewed: true,
  listUnreviewedQuantity: 10,
  autoDeleteFailed: true,
};

const statusRules: StatusRule[] = [
  { editStatus: 72, label: '待审核', action: 'submit' },
  { editStatus: 3, label: '审核失败', action: 'delete' },
  { editStatus: 1, label: '编辑中', action: 'skip' },
];

function product(productId: string, title: string, editStatus: number): DraftProduct {
  return {
    productId,
    title,
    editStatus,
    status: 0,
    headImgs: [],
  };
}

describe('task cycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.products = [];
    mocks.listOne.mockResolvedValue('success');
    mocks.deleteOne.mockResolvedValue('success');
  });

  it('applies status rules to submit, delete, and skip draft products', async () => {
    mocks.products = [
      product('product-submit', '提交商品', 72),
      product('product-delete', '删除商品', 3),
      product('product-skip', '跳过商品', 1),
    ];

    const result = await runTaskCycle({} as any, vi.fn(), taskConfig, 'run-1', undefined, 'account-1', [], [], statusRules);

    expect(mocks.listOne).toHaveBeenCalledTimes(1);
    expect(mocks.listOne.mock.calls[0][2].productId).toBe('product-submit');
    expect(mocks.deleteOne).toHaveBeenCalledTimes(1);
    expect(mocks.deleteOne.mock.calls[0][2].productId).toBe('product-delete');
    expect(result).toMatchObject({
      scanned: 3,
      listed: 1,
      deleted: 1,
      skipped: 1,
      errors: 0,
      stopped: false,
    });
  });

  it('stops the cycle when listing returns stopped', async () => {
    mocks.products = [
      product('product-stop', '触发黑名单', 72),
      product('product-never', '不应继续处理', 3),
    ];
    mocks.listOne.mockResolvedValue('stopped');

    const result = await runTaskCycle({} as any, vi.fn(), taskConfig, 'run-1', undefined, 'account-1', [], [], statusRules);

    expect(mocks.listOne).toHaveBeenCalledTimes(1);
    expect(mocks.deleteOne).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      scanned: 1,
      listed: 0,
      deleted: 0,
      stopped: true,
      reason: '触发黑名单错误码，停止任务',
    });
  });
});
