import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Space, Tag, message, Image, Timeline, Select } from 'antd';
import { ReloadOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useDrafts, useQuota, useLogs } from '../hooks/useIpc';

const STATUS_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: '可上架', value: 2 },  // edit_status=2 审核中/可上架
  { label: '审核中', value: 2 },
  { label: '上传中', value: 7 },
  { label: '上传失败', value: 8 },
];

interface DraftProduct {
  productId: string;
  title: string;
  headImgs: string[];
  status: number;
  editStatus: number;
}

interface LogEntry {
  id: string;
  timestamp: number;
  productId: string;
  productTitle: string;
  status: 'success' | 'failed';
  errorCode?: number;
  errorMsg?: string;
}

const Listing: React.FC = () => {
  const { drafts, loading, fetchDrafts, listProduct } = useDrafts();
  const { quota, fetchQuota } = useQuota();
  const { logs, fetchLogs } = useLogs();
  const [listingId, setListingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<number | 'all'>('all');

  // 筛选变化时重新获取数据（暂时只用全部）
  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  // 初始加载
  useEffect(() => {
    fetchQuota();
    fetchLogs();
  }, [fetchQuota, fetchLogs]);

  const handleList = async (product: DraftProduct) => {
    setListingId(product.productId);
    try {
      const result = await listProduct(product.productId);
      if (result.success) {
        message.success(`"${product.title}" 上架成功`);
        const editStatus = statusFilter === 'all' ? null : statusFilter;
        fetchDrafts(editStatus);
        fetchQuota();
        fetchLogs();
      } else {
        message.error(`上架失败: ${result.error}`);
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
          <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {record.title || record.productId}
          </span>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'editStatus',
      key: 'editStatus',
      width: 100,
      render: (status: number) => {
        const statusMap: Record<number, string> = {
          0: '初始', 1: '编辑中', 2: '审核中', 3: '失败', 4: '成功', 7: '上传中', 8: '失败',
        };
        return <Tag color={status === 2 ? 'green' : 'orange'}>{statusMap[status] || status}</Tag>;
      },
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
          disabled={record.editStatus !== 2}
        >
          上架
        </Button>
      ),
    },
  ];

  const recentLogs = logs.slice(0, 10);

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Card
        size="small"
        title="草稿箱"
        extra={
          <Space>
            <Select
              size="small"
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_OPTIONS}
              style={{ width: 100 }}
            />
            <Tag color={quota.quota > 0 ? 'green' : 'red'}>
              剩余配额: {quota.quota}/{quota.total}
            </Tag>
            <Button size="small" icon={<ReloadOutlined />} onClick={() => { const editStatus = statusFilter === 'all' ? null : statusFilter; fetchDrafts(editStatus); fetchQuota(); }}>
              刷新
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={drafts}
          rowKey="productId"
          pagination={{ pageSize: 10, size: 'small' }}
          size="small"
          loading={loading}
          scroll={{ y: 300 }}
        />
      </Card>

      <Card
        size="small"
        title="最近上架记录"
        extra={
          <Button size="small" type="link" onClick={fetchLogs}>
            刷新
          </Button>
        }
      >
        {recentLogs.length === 0 ? (
          <div style={{ color: '#999', textAlign: 'center', padding: 20 }}>暂无记录</div>
        ) : (
          <Timeline
            items={recentLogs.map((log: LogEntry) => ({
              color: log.status === 'success' ? 'green' : 'red',
              children: (
                <div style={{ fontSize: 12 }}>
                  <Space>
                    {log.status === 'success' ? <CheckCircleOutlined style={{ color: 'green' }} /> : <CloseCircleOutlined style={{ color: 'red' }} />}
                    <span>{log.productTitle || log.productId}</span>
                    <span style={{ color: '#999' }}>{new Date(log.timestamp).toLocaleTimeString('zh-CN')}</span>
                  </Space>
                  {log.status === 'failed' && log.errorMsg && (
                    <div style={{ color: '#ff4d4f', fontSize: 11 }}>{log.errorMsg}</div>
                  )}
                </div>
              ),
            }))}
          />
        )}
      </Card>
    </Space>
  );
};

export default Listing;
