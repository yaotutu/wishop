/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OrderToolbar } from './OrderToolbar';

const noop = vi.fn();

describe('OrderToolbar', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows refresh loading without also marking search as loading', () => {
    const { container } = render(
      <OrderToolbar
        activeStatus={undefined}
        timeScope="all"
        searchActive={false}
        searchType="order_id"
        searchKeyword=""
        refreshLoading
        searchLoading={false}
        error={null}
        onStatusChange={noop}
        onTimeScopeChange={noop}
        onSearchTypeChange={noop}
        onSearchKeywordChange={noop}
        onSearch={noop}
        onRefresh={noop}
        onClearError={noop}
      />,
    );

    const refreshButton = screen.getByRole('button', { name: /刷新/ });
    const searchButton = screen.getByRole('button', { name: /搜\s*索/ });

    expect(refreshButton.className).toContain('ant-btn-loading');
    expect(searchButton.className).not.toContain('ant-btn-loading');
    expect(container.querySelectorAll('.ant-btn-loading')).toHaveLength(1);
  });
});
