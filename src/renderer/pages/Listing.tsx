import React, { useEffect, useState } from 'react';
import { Card, Checkbox, InputNumber, Button, Space, Alert, Spin, Divider, Tag } from 'antd';
import { PlayCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { useTaskConfig, useLogs, TaskConfig, TaskCycleResult } from '../hooks/useIpc';

const Listing: React.FC = () => {
  const { taskConfig, fetchTaskConfig, saveTaskConfig, runTask } = useTaskConfig();
  const { logs, fetchLogs, clearLogs } = useLogs();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<TaskCycleResult | null>(null);

  useEffect(() => {
    fetchTaskConfig();
    fetchLogs();
  }, []);

  const handleRun = async () => {
    setRunning(true);
    setResult(null);
    try {
      const res = await runTask(taskConfig);
      setResult(res);
      fetchLogs();
    } finally {
      setRunning(false);
    }
  };

  const updateConfig = (patch: Partial<TaskConfig>) => {
    const updated = { ...taskConfig, ...patch };
    saveTaskConfig(updated);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
      {/* 任务配置区 */}
      <Card size="small" title="任务配置">
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Checkbox
              checked={taskConfig.listUnreviewed}
              onChange={e => updateConfig({ listUnreviewed: e.target.checked })}
            >
              提交未审核商品
            </Checkbox>
            <span>处理</span>
            <InputNumber
              size="small" min={1} max={100} value={taskConfig.listUnreviewedQuantity}
              onChange={v => updateConfig({ listUnreviewedQuantity: v || 10 })}
              disabled={!taskConfig.listUnreviewed}
              style={{ width: 70 }}
            />
            <span>条</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Checkbox
              checked={taskConfig.deleteFailed}
              onChange={e => updateConfig({ deleteFailed: e.target.checked })}
            >
              删除审核失败商品
            </Checkbox>
            <span>处理</span>
            <InputNumber
              size="small" min={1} max={100} value={taskConfig.deleteFailedQuantity}
              onChange={v => updateConfig({ deleteFailedQuantity: v || 10 })}
              disabled={!taskConfig.deleteFailed}
              style={{ width: 70 }}
            />
            <span>条</span>
          </div>
        </Space>
        <Divider style={{ margin: '16px 0 12px' }} />
        <Space>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={handleRun}
            loading={running}
            disabled={!taskConfig.listUnreviewed && !taskConfig.deleteFailed}
          >
            开始执行
          </Button>
          {running && <span style={{ color: '#999' }}>执行中，请勿重复操作...</span>}
        </Space>
      </Card>

      {/* 防封号提醒 */}
      <Alert
        type="warning"
        message="频繁提交审核会被封禁，请勿短时间内重复执行。每次提交间已自动间隔 3 秒。"
        showIcon
        icon={<WarningOutlined />}
        style={{ padding: '8px 12px' }}
      />

      {/* 执行结果汇总 */}
      {result && (
        <Card size="small" title="执行结果">
          <Space wrap size={16}>
            <span>扫描: <b>{result.scanned}</b></span>
          </Space>
          <Divider style={{ margin: '12px 0' }} />
          <Space wrap size={16}>
            {result.listed > 0 && (
              <Tag icon={<CheckCircleOutlined />} color="success">提交成功 {result.listed}</Tag>
            )}
            {result.deleted > 0 && (
              <Tag color="blue">已删除 {result.deleted}</Tag>
            )}
            {result.skipped > 0 && (
              <Tag color="default">跳过 {result.skipped}</Tag>
            )}
            {result.errors > 0 && (
              <Tag icon={<CloseCircleOutlined />} color="error">失败 {result.errors}</Tag>
            )}
            {result.stopped && (
              <Tag icon={<WarningOutlined />} color="warning">已停止: {result.reason}</Tag>
            )}
          </Space>
        </Card>
      )}

      {/* 执行记录 */}
      <Card
        size="small"
        title="执行记录"
        style={{ flex: 1, minHeight: 200 }}
        extra={
          <Space>
            <Button size="small" type="link" onClick={fetchLogs}>刷新</Button>
            <Button size="small" type="link" danger onClick={clearLogs}>清空</Button>
          </Space>
        }
      >
        {logs.length === 0 ? (
          <div style={{ color: '#999', textAlign: 'center', padding: 40 }}>暂无记录</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {logs.map((log) => (
              <div key={log.id} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                {log.status === 'success'
                  ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                <span style={{ flex: 1 }}>{log.productTitle || log.productId}</span>
                {log.errorMsg && <span style={{ color: '#ff4d4f', fontSize: 12 }}>{log.errorMsg}</span>}
                <span style={{ color: '#999', fontSize: 12, whiteSpace: 'nowrap' }}>
                  {new Date(log.timestamp).toLocaleString('zh-CN')}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default Listing;
