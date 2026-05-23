import React, { useEffect, useState } from 'react';
import { Alert, Card, Menu, Button, Progress, Space, Descriptions, Typography, Image, Input, InputNumber, Switch, Tag, message } from 'antd';
import {
  CheckCircleOutlined,
  CloudDownloadOutlined,
  InfoCircleOutlined,
  AppstoreOutlined,
  CustomerServiceOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  CloudServerOutlined,
} from '@ant-design/icons';
import wechatQrcode from '../../assets/wechat-qrcode.png';
import douyinQrcode from '../../assets/douyin-qrcode.png';
import type { AppSettings } from '../../../shared/settings';
import type { SyncModuleKey, SyncModuleSetting } from '../../../shared/sync';
import { useAutomationSettings, useCloudSyncSettings, useLicenseSettings } from '../../domains/settings/hooks';

const { Title, Paragraph, Text } = Typography;

type SettingsTab = 'about' | 'product' | 'license' | 'automation' | 'sync' | 'contact';
type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'not-available' | 'error';

interface SettingsPageProps {
  defaultTab?: SettingsTab;
}

const MENU_ITEMS = [
  { key: 'about', label: '关于/更新', icon: <InfoCircleOutlined /> },
  { key: 'product', label: '产品介绍', icon: <AppstoreOutlined /> },
  { key: 'license', label: '授权状态', icon: <SafetyCertificateOutlined /> },
  { key: 'automation', label: '自动化设置', icon: <SettingOutlined /> },
  { key: 'sync', label: '云同步/云任务', icon: <CloudServerOutlined /> },
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
          <Button type="primary" onClick={handleCheck}>
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
  const { license, loading, activateLicense, clearLicense } = useLicenseSettings();
  const [licenseKey, setLicenseKey] = useState('');

  useEffect(() => {
    setLicenseKey(license?.licenseKey || '');
  }, [license?.licenseKey]);

  const activate = async () => {
    try {
      await activateLicense(licenseKey);
      message.success('授权信息已保存');
    } catch (error: any) {
      message.error(error?.message || '保存授权失败');
    }
  };

  const clear = async () => {
    try {
      await clearLicense();
      setLicenseKey('');
      message.success('授权信息已清除');
    } catch (error: any) {
      message.error(error?.message || '清除授权失败');
    }
  };

  return (
    <Card title="授权状态">
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        title="授权拦截暂未启用"
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

const AutomationSettingsPanel: React.FC = () => {
  const { settings, loading, updateShipmentCheck } = useAutomationSettings();

  const patchShipmentCheck = async (patch: Partial<AppSettings['shipmentCheck']>) => {
    try {
      await updateShipmentCheck(patch);
      message.success('自动化设置已保存');
    } catch (error: any) {
      message.error(error?.message || '保存自动化设置失败');
    }
  };

  const itemStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '220px 220px', gap: 12, alignItems: 'center' };
  const shipment = settings.shipmentCheck;

  return (
    <Card title="自动化设置">
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        title="淘宝自动化保持显式触发"
        description="这里配置采购发货状态检测的节奏、冷却和单轮数量。淘宝窗口仍保持干净窗口，不做 UA、请求头或指纹伪装。"
      />
      <Space orientation="vertical" size={14} style={{ width: '100%', maxWidth: 720 }}>
        <div style={itemStyle}>
          <span>采购发货状态检测</span>
          <Switch
            checked={shipment.enabled}
            loading={loading}
            checkedChildren="启用"
            unCheckedChildren="停用"
            onChange={(enabled) => void patchShipmentCheck({ enabled })}
          />
        </div>
        <div style={itemStyle}>
          <span>检测窗口（分钟）</span>
          <InputNumber min={5} max={120} value={shipment.windowMinutes} onChange={(value) => void patchShipmentCheck({ windowMinutes: value || 10 })} />
        </div>
        <div style={itemStyle}>
          <span>每账号每窗口最多检测</span>
          <InputNumber min={1} max={10} value={shipment.maxChecksPerAccountPerWindow} onChange={(value) => void patchShipmentCheck({ maxChecksPerAccountPerWindow: value || 3 })} />
        </div>
        <div style={itemStyle}>
          <span>最小派发延迟（秒）</span>
          <InputNumber min={10} max={3600} value={shipment.minDispatchDelaySeconds} onChange={(value) => void patchShipmentCheck({ minDispatchDelaySeconds: value || 30 })} />
        </div>
        <div style={itemStyle}>
          <span>最大派发延迟（秒）</span>
          <InputNumber min={30} max={7200} value={shipment.maxDispatchDelaySeconds} onChange={(value) => void patchShipmentCheck({ maxDispatchDelaySeconds: value || 540 })} />
        </div>
        <div style={itemStyle}>
          <span>任务最小间隔（秒）</span>
          <InputNumber min={30} max={1800} value={shipment.minTaskSpacingSeconds} onChange={(value) => void patchShipmentCheck({ minTaskSpacingSeconds: value || 60 })} />
        </div>
        <div style={itemStyle}>
          <span>订单回看天数</span>
          <InputNumber min={1} max={7} value={shipment.orderLookbackDays} onChange={(value) => void patchShipmentCheck({ orderLookbackDays: value || 7 })} />
        </div>
        <div style={itemStyle}>
          <span>正常冷却（分钟）</span>
          <InputNumber min={10} max={1440} value={shipment.normalCooldownMinutes} onChange={(value) => void patchShipmentCheck({ normalCooldownMinutes: value || 60 })} />
        </div>
        <div style={itemStyle}>
          <span>验证冷却（分钟）</span>
          <InputNumber min={30} max={10080} value={shipment.verificationCooldownMinutes} onChange={(value) => void patchShipmentCheck({ verificationCooldownMinutes: value || 360 })} />
        </div>
        <div style={itemStyle}>
          <span>失败冷却（分钟）</span>
          <InputNumber min={10} max={1440} value={shipment.failureCooldownMinutes} onChange={(value) => void patchShipmentCheck({ failureCooldownMinutes: value || 60 })} />
        </div>
      </Space>
    </Card>
  );
};

const SYNC_MODULE_LABELS: Record<SyncModuleKey, { title: string; description: string }> = {
  accounts: { title: '店铺配置', description: '同步店铺元数据；凭据由凭据授权单独控制。' },
  orders: { title: '订单管理', description: '同步货源、订单关联和内部备注；订单详情和真实地址不进入云同步。' },
  listing: { title: '商品提审', description: '同步提审配置、规则和调度配置；商品详情和额度可重新获取。' },
  violations: { title: '违规词检测', description: '同步违规词和处理规则；扫描结果默认只保留本地。' },
  scheduling: { title: '调度任务', description: '同步用户创建的调度配置；运行中状态不同步。' },
  settings: { title: '应用设置', description: '同步用户偏好和自动化配置。' },
  taobao: { title: '淘宝自动化', description: '同步用户授权和任务配置；页面快照、物流缓存不同步。' },
};

function moduleModeLabel(setting?: SyncModuleSetting): string {
  if (!setting?.syncEnabled && !setting?.cloudExecutionEnabled) return '仅本机';
  if (setting.cloudExecutionEnabled) return '云同步 + 云端执行';
  return '云同步';
}

const CloudSyncPanel: React.FC = () => {
  const {
    syncSettings,
    cloudCapabilities,
    accounts,
    credentials,
    syncLoading,
    updateModuleSetting,
    saveCloudCredential,
    revokeCloudCredential,
    savingCredential,
    revokingCredential,
  } = useCloudSyncSettings();

  const updateModule = async (module: SyncModuleKey, patch: Partial<SyncModuleSetting>) => {
    try {
      await updateModuleSetting(module, patch);
      message.success('云同步设置已保存');
    } catch (error: any) {
      message.error(error?.message || '保存云同步设置失败');
    }
  };

  const saveCredential = async () => {
    try {
      await saveCloudCredential();
      message.success('已记录云端执行授权');
    } catch (error: any) {
      message.error(error?.message || '凭据授权失败');
    }
  };

  const revokeCredential = async (credentialId: string) => {
    try {
      await revokeCloudCredential(credentialId);
      message.success('已撤销云端执行授权');
    } catch (error: any) {
      message.error(error?.message || '撤销授权失败');
    }
  };

  const settings = syncSettings;
  const modules = Object.keys(SYNC_MODULE_LABELS) as SyncModuleKey[];

  return (
    <Card title="云同步与云端执行">
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Alert
          type="warning"
          showIcon
          title="云端接口尚未连接"
          description={cloudCapabilities?.message || '当前版本已经预留同步和云端任务架构，但真实云服务 transport 仍是 no-op。'}
        />
        <div style={{ display: 'grid', gap: 12 }}>
          {modules.map((module) => {
            const label = SYNC_MODULE_LABELS[module];
            const setting = settings?.modules[module];
            return (
              <div
                key={module}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(180px, 1fr) 140px 140px 150px',
                  gap: 12,
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: '1px solid #f0f0f0',
                }}
              >
                <div>
                  <Text strong>{label.title}</Text>
                  <div style={{ color: '#666', fontSize: 13, marginTop: 4 }}>{label.description}</div>
                </div>
                <Switch
                  checked={!!setting?.syncEnabled}
                  loading={syncLoading}
                  checkedChildren="同步"
                  unCheckedChildren="本机"
                  onChange={(syncEnabled) => void updateModule(module, { syncEnabled })}
                />
                <Switch
                  checked={!!setting?.cloudExecutionEnabled}
                  loading={syncLoading}
                  checkedChildren="云执行"
                  unCheckedChildren="本机执行"
                  onChange={(cloudExecutionEnabled) => void updateModule(module, { cloudExecutionEnabled })}
                />
                <Tag color={setting?.cloudExecutionEnabled ? 'blue' : setting?.syncEnabled ? 'green' : 'default'}>
                  {moduleModeLabel(setting)}
                </Tag>
              </div>
            );
          })}
        </div>
        <div>
          <Title level={5}>云端执行凭据授权</Title>
          <Paragraph style={{ color: '#555', maxWidth: 760 }}>
            云端任务需要用户授权上传账号凭据。这里先记录授权元数据；真实上传会在云服务接入后由凭据服务统一处理，业务模块不能绕过凭据服务直接上传。
          </Paragraph>
          <Space style={{ marginBottom: 12 }}>
            <Button
              type="primary"
              loading={savingCredential}
              disabled={!accounts.length}
              onClick={() => void saveCredential()}
            >
              授权首个店铺 API 凭据用于云端任务
            </Button>
            <Tag color={cloudCapabilities?.connected ? 'green' : 'default'}>
              {cloudCapabilities?.connected ? '云服务已连接' : '云服务未连接'}
            </Tag>
          </Space>
          <div style={{ display: 'grid', gap: 8 }}>
            {credentials.length === 0 && <Text type="secondary">暂无凭据授权记录</Text>}
            {credentials.map((credential) => (
              <div
                key={credential.credentialId}
                style={{ display: 'grid', gridTemplateColumns: '1fr 110px 90px', gap: 12, alignItems: 'center' }}
              >
                <Text>
                  {credential.platform} / {credential.accountId} / {credential.scope.join(', ')}
                </Text>
                <Tag color={credential.authorizedForCloud ? 'blue' : 'default'}>
                  {credential.authorizedForCloud ? '已授权' : '未授权'}
                </Tag>
                <Button
                  size="small"
                  danger={credential.authorizedForCloud}
                  loading={revokingCredential}
                  onClick={() => void revokeCredential(credential.credentialId)}
                >
                  撤销
                </Button>
              </div>
            ))}
          </div>
        </div>
      </Space>
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
        {activeTab === 'automation' && <AutomationSettingsPanel />}
        {activeTab === 'sync' && <CloudSyncPanel />}
        {activeTab === 'contact' && <ContactPanel />}
      </div>
    </div>
  );
};

export default SettingsPage;
