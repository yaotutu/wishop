import React, { useEffect, useRef, useState } from 'react';
import { Card, Checkbox, InputNumber, Button, Space, Alert, Tag, Divider } from 'antd';
import { PlayCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, WarningOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { useTaskConfig, useLogs, useQuota, TaskConfig, TaskCycleResult, LogEntry } from '../hooks/useIpc';

const Listing: React.FC = () => {
  const { taskConfig, fetchTaskConfig, saveTaskConfig, runTask } = useTaskConfig();
  const { logs, fetchLogs, clearLogs } = useLogs();
  const { quota, fetchQuota } = useQuota();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<TaskCycleResult | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTaskConfig();
    fetchLogs();
    fetchQuota();
    return () => {
      unsubscribeRef.current?.();
    };
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleRun = async () => {
    setRunning(true);
    setResult(null);
    unsubscribeRef.current = window.electronAPI.task.onLog((log: LogEntry) => {
      fetchLogs();
    });
    try {
      const res = await runTask(taskConfig);
      setResult(res);
      fetchQuota();
    } finally {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      setRunning(false);
      fetchLogs();
    }
  };

  const updateConfig = (patch: Partial<TaskConfig>) => {
    saveTaskConfig({ ...taskConfig, ...patch });
  };

  const quotaExhausted = quota.quota <= 0 && quota.total > 0;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 任务配置 + 执行 */}
      <Card size="small">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Space size={24}>
            <Space size={8}>
              <Checkbox
                checked={taskConfig.listUnreviewed}
                onChange={e => updateConfig({ listUnreviewed: e.target.checked })}
              >
                提交未审核
              </Checkbox>
              <InputNumber
                size="small" min={1} max={100} value={taskConfig.listUnreviewedQuantity}
                onChange={v => updateConfig({ listUnreviewedQuantity: v || 2 })}
                disabled={!taskConfig.listUnreviewed}
                style={{ width: 60 }}
              />
              <span style={{ color: '#666' }}>条</span>
            </Space>
            <Checkbox
              checked={taskConfig.deleteFailed}
              onChange={e => updateConfig({ deleteFailed: e.target.checked })}
            >
              删除审核失败
            </Checkbox>
          </Space>
          <Space>
            {quota.total > 0 && (
              <Tag color={quotaExhausted ? 'red' : 'green'}>
                配额 {quota.quota}/{quota.total}
              </Tag>
            )}
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleRun}
              loading={running}
              disabled={(!taskConfig.listUnreviewed && !taskConfig.deleteFailed) || quotaExhausted}
            >
              开始执行
            </Button>
          </Space>
        </div>
        {quotaExhausted && (
          <div style={{ marginTop: 8, color: '#ff4d4f', fontSize: 12 }}>
            今日提审配额已用完，请明天再试
          </div>
        )}
        {running && (
          <div style={{ marginTop: 8, color: '#999', fontSize: 12 }}>执行中，请勿重复操作...</div>
        )}
      </Card>

      {/* 执行结果 */}
      {result && (
        <Alert
          type={result.stopped ? 'warning' : 'success'}
          showIcon={false}
          style={{ padding: '8px 16px' }}
          message={
            <Space size={16} wrap>
              <span>扫描 {result.scanned}</span>
              {result.listed > 0 && <Tag color="success">提交成功 {result.listed}</Tag>}
              {result.deleted > 0 && <Tag color="blue">已删除 {result.deleted}</Tag>}
              {result.skipped > 0 && <Tag>跳过 {result.skipped}</Tag>}
              {result.errors > 0 && <Tag color="error">失败 {result.errors}</Tag>}
              {result.stopped && <Tag color="warning">已停止: {result.reason}</Tag>}
            </Space>
          }
        />
      )}

      {/* 防封号提醒 */}
      <Alert
        type="warning"
        message="频繁提交审核会被封禁，请勿短时间内重复执行。每次提交间已自动间隔 3 秒。"
        showIcon
        icon={<WarningOutlined />}
        style={{ padding: '6px 12px', fontSize: 12 }}
      />

      {/* 执行记录 */}
      <Card
        size="small"
        title="执行记录"
        style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
        styles={{ body: { flex: 1, overflow: 'auto', padding: '8px 12px', minHeight: 0 } }}
        extra={
          <Space size={4}>
            <Button size="small" type="text" icon={<ReloadOutlined />} onClick={() => { fetchLogs(); fetchQuota(); }} />
            <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={clearLogs} />
          </Space>
        }
      >
        {logs.length === 0 ? (
          <div style={{ color: '#999', textAlign: 'center', padding: 32 }}>暂无记录</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {logs.map((log, index) => {
              const prevLog = logs[index - 1];
              const showDivider = index > 0 && log.runId !== prevLog.runId;
              return (
                <React.Fragment key={log.id}>
                  {showDivider && <Divider style={{ margin: '8px 0' }} />}
                  <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                {log.status === 'success'
                  ? <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 12 }} />
                  : <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 12 }} />}
                <Tag color={log.action === 'delete' ? 'orange' : log.action === 'check' ? 'green' : 'blue'} style={{ margin: 0, fontSize: 11 }}>
                  {log.action === 'delete' ? '删除' : log.action === 'check' ? '检查' : '上架'}
                </Tag>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {log.productTitle || log.productId || log.errorMsg || ''}
                </span>
                {log.errorMsg && log.productId && (
                  <span style={{ color: '#ff4d4f', fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.errorMsg}
                  </span>
                )}
                <span style={{ color: '#bbb', fontSize: 11, whiteSpace: 'nowrap' }}>
                  {new Date(log.timestamp).toLocaleTimeString('zh-CN')}
                </span>
              </div>
                </React.Fragment>
              );
            })}
            <div ref={logsEndRef} />
          </div>
        )}
      </Card>
    </div>
  );
};

export default Listing;
