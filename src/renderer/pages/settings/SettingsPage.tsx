import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Button, message } from 'antd';
import { useConfig } from '../../hooks/useConfig';

interface SettingsProps {
  accountId: string;
}

const Settings: React.FC<SettingsProps> = ({ accountId }) => {
  const { config, fetchConfig, saveConfig } = useConfig(accountId);
  const [configForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, [accountId]);

  useEffect(() => {
    if (config) configForm.setFieldsValue(config);
  }, [config, configForm]);

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

  return (
    <Card title="API 配置">
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
    </Card>
  );
};

export default Settings;
