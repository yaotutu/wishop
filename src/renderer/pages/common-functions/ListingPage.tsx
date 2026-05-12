import React, { useEffect, useRef, useState } from 'react';
import { Card, Checkbox, InputNumber, Button, Space, Alert, Tag, Divider, Modal, Table, Switch, Input, message, Empty, Popconfirm, TimePicker } from 'antd';
// fix: Table import for delete confirmation dialog
import { PlayCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, WarningOutlined, DeleteOutlined, ReloadOutlined, ExclamationCircleOutlined, ClockCircleOutlined, PlusOutlined, EditOutlined } from '@ant-design/icons';
import { useTaskConfig, useLogs, useQuota, useSchedulers } from '../../hooks/useIpc';
import type { TaskConfig, TaskCycleResult, LogEntry, DraftProduct, ScheduledTask } from '../../../shared/types';

interface ListingProps {
  accountId: string;
}

const cronPresets = [
  { label: '每天 6:00', value: '0 6 * * *' },
  { label: '每天 9:00', value: '0 9 * * *' },
  { label: '每天 12:00', value: '0 12 * * *' },
  { label: '每天 14:00', value: '0 14 * * *' },
  { label: '每天 18:00', value: '0 18 * * *' },
  { label: '每天 21:00', value: '0 21 * * *' },
  { label: '每 2 小时', value: '0 */2 * * *' },
  { label: '每 4 小时', value: '0 */4 * * *' },
];

function cronToLabel(cron: string): string {
  const preset = cronPresets.find(p => p.value === cron);
  if (preset) return preset.label;
  const m = cron.match(/^(\d+)\s+(\d+)\s+\*\s+\*\s+\*$/);
  if (m) return `每天 ${m[2]}:${m[1].padStart(2, '0')}`;
  return cron;
}

const defaultTaskConfig: TaskConfig = {
  deleteFailed: false,
  deleteFailedConfirm: false,
  listUnreviewed: true,
  listUnreviewedQuantity: 2,
};

const Listing: React.FC<ListingProps> = ({ accountId }) => {
  const { taskConfig, fetchTaskConfig, saveTaskConfig, runTask } = useTaskConfig(accountId);
  const { logs, fetchLogs, clearLogs } = useLogs(accountId);
  const { quota, fetchQuota } = useQuota(accountId);
  const { tasks, fetchTasks, addTask, updateTask, removeTask } = useSchedulers(accountId);
  const [running, setRunning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [result, setResult] = useState<TaskCycleResult | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DraftProduct[]>([]);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [schedulerOpen, setSchedulerOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    cronExpression: '0 9 * * *',
    dailyLimit: 0,
    enabled: true,
    taskConfig: { ...defaultTaskConfig },
  });
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    fetchTaskConfig();
    fetchLogs();
    fetchQuota();
    fetchTasks();
    return () => {
      unsubscribeRef.current?.();
    };
  }, [accountId]);

  const handleRun = async () => {
    setRunning(true);
    setResult(null);
    setPendingDelete([]);
    unsubscribeRef.current = window.electronAPI.task.onLog(accountId, () => {
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

  const openAddModal = () => {
    setEditingTask(null);
    setFormData({ name: '', cronExpression: '0 9 * * *', dailyLimit: 0, enabled: true, taskConfig: { ...defaultTaskConfig } });
    setEditModalOpen(true);
  };

  const openEditModal = (task: ScheduledTask) => {
    setEditingTask(task);
    setFormData({
      name: task.name,
      cronExpression: task.cronExpression,
      dailyLimit: task.dailyLimit,
      enabled: task.enabled,
      taskConfig: { ...task.taskConfig },
    });
    setEditModalOpen(true);
  };

  const handleSaveTask = async () => {
    if (!formData.name.trim()) {
      message.error('请输入任务名称');
      return;
    }
    if (editingTask) {
      await updateTask(editingTask.id, {
        name: formData.name,
        cronExpression: formData.cronExpression,
        dailyLimit: formData.dailyLimit,
        enabled: formData.enabled,
        taskConfig: formData.taskConfig,
      });
      message.success('任务已更新');
    } else {
      await addTask(formData);
      message.success('任务已创建');
    }
    setEditModalOpen(false);
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
              定时任务{tasks.length > 0 ? ` (${tasks.length})` : ''}
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

      {/* 定时任务弹窗 */}
      <Modal
        title="定时任务"
        open={schedulerOpen}
        onCancel={() => setSchedulerOpen(false)}
        footer={null}
        width={720}
        centered
      >
        <div style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>添加任务</Button>
        </div>
        {tasks.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无定时任务" style={{ padding: '32px 0' }}>
            <Button type="primary" onClick={openAddModal}>创建第一个任务</Button>
          </Empty>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {tasks.map(task => (
              <div key={task.id} style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '14px 16px', background: '#fafafa', borderRadius: 8,
              }}>
                <Switch
                  checked={task.enabled}
                  onChange={checked => updateTask(task.id, { enabled: checked })}
                />
                <span style={{ fontWeight: 500, fontSize: 14, minWidth: 100 }}>{task.name}</span>
                <Tag color={task.enabled ? 'blue' : 'default'}>{cronToLabel(task.cronExpression)}</Tag>
                <span style={{ color: '#999', fontSize: 13 }}>
                  今日 {task.todayListedCount}{task.dailyLimit > 0 ? `/${task.dailyLimit}` : ''}
                </span>
                <span style={{ flex: 1 }} />
                <Button type="text" icon={<EditOutlined />} onClick={() => openEditModal(task)}>编辑</Button>
                <Popconfirm title="确认删除此任务？" onConfirm={() => removeTask(task.id)} okText="删除" cancelText="取消">
                  <Button type="text" danger icon={<DeleteOutlined />}>删除</Button>
                </Popconfirm>
              </div>
            ))}
          </div>
        )}
      </Modal>

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ color: '#bbb', fontSize: 11, textAlign: 'center' }}>最新</div>
            {[...logs].reverse().map((log, index, arr) => {
              const nextLog = arr[index - 1];
              const showDivider = index > 0 && log.runId !== nextLog?.runId;
              const isSuccess = log.status === 'success';
              const actionLabel = log.action === 'delete' ? '删除' : log.action === 'check' ? '检查' : '上架';
              const actionColor = log.action === 'delete' ? '#fa8c16' : log.action === 'check' ? '#52c41a' : '#1677ff';
              return (
                <React.Fragment key={log.id}>
                  {showDivider && <Divider style={{ margin: '4px 0' }} />}
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    background: isSuccess ? '#f6ffed' : '#fff2f0',
                    borderLeft: `3px solid ${isSuccess ? '#b7eb8f' : '#ffccc7'}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: actionColor }}>{actionLabel}</span>
                      <span style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.productTitle || log.productId || ''}
                      </span>
                      <span style={{ color: '#bbb', fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {new Date(log.timestamp).toLocaleTimeString('zh-CN')}
                      </span>
                    </div>
                    {log.errorMsg && (
                      <div style={{ color: '#cf1322', fontSize: 12, marginTop: 4, lineHeight: 1.6, wordBreak: 'break-all' }}>
                        {log.errorCode != null && <Tag color="error" style={{ fontSize: 11, marginRight: 4, lineHeight: '18px', padding: '0 4px' }}>errcode:{log.errorCode}</Tag>}
                        {log.errorMsg}
                      </div>
                    )}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        )}
      </Card>

      {/* 新建/编辑定时任务弹窗 */}
      <Modal
        title={editingTask ? '编辑定时任务' : '新建定时任务'}
        open={editModalOpen}
        onOk={handleSaveTask}
        onCancel={() => setEditModalOpen(false)}
        okText="保存"
        cancelText="取消"
        width={520}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' }}>
          <div>
            <div style={{ marginBottom: 4, fontSize: 13, fontWeight: 500 }}>任务名称</div>
            <Input
              placeholder="如：早间上架、午间清理"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div>
            <div style={{ marginBottom: 4, fontSize: 13, fontWeight: 500 }}>执行时间</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {cronPresets.map(preset => (
                <Tag
                  key={preset.value}
                  color={formData.cronExpression === preset.value ? 'blue' : 'default'}
                  style={{ cursor: 'pointer', padding: '2px 8px' }}
                  onClick={() => setFormData(prev => ({ ...prev, cronExpression: preset.value }))}
                >
                  {preset.label}
                </Tag>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#666' }}>自定义时间：</span>
              <TimePicker
                format="HH:mm"
                placeholder="选择时间"
                onChange={(_, timeStr) => {
                  if (timeStr) {
                    const [h, m] = timeStr.split(':');
                    setFormData(prev => ({ ...prev, cronExpression: `${m} ${h} * * *` }));
                  }
                }}
              />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Checkbox
                checked={formData.dailyLimit > 0}
                onChange={e => setFormData(prev => ({ ...prev, dailyLimit: e.target.checked ? 100 : 0 }))}
              >
                <span style={{ fontSize: 13, fontWeight: 500 }}>限制每日上限</span>
              </Checkbox>
            </div>
            {formData.dailyLimit > 0 && (
              <InputNumber min={1} max={1000} value={formData.dailyLimit} onChange={v => setFormData(prev => ({ ...prev, dailyLimit: v || 100 }))} style={{ width: 200 }} />
            )}
          </div>
          <div>
            <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 500 }}>任务配置</div>
            <Space direction="vertical">
              <Checkbox
                checked={formData.taskConfig.listUnreviewed}
                onChange={e => setFormData(prev => ({
                  ...prev,
                  taskConfig: { ...prev.taskConfig, listUnreviewed: e.target.checked },
                }))}
              >
                提交未审核商品
              </Checkbox>
              {formData.taskConfig.listUnreviewed && (
                <Space style={{ marginLeft: 24 }}>
                  <span style={{ color: '#666', fontSize: 12 }}>每次</span>
                  <InputNumber size="small" min={1} max={100} value={formData.taskConfig.listUnreviewedQuantity}
                    onChange={v => setFormData(prev => ({
                      ...prev,
                      taskConfig: { ...prev.taskConfig, listUnreviewedQuantity: v || 2 },
                    }))}
                    style={{ width: 60 }}
                  />
                  <span style={{ color: '#666', fontSize: 12 }}>条</span>
                </Space>
              )}
              <Checkbox
                checked={formData.taskConfig.deleteFailed}
                onChange={e => setFormData(prev => ({
                  ...prev,
                  taskConfig: { ...prev.taskConfig, deleteFailed: e.target.checked },
                }))}
              >
                删除审核失败商品
              </Checkbox>
              {formData.taskConfig.deleteFailed && (
                <Checkbox
                  checked={formData.taskConfig.deleteFailedConfirm}
                  onChange={e => setFormData(prev => ({
                    ...prev,
                    taskConfig: { ...prev.taskConfig, deleteFailedConfirm: e.target.checked },
                  }))}
                  style={{ marginLeft: 24 }}
                >
                  删除前二次确认
                </Checkbox>
              )}
            </Space>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Switch checked={formData.enabled} onChange={checked => setFormData(prev => ({ ...prev, enabled: checked }))} />
            <span>{formData.enabled ? '创建后立即启用' : '创建后不启用'}</span>
          </div>
        </div>
      </Modal>

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
            { title: '商品名称', dataIndex: 'title', key: 'title', ellipsis: true },
            { title: '商品ID', dataIndex: 'productId', key: 'productId', width: 160 },
          ]}
        />
      </Modal>
    </div>
  );
};

export default Listing;
