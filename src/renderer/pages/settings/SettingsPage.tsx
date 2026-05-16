import React, { useEffect, useState } from 'react';
import { Card, Button, Progress, Space, Typography, Descriptions } from 'antd';
import { CheckCircleOutlined, CloudDownloadOutlined, ReloadOutlined } from '@ant-design/icons';

type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'not-available' | 'error';

const SettingsPage: React.FC = () => {
  const [version, setVersion] = useState('');
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle');
  const [newVersion, setNewVersion] = useState('');
  const [downloadPercent, setDownloadPercent] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    window.appVersion?.get().then((v: string) => setVersion(v));
  }, []);

  useEffect(() => {
    window.updater?.onAvailable((info) => {
      setNewVersion(info.version);
      setUpdateStatus('available');
    });
    window.updater?.onProgress((info) => {
      setDownloadPercent(info.percent);
      setUpdateStatus('downloading');
    });
    window.updater?.onDownloaded((info) => {
      setNewVersion(info.version);
      setUpdateStatus('downloaded');
    });
    window.updater?.onNotAvailable(() => {
      setUpdateStatus('not-available');
    });
    window.updater?.onError((error) => {
      setErrorMsg(error);
      setUpdateStatus('error');
    });
  }, []);

  const handleCheck = async () => {
    setUpdateStatus('checking');
    setErrorMsg('');
    setNewVersion('');
    setDownloadPercent(0);
    try {
      await window.updater?.check();
    } catch {
      // 事件回调会处理状态
    }
  };

  const handleInstall = () => {
    window.updater?.install();
  };

  const renderUpdateAction = () => {
    switch (updateStatus) {
      case 'checking':
        return <Button icon={<ReloadOutlined spin />} disabled>检查中...</Button>;
      case 'available':
        return <span style={{ color: '#1677ff' }}>发现新版本 v{newVersion}，正在下载...</span>;
      case 'downloading':
        return <Progress percent={downloadPercent} style={{ maxWidth: 300 }} />;
      case 'downloaded':
        return (
          <Button type="primary" icon={<CloudDownloadOutlined />} onClick={handleInstall}>
            重启并更新到 v{newVersion}
          </Button>
        );
      case 'not-available':
        return <span style={{ color: '#52c41a' }}><CheckCircleOutlined /> 当前已是最新版本</span>;
      case 'error':
        return <span style={{ color: '#ff4d4f' }}>更新失败：{errorMsg}</span>;
      default:
        return null;
    }
  };

  return (
    <Card title="关于">
      <Descriptions column={1} style={{ maxWidth: 500 }}>
        <Descriptions.Item label="当前版本">v{version}</Descriptions.Item>
      </Descriptions>
      <Space style={{ marginTop: 16 }}>
        {(updateStatus === 'idle' || updateStatus === 'not-available' || updateStatus === 'error') && (
          <Button type="primary" onClick={handleCheck} disabled={updateStatus === 'checking'}>
            检查更新
          </Button>
        )}
        {renderUpdateAction()}
      </Space>
    </Card>
  );
};

export default SettingsPage;
