import React, { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Drawer, Empty, Space, Tag, Typography } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import type { NotificationEntry } from '../../shared/notification';

const levelColor: Record<NotificationEntry['level'], string> = {
  info: 'blue',
  success: 'green',
  warning: 'orange',
  error: 'red',
};

const NotificationCenter: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);

  const load = async () => {
    setNotifications(await window.electronAPI.notifications.list());
  };

  useEffect(() => {
    void load();
    const offAdded = window.electronAPI.notifications.onAdded((notification: NotificationEntry) => {
      setNotifications(prev => [notification, ...prev].slice(0, 500));
    });
    const offChanged = window.electronAPI.notifications.onChanged(setNotifications);
    return () => {
      offAdded();
      offChanged();
    };
  }, []);

  const unreadCount = useMemo(() => notifications.filter(item => !item.readAt).length, [notifications]);

  return (
    <>
      <Badge count={unreadCount} size="small">
        <Button
          size="small"
          icon={<BellOutlined />}
          onClick={() => {
            setOpen(true);
            void load();
          }}
        />
      </Badge>
      <Drawer
        title="通知中心"
        open={open}
        onClose={() => setOpen(false)}
        size={560}
        extra={<Button size="small" onClick={() => window.electronAPI.notifications.markAllRead().then(setNotifications)}>全部已读</Button>}
      >
        {notifications.length === 0 ? (
          <Empty description="暂无数据" />
        ) : (
          <div role="list">
            {notifications.map(notification => (
              <div
                key={notification.id}
                role="listitem"
                style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}
              >
                <Space vertical size={2} style={{ flex: 1, minWidth: 0 }}>
                  <Space size={4} wrap>
                    <Tag color={levelColor[notification.level]}>{notification.level}</Tag>
                    <Tag>{notification.domain}</Tag>
                    {!notification.readAt && <Tag color="red">未读</Tag>}
                  </Space>
                  <Typography.Text strong>{notification.title}</Typography.Text>
                  {notification.detail && <Typography.Text type="secondary" style={{ fontSize: 12 }}>{notification.detail}</Typography.Text>}
                  {notification.errorMessage && <Typography.Text type="danger" style={{ fontSize: 12 }}>{notification.errorMessage}</Typography.Text>}
                </Space>
                {!notification.readAt && (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => window.electronAPI.notifications.markRead(notification.id).then(setNotifications)}
                  >
                    已读
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </>
  );
};

export default NotificationCenter;
