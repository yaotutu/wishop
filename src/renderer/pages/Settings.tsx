import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Switch, Button, Space, InputNumber, message, Tabs } from 'antd';
import { useConfig, useScheduler } from '../hooks/useIpc';

const Settings: React.FC = () => {
  const { config, loading: configLoading, fetchConfig, saveConfig } = useConfig();
  const { scheduler, loading: schedulerLoading, fetchScheduler, saveScheduler } = useScheduler();
  const [configForm] = Form.useForm();
  const [schedulerForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
    fetchScheduler();
  }, [fetchConfig, fetchScheduler]);

  useEffect(() => {
    if (config) configForm.setFieldsValue(config);
  }, [config, configForm]);

  useEffect(() => {
    if (scheduler) schedulerForm.setFieldsValue(scheduler);
  }, [scheduler, schedulerForm]);

  const handleConfigSave = async () => {
    try {
      const values = await configForm.validateFields();
      setSaving(true);
      const result = await saveConfig(values);
      if (result.success) {
        message.success('配置已保存，Token 验证成功');
      } else {
        message.error(result.error || '保存失败');
      }
    } catch (err: any) {
      if (err.errorFields) {
        message.error('请填写完整信息');
      } else {
        message.error(err.message || '保存失败');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSchedulerSave = async () => {
    try {
      const values = await schedulerForm.validateFields();
      setSaving(true);
      await saveScheduler(values);
      message.success('设置已保存');
    } catch {
      message.error('请填写正确信息');
    } finally {
      setSaving(false);
    }
  };

  const tabItems = [
    {
      key: 'api',
      label: 'API 配置',
      children: (
        <Form form={configForm} layout="vertical" style={{ maxWidth: 400 }}>
          <Form.Item
            name="appId"
            label="AppID"
            rules={[{ required: true, message: '请输入 AppID' }]}
          >
            <Input placeholder="微信小店的 AppID" />
          </Form.Item>
          <Form.Item
            name="appSecret"
            label="AppSecret"
            rules={[{ required: true, message: '请输入 AppSecret' }]}
          >
            <Input.Password placeholder="微信小店的 AppSecret" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" onClick={handleConfigSave} loading={saving}>
              保存配置
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'scheduler',
      label: '定时任务',
      children: (
        <Form form={schedulerForm} layout="vertical" style={{ maxWidth: 400 }}>
          <Form.Item
            name="enabled"
            label="启用定时上架"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="cronExpression"
            label="执行时间 (Cron 表达式)"
            rules={[{ required: true, message: '请输入 Cron 表达式' }]}
            extra="例如: 0 9 * * * 表示每天 9:00 执行"
          >
            <Input placeholder="0 9 * * *" />
          </Form.Item>
          <Form.Item
            name="dailyLimit"
            label="每日上架上限"
            rules={[{ required: true, message: '请输入每日上限' }]}
          >
            <InputNumber min={1} max={1000} style={{ width: 200 }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" onClick={handleSchedulerSave} loading={saving}>
              保存设置
            </Button>
          </Form.Item>
        </Form>
      ),
    },
  ];

  return (
    <Card title="设置">
      <Tabs items={tabItems} />
    </Card>
  );
};

export default Settings;
