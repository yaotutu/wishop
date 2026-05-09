import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Space, Tag, message, Image } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useDrafts, useQuota } from '../hooks/useIpc';

interface DraftProduct {
  productId: string;
  title: string;
  headImgs: string[];
  status: number;
  editStatus: number;
}

const Listing: React.FC = () => {
  const { drafts, hasMore, loading, fetchDrafts, listProduct } = useDrafts();
  const { quota, fetchQuota } = useQuota();
  const [listingId, setListingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDrafts(true);
    fetchQuota();
  }, []);

  const handleList = async (product: DraftProduct) => {
    setListingId(product.productId);
    try {
      const result = await listProduct(product.productId);
      if (result.success) {
        message.success(`"${product.title}" 提交审核成功`);
        fetchDrafts(true);
        fetchQuota();
      } else {
        message.error(`提交审核失败: ${result.error}`);
      }
    } finally {
      setListingId(null);
    }
  };

  const columns = [
    {
      title: '商品',
      dataIndex: 'title',
      key: 'title',
      render: (_: any, record: DraftProduct) => (
        <Space>
          {record.headImgs.length > 0 && <Image src={record.headImgs[0]} width={40} height={40} />}
          <span style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {record.title || record.productId}
          </span>
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: DraftProduct) => (
        <Button
          type="link"
          onClick={() => handleList(record)}
          loading={listingId === record.productId}
        >
          提交审核
        </Button>
      ),
    },
  ];

  return (
    <Card
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      styles={{ body: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0 8px 8px' } }}
      title="未上架"
      extra={
        <Space>
          <Tag color={quota.quota > 0 ? 'green' : 'red'}>
            剩余配额: {quota.quota}/{quota.total}
          </Tag>
          <Button size="small" icon={<ReloadOutlined />} onClick={() => { fetchDrafts(true); fetchQuota(); }}>
            刷新
          </Button>
        </Space>
      }
    >
      <Table
        columns={columns}
        dataSource={drafts}
        rowKey="productId"
        pagination={false}
        size="small"
        loading={loading}
        style={{ flex: 1 }}
      />
      {hasMore && (
        <div style={{ textAlign: 'center', padding: '12px 0', borderTop: '1px solid #f0f0f0' }}>
          <Button type="link" loading={loading} onClick={() => fetchDrafts(false)}>
            加载更多
          </Button>
        </div>
      )}
    </Card>
  );
};

export default Listing;
