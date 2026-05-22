import React, { useEffect, useState } from 'react';
import { Alert, Card, Menu, Button, Progress, Space, Descriptions, Typography, Image, Input, Tag, message } from 'antd';
import {
  CheckCircleOutlined,
  CloudDownloadOutlined,
  InfoCircleOutlined,
  AppstoreOutlined,
  CustomerServiceOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import wechatQrcode from '../../assets/wechat-qrcode.png';
import douyinQrcode from '../../assets/douyin-qrcode.png';
import type { LicenseState } from '../../../shared/types';

const { Title, Paragraph, Text } = Typography;

type SettingsTab = 'about' | 'product' | 'license' | 'contact';
type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'not-available' | 'error';

interface SettingsPageProps {
  defaultTab?: SettingsTab;
}

const MENU_ITEMS = [
  { key: 'about', label: '关于/更新', icon: <InfoCircleOutlined /> },
  { key: 'product', label: '产品介绍', icon: <AppstoreOutlined /> },
  { key: 'license', label: '授权状态', icon: <SafetyCertificateOutlined /> },
  { key: 'contact', label: '联系我们', icon: <CustomerServiceOutlined /> },
];

/** 关于/更新 */
const AboutPanel: React.FC = () => {
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
    <Card title="关于 Wishop">
      <Descriptions column={1} style={{ maxWidth: 500 }}>
        <Descriptions.Item label="应用名称">Wishop - 微信小店上架助手</Descriptions.Item>
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

/** 产品介绍 */
const ProductPanel: React.FC = () => {
  const features = [
    { title: '商品提审', desc: '批量提交商品审核，支持定时调度，自动处理审核结果' },
    { title: '违规词检测', desc: '扫描商品标题和描述中的违规词，批量处理不合规商品' },
    { title: '订单管理', desc: '多账户订单查看、搜索、详情查看、地址解密' },
    { title: '多账户管理', desc: '一个应用管理多个微信小店，账户数据完全隔离' },
    { title: '自动更新', desc: '支持自动检测和一键更新，始终保持最新版本' },
  ];

  return (
    <Card title="产品介绍">
      <Title level={4}>Wishop - 微信小店上架助手</Title>
      <Paragraph style={{ maxWidth: 600, color: '#555' }}>
        Wishop 是一款专为微信小店商家打造的桌面效率工具，帮助你高效管理多个店铺的商品上架、审核和合规检测流程。
      </Paragraph>
      <div style={{ marginTop: 24 }}>
        <Title level={5}>核心功能</Title>
        {features.map((f, i) => (
          <div key={i} style={{ marginBottom: 16 }}>
            <Text strong>{f.title}</Text>
            <br />
            <Text type="secondary">{f.desc}</Text>
          </div>
        ))}
      </div>
    </Card>
  );
};

const LicensePanel: React.FC = () => {
  const [license, setLicense] = useState<LicenseState | null>(null);
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);

  const loadLicense = async () => {
    const state = await window.electronAPI.license.get();
    setLicense(state);
    setLicenseKey(state.licenseKey || '');
  };

  useEffect(() => {
    void loadLicense();
  }, []);

  const activate = async () => {
    setLoading(true);
    try {
      const state = await window.electronAPI.license.activate({ licenseKey });
      setLicense(state);
      message.success('授权信息已保存');
    } catch (error: any) {
      message.error(error?.message || '保存授权失败');
    } finally {
      setLoading(false);
    }
  };

  const clear = async () => {
    setLoading(true);
    try {
      const state = await window.electronAPI.license.clear();
      setLicense(state);
      setLicenseKey('');
      message.success('授权信息已清除');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="授权状态">
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="授权拦截暂未启用"
        description="当前版本只保存授权结构和本地状态，不会限制订单、提审、违规检测或发货功能。"
      />
      <Descriptions column={1} style={{ maxWidth: 620 }}>
        <Descriptions.Item label="授权开关">
          <Tag color={license?.enforcementEnabled ? 'red' : 'default'}>
            {license?.enforcementEnabled ? '已启用' : '未启用'}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="授权状态">{license?.status || '-'}</Descriptions.Item>
        <Descriptions.Item label="套餐">{license?.plan || '-'}</Descriptions.Item>
        <Descriptions.Item label="设备 ID">{license?.deviceId || '-'}</Descriptions.Item>
        <Descriptions.Item label="最近检查">
          {license?.checkedAt ? new Date(license.checkedAt).toLocaleString('zh-CN') : '-'}
        </Descriptions.Item>
      </Descriptions>
      <Space.Compact style={{ width: 520, maxWidth: '100%', marginTop: 16 }}>
        <Input.Password
          value={licenseKey}
          onChange={(e) => setLicenseKey(e.target.value)}
          placeholder="输入激活码"
        />
        <Button type="primary" loading={loading} onClick={activate}>保存</Button>
      </Space.Compact>
      <div style={{ marginTop: 12 }}>
        <Button danger loading={loading} onClick={clear}>清除授权信息</Button>
      </div>
    </Card>
  );
};

/** 联系我们 */
const ContactPanel: React.FC = () => (
  <Card title="联系我们">
    <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
      <div style={{ textAlign: 'center' }}>
        <Title level={5}>微信</Title>
        <Image
          src={wechatQrcode}
          alt="微信二维码"
          width={200}
          height={200}
          style={{ borderRadius: 8, border: '1px solid #f0f0f0' }}
          preview={false}
          fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23f5f5f5' width='200' height='200'/%3E%3Ctext x='100' y='108' text-anchor='middle' fill='%23999' font-size='14'%3E请放入 wechat-qrcode.png%3C/text%3E%3C/svg%3E"
        />
        <div style={{ marginTop: 8, color: '#999', fontSize: 13 }}>扫码添加微信</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <Title level={5}>抖音</Title>
        <Image
          src={douyinQrcode}
          alt="抖音二维码"
          width={200}
          height={200}
          style={{ borderRadius: 8, border: '1px solid #f0f0f0' }}
          preview={false}
          fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23f5f5f5' width='200' height='200'/%3E%3Ctext x='100' y='108' text-anchor='middle' fill='%23999' font-size='14'%3E请放入 douyin-qrcode.png%3C/text%3E%3C/svg%3E"
        />
        <div style={{ marginTop: 8, color: '#999', fontSize: 13 }}>扫码关注抖音</div>
      </div>
    </div>
  </Card>
);

const SettingsPage: React.FC<SettingsPageProps> = ({ defaultTab = 'about' }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(defaultTab);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  return (
    <div style={{ height: '100%', display: 'flex', overflow: 'hidden' }}>
      <Menu
        mode="inline"
        selectedKeys={[activeTab]}
        onClick={({ key }) => setActiveTab(key as SettingsTab)}
        items={MENU_ITEMS}
        style={{ width: 160, height: '100%', borderRight: '1px solid #f0f0f0' }}
      />
      <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
        {activeTab === 'about' && <AboutPanel />}
        {activeTab === 'product' && <ProductPanel />}
        {activeTab === 'license' && <LicensePanel />}
        {activeTab === 'contact' && <ContactPanel />}
      </div>
    </div>
  );
};

export default SettingsPage;
