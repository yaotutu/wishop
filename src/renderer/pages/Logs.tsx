import React, { useEffect } from 'react';
import { Card, Button, Space, Timeline } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import { useLogs } from '../hooks/useIpc';

interface LogEntry {
  id: string;
  timestamp: number;
  productId: string;
  productTitle: string;
  status: 'success' | 'failed';
  errorCode?: number;
  errorMsg?: string;
}

const Logs: React.FC = () => {
  const { logs, fetchLogs, clearLogs } = useLogs();

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <Card
      size="small"
      title="上架记录"
      extra={
        <Space>
          <Button size="small" type="link" onClick={fetchLogs}>刷新</Button>
          <Button size="small" type="link" danger icon={<DeleteOutlined />} onClick={() => { clearLogs(); }}>
            清空
          </Button>
        </Space>
      }
    >
      {logs.length === 0 ? (
        <div style={{ color: '#999', textAlign: 'center', padding: 40 }}>暂无记录</div>
      ) : (
        <Timeline
          items={logs.map((log: LogEntry) => ({
            color: log.status === 'success' ? 'green' : 'red',
            children: (
              <div style={{ fontSize: 13 }}>
                <Space>
                  {log.status === 'success' ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                  <span>{log.productTitle || log.productId}</span>
                  <span style={{ color: '#999' }}>{new Date(log.timestamp).toLocaleString('zh-CN')}</span>
                </Space>
                {log.status === 'failed' && log.errorMsg && (
                  <div style={{ color: '#ff4d4f', fontSize: 12, marginTop: 4 }}>{log.errorMsg}</div>
                )}
              </div>
            ),
          }))}
        />
      )}
    </Card>
  );
};

export default Logs;
