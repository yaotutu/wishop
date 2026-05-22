import React, { useMemo, useState } from 'react';
import { Button, Empty, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Switch, Table, Tag, Tooltip, message } from 'antd';
import type { TableProps } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import type { Account, ScheduledJob, ScheduledJobRunStats, ScheduledJobStatus } from '../../../shared/types';
import { useScheduledJobs } from '../../hooks/useScheduledJobs';

interface ScheduledJobsPageProps {
  accounts: Account[];
}

const moduleLabels: Record<ScheduledJob['module'], string> = {
  listing: '商品提审',
  orders: '订单管理',
  violation: '违规检测',
  store: '店铺管理',
  system: '系统',
};

const jobTypeLabels: Record<ScheduledJob['jobType'], string> = {
  'listing.submitDrafts': '提交待审核商品',
  'orders.checkShipmentStatus': '检测发货状态',
  'violation.scanProducts': '扫描违规商品',
};

const statusColors: Record<ScheduledJobStatus, string> = {
  idle: 'default',
  running: 'processing',
  waiting_user: 'warning',
  completed: 'success',
  failed: 'error',
  skipped: 'default',
};

const statusLabels: Record<ScheduledJobStatus, string> = {
  idle: '空闲',
  running: '运行中',
  waiting_user: '待处理',
  completed: '完成',
  failed: '失败',
  skipped: '跳过',
};

const cronPresets = [
  { label: '每天 6:00', value: '0 6 * * *' },
  { label: '每天 9:00', value: '0 9 * * *' },
  { label: '每天 12:00', value: '0 12 * * *' },
  { label: '每天 14:00', value: '0 14 * * *' },
  { label: '每天 18:00', value: '0 18 * * *' },
  { label: '每天 21:00', value: '0 21 * * *' },
  { label: '每 2 小时', value: '0 */2 * * *' },
  { label: '每 4 小时', value: '0 */4 * * *' },
  { label: '每 10 分钟', value: '*/10 * * * *' },
  { label: '每 30 分钟', value: '*/30 * * * *' },
];

type ScheduledJobFormValues = {
  name: string;
  enabled: boolean;
  jobType: ScheduledJob['jobType'];
  scope: ScheduledJob['scope'];
  accountId?: string;
  cronExpression: string;
  staggerMinutes?: number;
  dailyLimit?: number;
  listUnreviewed?: boolean;
  listUnreviewedQuantity?: number;
  autoDeleteFailed?: boolean;
};

function moduleForJobType(jobType: ScheduledJob['jobType']): ScheduledJob['module'] {
  if (jobType.startsWith('listing.')) return 'listing';
  if (jobType.startsWith('orders.')) return 'orders';
  if (jobType.startsWith('violation.')) return 'violation';
  return 'system';
}

function defaultJobName(jobType: ScheduledJob['jobType']): string {
  return jobTypeLabels[jobType] || '调度任务';
}

function valuesFromJob(job?: ScheduledJob): ScheduledJobFormValues {
  if (!job) {
    return {
      name: '',
      enabled: true,
      jobType: 'listing.submitDrafts',
      scope: 'account',
      cronExpression: '0 9 * * *',
      staggerMinutes: 10,
      dailyLimit: 0,
      listUnreviewed: true,
      listUnreviewedQuantity: 2,
      autoDeleteFailed: true,
    };
  }
  const payload = (job.payload || {}) as Partial<{ taskConfig: { listUnreviewed: boolean; listUnreviewedQuantity: number; autoDeleteFailed: boolean } }>;
  return {
    name: job.name,
    enabled: job.enabled,
    jobType: job.jobType,
    scope: job.scope,
    accountId: job.accountId,
    cronExpression: job.cronExpression,
    staggerMinutes: job.staggerMinutes || 0,
    dailyLimit: job.dailyLimit || 0,
    listUnreviewed: payload.taskConfig?.listUnreviewed ?? true,
    listUnreviewedQuantity: payload.taskConfig?.listUnreviewedQuantity ?? 2,
    autoDeleteFailed: payload.taskConfig?.autoDeleteFailed ?? true,
  };
}

function formatTime(timestamp?: number): string {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCron(cronExpression: string): string {
  const daily = cronExpression.match(/^(\d+)\s+(\d+)\s+\*\s+\*\s+\*$/);
  if (daily) return `每天 ${daily[2].padStart(2, '0')}:${daily[1].padStart(2, '0')}`;
  const everyMinutes = cronExpression.match(/^\*\/(\d+)\s+\*\s+\*\s+\*\s+\*$/);
  if (everyMinutes) return `每 ${everyMinutes[1]} 分钟`;
  const hourly = cronExpression.match(/^(\d+)\s+\*\s+\*\s+\*\s+\*$/);
  if (hourly) return `每小时第 ${hourly[1].padStart(2, '0')} 分钟`;
  return cronExpression;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function statusPriority(status: ScheduledJobStatus): number {
  switch (status) {
    case 'running':
      return 6;
    case 'waiting_user':
      return 5;
    case 'failed':
      return 4;
    case 'completed':
      return 3;
    case 'skipped':
      return 2;
    case 'idle':
    default:
      return 1;
  }
}

function effectiveStats(job: ScheduledJob): ScheduledJobRunStats {
  const currentDate = todayKey();
  if (job.scope !== 'global') {
    return {
      ...job.stats,
      todayRunCount: job.stats.lastRunDate === currentDate ? job.stats.todayRunCount : 0,
    };
  }

  const accountStats = Object.values(job.accountStats || {});
  if (accountStats.length === 0) return job.stats;
  const latestErrorStat = accountStats
    .filter(stat => stat.lastError)
    .sort((a, b) => (b.lastFinishedAt || b.lastRunAt || 0) - (a.lastFinishedAt || a.lastRunAt || 0))[0];
  const lastStatus = accountStats
    .map(stat => stat.lastStatus || 'idle')
    .sort((a, b) => statusPriority(b) - statusPriority(a))[0];

  return {
    lastRunDate: accountStats.some(stat => stat.lastRunDate === currentDate) ? currentDate : job.stats.lastRunDate,
    todayRunCount: accountStats
      .filter(stat => stat.lastRunDate === currentDate)
      .reduce((sum, stat) => sum + stat.todayRunCount, 0),
    lastRunAt: Math.max(0, ...accountStats.map(stat => stat.lastRunAt || 0)) || undefined,
    lastFinishedAt: Math.max(0, ...accountStats.map(stat => stat.lastFinishedAt || 0)) || undefined,
    lastStatus,
    lastError: latestErrorStat?.lastError,
  };
}

const ScheduledJobsPage: React.FC<ScheduledJobsPageProps> = ({ accounts }) => {
  const { jobs, loading, fetchJobs, addJob, updateJob, removeJob } = useScheduledJobs();
  const [form] = Form.useForm<ScheduledJobFormValues>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<ScheduledJob | null>(null);
  const [saving, setSaving] = useState(false);
  const accountNameById = useMemo(() => new Map(accounts.map(account => [account.id, account.name])), [accounts]);
  const rows = useMemo(() => [...jobs].sort((a, b) => b.updatedAt - a.updatedAt), [jobs]);
  const enabledCount = rows.filter(job => job.enabled).length;
  const globalCount = rows.filter(job => job.scope === 'global').length;
  const runningCount = rows.filter(job => effectiveStats(job).lastStatus === 'running').length;

  const openCreateModal = () => {
    setEditingJob(null);
    form.setFieldsValue(valuesFromJob());
    setModalOpen(true);
  };

  const openEditModal = (job: ScheduledJob) => {
    setEditingJob(job);
    form.setFieldsValue(valuesFromJob(job));
    setModalOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    if (values.scope === 'account' && !values.accountId) {
      form.setFields([{ name: 'accountId', errors: ['请选择账号'] }]);
      return;
    }

    const payload = values.jobType === 'listing.submitDrafts'
      ? {
          taskConfig: {
            listUnreviewed: !!values.listUnreviewed,
            listUnreviewedQuantity: values.listUnreviewedQuantity || 1,
            autoDeleteFailed: !!values.autoDeleteFailed,
          },
        }
      : {};
    const input = {
      name: values.name?.trim() || defaultJobName(values.jobType),
      enabled: values.enabled,
      module: moduleForJobType(values.jobType),
      jobType: values.jobType,
      scope: values.scope,
      accountId: values.scope === 'account' ? values.accountId : undefined,
      excludedAccountIds: [],
      cronExpression: values.cronExpression,
      staggerMinutes: values.scope === 'global' ? values.staggerMinutes || 0 : 0,
      dailyLimit: values.dailyLimit || 0,
      payload,
    };

    setSaving(true);
    try {
      if (editingJob) {
        await updateJob(editingJob.id, input);
        message.success('调度任务已更新');
      } else {
        await addJob(input);
        message.success('调度任务已创建');
      }
      setModalOpen(false);
    } catch (err: any) {
      message.error(`保存调度任务失败: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (job: ScheduledJob, enabled: boolean) => {
    try {
      await updateJob(job.id, { enabled });
      message.success(enabled ? '任务已启用' : '任务已停用');
    } catch (err: any) {
      message.error(`更新任务失败: ${err.message}`);
    }
  };

  const handleRemove = async (job: ScheduledJob) => {
    try {
      await removeJob(job.id);
      message.success('调度任务已删除');
    } catch (err: any) {
      message.error(`删除任务失败: ${err.message}`);
    }
  };

  const columns: TableProps<ScheduledJob>['columns'] = [
    {
      title: '任务',
      dataIndex: 'name',
      key: 'name',
      width: 240,
      render: (_, job) => (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.name}</div>
          <div style={{ marginTop: 4 }}>
            <Space size={4} wrap>
              <Tag color="blue">{moduleLabels[job.module]}</Tag>
              <Tag>{jobTypeLabels[job.jobType]}</Tag>
            </Space>
          </div>
        </div>
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 130,
      render: (_, job) => {
        const status = effectiveStats(job).lastStatus || 'idle';
        return (
          <Space size={4} orientation="vertical">
            <Tag color={job.enabled ? 'green' : 'default'}>{job.enabled ? '已启用' : '已停用'}</Tag>
            <Tag color={statusColors[status]}>{statusLabels[status]}</Tag>
          </Space>
        );
      },
    },
    {
      title: '作用域',
      key: 'scope',
      width: 180,
      render: (_, job) => {
        if (job.scope === 'global') {
          const excluded = job.excludedAccountIds?.length || 0;
          const activeAccounts = Math.max(accounts.length - excluded, 0);
          return (
            <Space size={4} orientation="vertical">
              <Tag color="purple">全账号</Tag>
              <span style={{ color: '#666', fontSize: 12 }}>{activeAccounts}/{accounts.length} 个账号参与</span>
            </Space>
          );
        }
        return (
          <Space size={4} orientation="vertical">
            <Tag>单账号</Tag>
            <Tooltip title={job.accountId}>
              <span style={{ color: '#666', fontSize: 12 }}>{accountNameById.get(job.accountId || '') || job.accountId || '-'}</span>
            </Tooltip>
          </Space>
        );
      },
    },
    {
      title: '计划',
      key: 'schedule',
      width: 170,
      render: (_, job) => (
        <Space size={4} orientation="vertical">
          <span>{formatCron(job.cronExpression)}</span>
          {job.scope === 'global' && <span style={{ color: '#999', fontSize: 12 }}>错峰 {job.staggerMinutes || 0} 分钟/账号</span>}
        </Space>
      ),
    },
    {
      title: '今日',
      key: 'today',
      width: 120,
      render: (_, job) => (
        <span>
          {effectiveStats(job).todayRunCount}
          {(job.dailyLimit || 0) > 0 ? `/${job.dailyLimit}` : ''}
        </span>
      ),
    },
    {
      title: '最近运行',
      key: 'lastRun',
      width: 180,
      render: (_, job) => {
        const stats = effectiveStats(job);
        return (
          <Space size={4} orientation="vertical">
            <span>{formatTime(stats.lastRunAt)}</span>
            {stats.lastError && (
              <Tooltip title={stats.lastError}>
                <span style={{ maxWidth: 150, color: '#cf1322', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {stats.lastError}
                </span>
              </Tooltip>
            )}
          </Space>
        );
      },
    },
    {
      title: '更新',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 140,
      render: (updatedAt: number) => formatTime(updatedAt),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right',
      render: (_, job) => (
        <Space size={4}>
          <Switch
            size="small"
            checked={job.enabled}
            onChange={(checked) => void handleToggle(job, checked)}
          />
          <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEditModal(job)} />
          <Popconfirm title="删除调度任务？" okText="删除" cancelText="取消" onConfirm={() => handleRemove(job)}>
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid #f0f0f0' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>调度任务</div>
          <div style={{ color: '#666', fontSize: 13, marginTop: 4 }}>
            共 {rows.length} 个任务，{enabledCount} 个启用，{globalCount} 个全账号任务，{runningCount} 个运行中
          </div>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => fetchJobs()} loading={loading}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            新建任务
          </Button>
        </Space>
      </div>

      <div style={{ flex: 1, minHeight: 0, paddingTop: 12 }}>
        <Table<ScheduledJob>
          rowKey="id"
          size="small"
          loading={loading}
          columns={columns}
          dataSource={rows}
          pagination={{ pageSize: 20, showSizeChanger: false }}
          scroll={{ x: 1320, y: 'calc(100vh - 190px)' }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无调度任务" /> }}
        />
      </div>

      <Modal
        title={editingJob ? '编辑调度任务' : '新建调度任务'}
        open={modalOpen}
        okText="保存"
        cancelText="取消"
        confirmLoading={saving}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        destroyOnHidden
      >
        <Form<ScheduledJobFormValues>
          form={form}
          layout="vertical"
          initialValues={valuesFromJob()}
          onValuesChange={(changed) => {
            if ('jobType' in changed) {
              const jobType = changed.jobType as ScheduledJob['jobType'];
              const currentName = form.getFieldValue('name');
              if (!currentName || Object.values(jobTypeLabels).includes(currentName)) {
                form.setFieldValue('name', defaultJobName(jobType));
              }
            }
          }}
        >
          <Form.Item name="name" label="任务名称">
            <Input placeholder="默认使用任务类型名称" />
          </Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="jobType" label="任务类型" rules={[{ required: true, message: '请选择任务类型' }]}>
            <Select
              options={Object.entries(jobTypeLabels).map(([value, label]) => ({ value, label }))}
            />
          </Form.Item>
          <Form.Item name="scope" label="作用域" rules={[{ required: true, message: '请选择作用域' }]}>
            <Select
              options={[
                { value: 'account', label: '单账号' },
                { value: 'global', label: '全账号' },
              ]}
            />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, next) => prev.scope !== next.scope}>
            {({ getFieldValue }) => getFieldValue('scope') === 'account' && (
              <Form.Item name="accountId" label="账号" rules={[{ required: true, message: '请选择账号' }]}>
                <Select
                  placeholder="选择账号"
                  options={accounts.map(account => ({ value: account.id, label: account.name }))}
                />
              </Form.Item>
            )}
          </Form.Item>
          <Form.Item name="cronExpression" label="执行计划" rules={[{ required: true, message: '请选择执行计划' }]}>
            <Select options={cronPresets} />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, next) => prev.scope !== next.scope}>
            {({ getFieldValue }) => getFieldValue('scope') === 'global' && (
              <Form.Item name="staggerMinutes" label="全账号错峰间隔（分钟）">
                <InputNumber min={0} max={240} style={{ width: '100%' }} />
              </Form.Item>
            )}
          </Form.Item>
          <Form.Item name="dailyLimit" label="每日上限">
            <InputNumber min={0} max={9999} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, next) => prev.jobType !== next.jobType}>
            {({ getFieldValue }) => getFieldValue('jobType') === 'listing.submitDrafts' && (
              <>
                <Form.Item name="listUnreviewed" label="提交未审核商品" valuePropName="checked">
                  <Switch />
                </Form.Item>
                <Form.Item name="listUnreviewedQuantity" label="每轮提交数量">
                  <InputNumber min={1} max={50} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="autoDeleteFailed" label="自动删除提交失败商品" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </>
            )}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ScheduledJobsPage;
