import React, { useEffect, useMemo, useState } from 'react';
import { Button, Empty, Space, Table, Tag, message } from 'antd';
import type { TableProps } from 'antd';
import { PlayCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import type { Account, ScheduledJobStatus, ScheduledJobView } from '../../../shared/types';

interface Props {
  accounts: Account[];
}

const statusLabels: Record<ScheduledJobStatus, string> = {
  idle: '空闲',
  running: '运行中',
  waiting_user: '待处理',
  completed: '完成',
  failed: '失败',
  skipped: '跳过',
};

const statusColors: Record<ScheduledJobStatus, string> = {
  idle: 'default',
  running: 'processing',
  waiting_user: 'warning',
  completed: 'success',
  failed: 'error',
  skipped: 'default',
};

function formatTime(timestamp?: number): string {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const ScheduledJobsPage: React.FC<Props> = ({ accounts }) => {
  const [jobs, setJobs] = useState<ScheduledJobView[]>([]);
  const [loading, setLoading] = useState(false);
  const [runningId, setRunningId] = useState('');
  const accountNameById = useMemo(() => new Map(accounts.map(account => [account.id, account.name])), [accounts]);

  const load = async () => {
    setLoading(true);
    try {
      setJobs(await window.electronAPI.scheduledJobs.list());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const runNow = async (job: ScheduledJobView) => {
    setRunningId(job.id);
    try {
      const result = await window.electronAPI.scheduledJobs.runNow(job.id);
      if (result.status === 'failed') message.error(result.error || '任务执行失败');
      else if (result.status === 'skipped') message.warning(result.error || result.message || '任务已跳过');
      else message.success(result.message || '任务执行完成');
      await load();
    } catch (error: any) {
      message.error(error?.message || String(error));
    } finally {
      setRunningId('');
    }
  };

  const columns: TableProps<ScheduledJobView>['columns'] = [
    {
      title: '任务',
      key: 'name',
      render: (_, job) => (
        <Space vertical size={2}>
          <span style={{ fontWeight: 600 }}>{job.name}</span>
          <Space size={4}>
            <Tag color="blue">{job.module}</Tag>
            <Tag>{job.jobType}</Tag>
          </Space>
        </Space>
      ),
    },
    {
      title: '作用域',
      key: 'scope',
      width: 160,
      render: (_, job) => {
        if (job.scope === 'global') return <Tag color="purple">全部账号</Tag>;
        if (job.scope === 'system') return <Tag color="geekblue">系统</Tag>;
        return <Tag>{accountNameById.get(job.accountId) || job.accountId}</Tag>;
      },
    },
    {
      title: '状态',
      key: 'status',
      width: 120,
      render: (_, job) => {
        const status = job.stats.lastStatus || 'idle';
        return <Tag color={statusColors[status]}>{statusLabels[status]}</Tag>;
      },
    },
    {
      title: '最近执行',
      key: 'lastRun',
      width: 180,
      render: (_, job) => formatTime(job.stats.lastFinishedAt || job.stats.lastRunAt),
    },
    {
      title: '结果',
      key: 'result',
      render: (_, job) => job.stats.lastError || job.stats.lastMessage || '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 110,
      render: (_, job) => (
        <Button
          size="small"
          icon={<PlayCircleOutlined />}
          loading={runningId === job.id}
          onClick={() => runNow(job)}
        >
          运行
        </Button>
      ),
    },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Tag color="green">已启用 {jobs.filter(job => job.enabled).length}</Tag>
          <Tag>总计 {jobs.length}</Tag>
        </Space>
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>刷新</Button>
      </div>
      <Table
        size="small"
        rowKey="id"
        loading={loading}
        dataSource={jobs}
        columns={columns}
        pagination={false}
        locale={{ emptyText: <Empty description="暂无调度任务" /> }}
        scroll={{ y: 'calc(100vh - 180px)' }}
      />
    </div>
  );
};

export default ScheduledJobsPage;
