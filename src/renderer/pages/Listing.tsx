import React, { useEffect, useRef, useState } from 'react';
import { Card, Checkbox, InputNumber, Button, Space, Alert, Tag, Divider, Modal, Table, Switch, Input, Form } from 'antd';
import { PlayCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, WarningOutlined, DeleteOutlined, ReloadOutlined, ExclamationCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useTaskConfig, useLogs, useQuota, useScheduler } from '../hooks/useIpc';
import type { TaskConfig, TaskCycleResult, LogEntry, DraftProduct, SchedulerConfig } from '../../shared/types';

interface ListingProps {
  accountId: string;
}

const Listing: React.FC<ListingProps> = ({ accountId }) => {
  const { taskConfig, fetchTaskConfig, saveTaskConfig, runTask } = useTaskConfig(accountId);
  const { logs, fetchLogs, clearLogs } = useLogs(accountId);
  const { quota, fetchQuota } = useQuota(accountId);
  const { scheduler, fetchScheduler, saveScheduler } = useScheduler(accountId);
  const [running, setRunning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [result, setResult] = useState<TaskCycleResult | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DraftProduct[]>([]);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [schedulerOpen, setSchedulerOpen] = useState(false);
  const [schedulerForm] = Form.useForm();
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTaskConfig();
    fetchLogs();
    fetchQuota();
    fetchScheduler();
    return () => {
      unsubscribeRef.current?.();
    };
  }, [accountId]);

  useEffect(() => {
    if (scheduler) schedulerForm.setFieldsValue(scheduler);
  }, [scheduler, schedulerForm]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleRun = async () => {
    setRunning(true);
    setResult(null);
    setPendingDelete([]);
    unsubscribeRef.current = window.electronAPI.task.onLog(accountId, (log: LogEntry) => {
      fetchLogs();
    });
    try {
      const res = await runTask(taskConfig);
      setResult(res);
      fetchQuota();
      if (res.pendingDelete?.length > 0) {
        setPendingDelete(res.pendingDelete);
        setConfirmModalOpen(true);
      }
    } finally {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      setRunning(false);
      fetchLogs();
    }
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    unsubscribeRef.current = window.electronAPI.task.onLog(accountId, () => {
      fetchLogs();
    });
    try {
      await window.electronAPI.task.batchDelete(accountId, pendingDelete);
      setConfirmModalOpen(false);
      setPendingDelete([]);
    } finally {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      setDeleting(false);
      fetchLogs();
      fetchQuota();
    }
  };

  const updateConfig = (patch: Partial<TaskConfig>) => {
    saveTaskConfig({ ...taskConfig, ...patch });
  };

  const handleSchedulerSave = async () => {
    try {
      const values = await schedulerForm.validateFields();
      await saveScheduler(values);
      setSchedulerOpen(false);
    } catch {}
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
            <Space size={8}>
              <Checkbox
                checked={taskConfig.deleteFailed}
                onChange={e => updateConfig({ deleteFailed: e.target.checked })}
              >
                删除审核失败
              </Checkbox>
              {taskConfig.deleteFailed && (
                <Checkbox
                  checked={taskConfig.deleteFailedConfirm}
                  onChange={e => updateConfig({ deleteFailedConfirm: e.target.checked })}
                >
                  二次确认
                </Checkbox>
              )}
            </Space>
          </Space>
          <Space>
            <Button
              size="small"
              icon={<ClockCircleOutlined />}
              onClick={() => setSchedulerOpen(!schedulerOpen)}
              type={schedulerOpen ? 'primary' : 'default'}
              ghost={schedulerOpen}
            >
              定时任务
            </Button>
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
              disabled={(!taskConfig.listUnreviewed && !taskConfig.deleteFailed) || quotaExhausted || deleting}
              style={running ? { display: 'none' } : undefined}
            >
              开始执行
            </Button>
            <Button
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => window.electronAPI.task.stop(accountId)}
              loading={running}
              style={!running ? { display: 'none' } : undefined}
            >
              停止
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
              {result.pendingDelete?.length > 0 && <Tag color="orange">待确认删除 {result.pendingDelete.length}</Tag>}
              {result.skipped > 0 && <Tag>跳过 {result.skipped}</Tag>}
              {result.errors > 0 && <Tag color="error">失败 {result.errors}</Tag>}
              {result.stopped && <Tag color="warning">已停止: {result.reason}</Tag>}
            </Space>
          }
        />
      )}

      {/* 定时任务配置 */}
      {schedulerOpen && (
        <Card size="small" title="定时任务配置" extra={<Button size="small" onClick={() => setSchedulerOpen(false)}>收起</Button>}>
          <Form form={schedulerForm} layout="vertical" style={{ maxWidth: 400 }}>
            <Form.Item name="enabled" label="启用定时任务" valuePropName="checked">
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
            <Form.Item name="dailyLimit" label="每日上限" rules={[{ required: true, message: '请输入每日上限' }]}>
              <InputNumber min={1} max={1000} style={{ width: 200 }} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" onClick={handleSchedulerSave}>保存设置</Button>
            </Form.Item>
          </Form>
        </Card>
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

      {/* 二次确认弹窗 */}
      <Modal
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#faad14' }} />
            <span>确认删除审核失败商品</span>
          </Space>
        }
        open={confirmModalOpen}
        onCancel={() => { setConfirmModalOpen(false); setPendingDelete([]); }}
        footer={[
          <Button key="cancel" onClick={() => { setConfirmModalOpen(false); setPendingDelete([]); }}>
            取消
          </Button>,
          <Button key="delete" type="primary" danger loading={deleting} onClick={handleConfirmDelete}>
            确认删除 ({pendingDelete.length})
          </Button>,
        ]}
        width={600}
      >
        <p style={{ marginBottom: 12, color: '#666' }}>
          以下 {pendingDelete.length} 条商品审核失败，确认后将永久删除：
        </p>
        <Table
          dataSource={pendingDelete}
          rowKey="productId"
          size="small"
          pagination={false}
          scroll={{ y: 300 }}
          columns={[
            {
              title: '商品名称',
              dataIndex: 'title',
              key: 'title',
              ellipsis: true,
            },
            {
              title: '商品ID',
              dataIndex: 'productId',
              key: 'productId',
              width: 160,
            },
          ]}
        />
      </Modal>
    </div>
  );
};

export default Listing;
