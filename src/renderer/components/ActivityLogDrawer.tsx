import React, { useEffect, useState } from 'react';
import { Button, Drawer, Empty, Space, Tag, Typography } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import type { ActivityLogEntry } from '../../shared/activity-log';

const levelColor: Record<ActivityLogEntry['level'], string> = {
  info: 'blue',
  success: 'green',
  warning: 'orange',
  error: 'red',
};

const ActivityLogDrawer: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);

  const load = async () => {
    setLogs(await window.electronAPI.activityLogs.list());
  };

  useEffect(() => {
    void load();
    return window.electronAPI.activityLogs.onAdded((log: ActivityLogEntry) => {
      setLogs(prev => [log, ...prev].slice(0, 500));
    });
  }, []);

  return (
    <>
      <Button
        size="small"
        icon={<FileTextOutlined />}
        onClick={() => {
          setOpen(true);
          void load();
        }}
      />
      <Drawer
        title="活动日志"
        open={open}
        onClose={() => setOpen(false)}
        size={560}
        extra={<Button size="small" onClick={load}>刷新</Button>}
      >
        {logs.length === 0 ? (
          <Empty description="暂无数据" />
        ) : (
          <div role="list">
            {logs.map(log => (
              <div key={log.id} role="listitem" style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
              <Space vertical size={2} style={{ width: '100%' }}>
                <Space size={4} wrap>
                  <Tag color={levelColor[log.level]}>{log.level}</Tag>
                  <Tag>{log.domain}</Tag>
                  <Tag>{log.event}</Tag>
                  {log.accountName && <Tag>{log.accountName}</Tag>}
                </Space>
                <Typography.Text strong>{log.title}</Typography.Text>
                {log.detail && <Typography.Text type="secondary" style={{ fontSize: 12 }}>{log.detail}</Typography.Text>}
                {log.error?.message && <Typography.Text type="danger" style={{ fontSize: 12 }}>{log.error.message}</Typography.Text>}
              </Space>
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </>
  );
};

export default ActivityLogDrawer;
