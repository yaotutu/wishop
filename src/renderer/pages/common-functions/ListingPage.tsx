import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Checkbox, InputNumber, Button, Space, Alert, Tag, Divider, Modal, Input, message, Popconfirm, Select, Tooltip, Switch, Form } from 'antd';
import { PlayCircleOutlined, CloseCircleOutlined, DeleteOutlined, ReloadOutlined, PlusOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { useBlacklistRules, useListingSettings, useLogs, useQuota, useSkipKeywords, useStatusRules, useTaskConfig } from '../../domains/listing/hooks';
import { scheduledJobsClient } from '../../domains/scheduled-jobs/client';
import { cronPresets } from '../../utils/cron';
import { getErrorMessage } from '../../../shared/errors';
import type { TaskConfig, TaskCycleResult, LogEntry, BlacklistRule, ListingRulesConfig, ScheduledJob } from '../../../shared/types';

interface ListingProps {
  accountId: string;
  scope?: 'account' | 'global';
}

type GlobalScheduleFormValues = {
  enabled: boolean;
  cronExpression: string;
  staggerMinutes: number;
};

const defaultTaskConfig: TaskConfig = {
  listUnreviewed: true,
  listUnreviewedQuantity: 2,
  autoDeleteFailed: true,
};

const Listing: React.FC<ListingProps> = ({ accountId, scope = 'account' }) => {
  const { saveTaskConfig, runTask, stopTask, onTaskLog } = useTaskConfig(accountId);
  const {
    settings,
    fetchSettings,
    saveGlobalTaskConfig,
    setAccountTaskConfigEnabled,
    setAccountRulesEnabled,
    saveAccountRules,
  } = useListingSettings(accountId);
  const { logs, fetchLogs, clearLogs } = useLogs(accountId);
  const { quota, fetchQuota } = useQuota(accountId);
  const { fetchRules: fetchBlacklistRules, saveRules: saveBlacklistRules, defaultCodes: blacklistDefaultCodes } = useBlacklistRules();
  const { fetchKeywords, saveKeywords } = useSkipKeywords();
  const { fetchRules: fetchStatusRules, saveRules: saveStatusRules, resetRules: resetStatusRules } = useStatusRules();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<TaskCycleResult | null>(null);
  const [localListedCount, setLocalListedCount] = useState(0);
  const [globalCronExpression, setGlobalCronExpression] = useState('0 9 * * *');
  const [globalScheduledEnabled, setGlobalScheduledEnabledState] = useState(true);
  const [globalStaggerMinutes, setGlobalStaggerMinutes] = useState(10);
  const [globalScheduledJob, setGlobalScheduledJob] = useState<ScheduledJob | null>(null);
  const [globalScheduleModalOpen, setGlobalScheduleModalOpen] = useState(false);
  const [savingGlobalScheduledJob, setSavingGlobalScheduledJob] = useState(false);
  const [globalScheduleForm] = Form.useForm<GlobalScheduleFormValues>();

  // 黑名单管理（内部 state，不再单独弹窗）
  const [newRuleCode, setNewRuleCode] = useState('');
  const [newRuleDesc, setNewRuleDesc] = useState('');

  // 跳过关键词管理（内部 state，不再单独弹窗）
  const [newKeyword, setNewKeyword] = useState('');

  const [newRuleStatus, setNewRuleStatus] = useState<number | undefined>(undefined);
  const [newRuleLabel, setNewRuleLabel] = useState('');
  const [newRuleAction, setNewRuleAction] = useState<'submit' | 'delete' | 'skip'>('skip');
  const [rulesLocked, setRulesLocked] = useState(true);

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isGlobalScope = scope === 'global';
  const activeTaskConfig = isGlobalScope
    ? settings.globalTaskConfig
    : settings.effectiveTaskConfig;
  const activeRules = isGlobalScope
    ? settings.globalRules
    : settings.effectiveRules;
  const activeBlacklistRules = activeRules.blacklistRules;
  const activeSkipKeywords = activeRules.skipKeywords;
  const activeStatusRules = activeRules.statusRules;
  const canEditTaskConfig = isGlobalScope || settings.useAccountTaskConfig;
  const canEditRules = isGlobalScope || settings.useAccountRules;

  const fetchGlobalScheduledJob = useCallback(async () => {
    if (!isGlobalScope) return;
    const jobs = await scheduledJobsClient.list();
    const job = jobs.find(item => item.scope === 'global' && item.jobType === 'listing.submitDrafts') || null;
    setGlobalScheduledJob(job);
    if (job) {
      setGlobalCronExpression(job.cronExpression);
      setGlobalScheduledEnabledState(job.enabled);
      setGlobalStaggerMinutes(job.staggerMinutes || 0);
    }
  }, [isGlobalScope]);

  useEffect(() => {
    fetchSettings();
    fetchLogs();
    fetchQuota();
    fetchBlacklistRules();
    fetchKeywords();
    fetchStatusRules();
    void fetchGlobalScheduledJob();
    return () => {
      unsubscribeRef.current?.();
    };
  }, [accountId, scope, fetchGlobalScheduledJob]);

  const handleRun = async () => {
    if (quotaExhausted) {
      Modal.confirm({
        title: '今日提审配额已用完',
        content: '配额为 0 时仍可执行任务，但提审步骤会失败。是否继续？',
        okText: '继续执行',
        cancelText: '取消',
        onOk: () => doRun(),
      });
    } else {
      doRun();
    }
  };

  const doRun = async () => {
    setRunning(true);
    setResult(null);
    setLocalListedCount(0);
    const config = {
      ...settings.effectiveTaskConfig,
      listUnreviewedQuantity: Math.min(
        settings.effectiveTaskConfig.listUnreviewedQuantity,
        quota.quota || settings.effectiveTaskConfig.listUnreviewedQuantity,
      ),
    };
    unsubscribeRef.current = onTaskLog((log: LogEntry) => {
      fetchLogs();
      if (log.status === 'success' && log.action === 'list') {
        setLocalListedCount(prev => prev + 1);
      }
    });
    try {
      const res = await runTask(config);
      setResult(res);
      fetchQuota();
    } finally {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      setRunning(false);
      setLocalListedCount(0);
      fetchLogs();
      fetchSettings();
    }
  };

  const updateConfig = async (patch: Partial<TaskConfig>) => {
    if (!canEditTaskConfig) {
      message.info('当前账号使用全局任务配置，请先单独设置此账号');
      return;
    }
    const next = { ...activeTaskConfig, ...patch };
    if (isGlobalScope) {
      await saveGlobalTaskConfig(next);
    } else {
      await saveTaskConfig(next);
      await fetchSettings();
    }
  };

  const saveRules = async (next: ListingRulesConfig) => {
    if (!canEditRules) {
      message.info('当前账号使用全局规则，请先单独设置规则');
      return;
    }
    if (isGlobalScope) {
      await Promise.all([
        saveBlacklistRules(next.blacklistRules),
        saveKeywords(next.skipKeywords),
        saveStatusRules(next.statusRules),
      ]);
      await fetchSettings();
    } else {
      await saveAccountRules(next);
    }
  };

  const handleAccountTaskConfigEnabled = async (enabled: boolean) => {
    await setAccountTaskConfigEnabled(enabled);
    message.success(enabled ? '当前账号已启用单独任务配置' : '当前账号已恢复使用全局任务配置');
  };

  const handleAccountRulesEnabled = async (enabled: boolean) => {
    await setAccountRulesEnabled(enabled);
    message.success(enabled ? '当前账号已启用单独规则' : '当前账号已恢复使用全局规则');
  };

  const openGlobalScheduleModal = () => {
    globalScheduleForm.setFieldsValue({
      enabled: globalScheduledEnabled,
      cronExpression: globalCronExpression,
      staggerMinutes: globalStaggerMinutes,
    });
    setGlobalScheduleModalOpen(true);
  };

  const handleSaveGlobalScheduledJob = async () => {
    const values = await globalScheduleForm.validateFields();
    setSavingGlobalScheduledJob(true);
    try {
      const job = await scheduledJobsClient.upsert({
        name: '商品提审 - 全账号',
        enabled: values.enabled,
        module: 'listing',
        jobType: 'listing.submitDrafts',
        scope: 'global',
        excludedAccountIds: [],
        cronExpression: values.cronExpression,
        staggerMinutes: values.staggerMinutes || 0,
        dailyLimit: 0,
        payload: {},
      });
      setGlobalScheduledJob(job);
      setGlobalScheduledEnabledState(job.enabled);
      setGlobalCronExpression(job.cronExpression);
      setGlobalStaggerMinutes(job.staggerMinutes || 0);
      setGlobalScheduleModalOpen(false);
      message.success('全账号商品提审调度已保存');
    } catch (err: unknown) {
      message.error(`保存全账号调度失败: ${getErrorMessage(err)}`);
    } finally {
      setSavingGlobalScheduledJob(false);
    }
  };

  // 从日志加入黑名单
  const handleAddToBlacklist = async (code: number, errorMsg?: string) => {
    const codes = new Set(activeBlacklistRules.map(r => r.code));
    const newRules: BlacklistRule[] = [];
    if (!codes.has(code)) {
      newRules.push({ code, description: errorMsg?.slice(0, 50) || undefined });
    }
    if (errorMsg) {
      const subCodeRegex = /错误码:(\d+)/g;
      let match;
      while ((match = subCodeRegex.exec(errorMsg)) !== null) {
        const subCode = parseInt(match[1], 10);
        if (!codes.has(subCode)) {
          codes.add(subCode);
          newRules.push({ code: subCode, description: errorMsg?.slice(0, 50) || undefined });
        }
      }
    }
    if (newRules.length === 0) {
      message.info('已在黑名单中');
      return;
    }
    await saveRules({ ...activeRules, blacklistRules: [...activeBlacklistRules, ...newRules] });
    message.success(`已将 ${newRules.map(r => r.code).join(', ')} 加入黑名单`);
  };

  // 删除黑名单规则（默认规则不可删除）
  const handleDeleteRule = async (code: number) => {
    if (blacklistDefaultCodes.has(code)) {
      message.warning('默认规则不可删除');
      return;
    }
    await saveRules({ ...activeRules, blacklistRules: activeBlacklistRules.filter(r => r.code !== code) });
    message.success('已删除');
  };

  // 手动添加黑名单规则
  const handleAddRule = async () => {
    const code = parseInt(newRuleCode.trim(), 10);
    if (isNaN(code)) {
      message.error('请输入有效的错误码');
      return;
    }
    if (activeBlacklistRules.some(r => r.code === code)) {
      message.error('该错误码已存在');
      return;
    }
    await saveRules({ ...activeRules, blacklistRules: [...activeBlacklistRules, { code, description: newRuleDesc.trim() || undefined }] });
    setNewRuleCode('');
    setNewRuleDesc('');
    message.success('已添加');
  };

  // 删除跳过关键词
  const handleDeleteKeyword = async (kw: string) => {
    await saveRules({ ...activeRules, skipKeywords: activeSkipKeywords.filter(k => k !== kw) });
    message.success('已删除');
  };

  // 手动添加跳过关键词
  const handleAddKeyword = async () => {
    const kw = newKeyword.trim();
    if (!kw) {
      message.error('请输入关键词');
      return;
    }
    if (activeSkipKeywords.includes(kw)) {
      message.error('该关键词已存在');
      return;
    }
    await saveRules({ ...activeRules, skipKeywords: [...activeSkipKeywords, kw] });
    setNewKeyword('');
    message.success('已添加');
  };

  // 从日志提取关键词加入跳过列表
  const handleAddKeywordFromLog = async (keyword: string) => {
    if (activeSkipKeywords.includes(keyword)) {
      message.info('已在跳过列表中');
      return;
    }
    await saveRules({ ...activeRules, skipKeywords: [...activeSkipKeywords, keyword] });
    message.success(`已将「${keyword}」加入跳过列表`);
  };

  // --- 解锁运行规则 ---
  const handleUnlockRules = () => {
    Modal.confirm({
      title: '确认修改运行规则？',
      content: '当前配置已经是最优解，除非你清楚每个规则的作用，否则不建议修改。错误的配置可能导致商品被误删或提审失败。',
      okText: '我了解风险，继续',
      cancelText: '算了',
      okButtonProps: { danger: true },
      onOk: () => setRulesLocked(false),
    });
  };

  // --- 处理规则 CRUD ---

  // 更新单条规则的操作类型
  const handleUpdateStatusRule = async (editStatus: number, newAction: 'submit' | 'delete' | 'skip') => {
    const updated = activeStatusRules.map(r =>
      r.editStatus === editStatus ? { ...r, action: newAction } : r
    );
    await saveRules({ ...activeRules, statusRules: updated });
    message.success('已更新');
  };

  // 手动添加新规则
  const handleAddStatusRule = async () => {
    if (newRuleStatus === undefined || isNaN(newRuleStatus)) {
      message.error('请输入有效的状态码');
      return;
    }
    if (activeStatusRules.some(r => r.editStatus === newRuleStatus)) {
      message.error('该状态码已存在');
      return;
    }
    if (!newRuleLabel.trim()) {
      message.error('请输入标签');
      return;
    }
    await saveRules({ ...activeRules, statusRules: [...activeStatusRules, { editStatus: newRuleStatus, label: newRuleLabel.trim(), action: newRuleAction }] });
    setNewRuleStatus(undefined);
    setNewRuleLabel('');
    setNewRuleAction('skip');
    message.success('已添加');
  };

  // 恢复默认规则
  const handleResetStatusRules = async () => {
    if (isGlobalScope) {
      await resetStatusRules();
      await fetchSettings();
    } else {
      await saveRules({ ...activeRules, statusRules: settings.globalRules.statusRules });
    }
    message.success('已恢复默认规则');
  };

  const displayQuota = running ? quota.quota - localListedCount : quota.quota;
  const quotaExhausted = displayQuota <= 0 && quota.total > 0;
  const globalCronLabel = cronPresets.find(item => item.value === globalCronExpression)?.label || globalCronExpression;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      {isGlobalScope ? (
        <div style={{ flexShrink: 0, borderBottom: '1px solid #f0f0f0', paddingBottom: 10, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <Space size={8} wrap>
              <span style={{ fontWeight: 600 }}>全局定时任务</span>
              {globalScheduledJob ? (
                <>
                  <Tag color={globalScheduledEnabled ? 'green' : 'default'}>{globalScheduledEnabled ? '已启用' : '已停用'}</Tag>
                  <span style={{ color: '#666', fontSize: 12 }}>{globalCronLabel}</span>
                  <span style={{ color: '#999', fontSize: 12 }}>错峰 {globalStaggerMinutes} 分钟/账号</span>
                </>
              ) : (
                <span style={{ color: '#999', fontSize: 12 }}>尚未创建</span>
              )}
            </Space>
            <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openGlobalScheduleModal}>
              {globalScheduledJob ? '编辑全局定时任务' : '创建全局定时任务'}
            </Button>
          </div>
        </div>
      ) : null}

      {/* 任务配置 + 执行 */}
      <div style={{ flexShrink: 0, borderBottom: '1px solid #f0f0f0', paddingBottom: 10 }}>
        {!isGlobalScope && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            <Space size={8} wrap>
              <span style={{ fontWeight: 500 }}>任务配置</span>
              {settings.useAccountTaskConfig && <Tag color="blue">单独设置中</Tag>}
            </Space>
            {settings.useAccountTaskConfig ? (
              <Button size="small" onClick={() => handleAccountTaskConfigEnabled(false)}>恢复使用全局</Button>
            ) : (
              <Button size="small" onClick={() => handleAccountTaskConfigEnabled(true)}>单独设置此账号</Button>
            )}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <Space size={24} wrap>
            <Space size={8}>
              <Checkbox
                checked={activeTaskConfig.listUnreviewed}
                onChange={e => updateConfig({ listUnreviewed: e.target.checked })}
                disabled={!canEditTaskConfig}
              >
                提交未审核
              </Checkbox>
              <InputNumber
                controls={false}
                size="small" min={1} max={!isGlobalScope ? quota.quota || undefined : undefined} value={activeTaskConfig.listUnreviewedQuantity}
                onChange={v => updateConfig({ listUnreviewedQuantity: v || 2 })}
                disabled={!canEditTaskConfig || !activeTaskConfig.listUnreviewed}
                style={{ width: 60 }}
              />
              {!isGlobalScope && (
                <Button
                  size="small"
                  disabled={!canEditTaskConfig || !activeTaskConfig.listUnreviewed || !quota.quota}
                  onClick={() => updateConfig({ listUnreviewedQuantity: quota.quota })}
                >
                  最大
                </Button>
              )}
              <span style={{ color: '#666' }}>条</span>
            </Space>
            <Checkbox
              checked={activeTaskConfig.autoDeleteFailed !== false}
              onChange={e => updateConfig({ autoDeleteFailed: e.target.checked })}
              disabled={!canEditTaskConfig}
            >
              失败自动删除
              <Tooltip title="上架失败的商品自动删除。开启后，可配合「保留关键词」排除不需要删除的情况">
                <QuestionCircleOutlined style={{ color: '#999', marginLeft: 4, fontSize: 12 }} />
              </Tooltip>
            </Checkbox>
          </Space>
          {!isGlobalScope && (
            <Space wrap>
              {quota.total > 0 && (
                <Tag color={quotaExhausted ? 'red' : 'green'}>
                  配额 {displayQuota}/{quota.total}
                </Tag>
              )}
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={handleRun}
                loading={running}
                disabled={!settings.effectiveTaskConfig.listUnreviewed}
                style={running ? { display: 'none' } : undefined}
              >
                开始执行
              </Button>
              <Button
                danger
                icon={<CloseCircleOutlined />}
                onClick={stopTask}
                style={!running ? { display: 'none' } : undefined}
              >
                停止
              </Button>
            </Space>
          )}
        </div>
        {!isGlobalScope && quotaExhausted && (
          <div style={{ marginTop: 8, color: '#ff4d4f', fontSize: 12 }}>
            今日提审配额已用完，请明天再试
          </div>
        )}
        {!isGlobalScope && running && (
          <div style={{ marginTop: 8, color: '#999', fontSize: 12 }}>执行中，请勿重复操作...</div>
        )}
      </div>

      {/* 执行结果 */}
      {!isGlobalScope && result && (
        <Alert
          type={result.stopped ? 'warning' : 'success'}
          showIcon={false}
          style={{ padding: '8px 16px' }}
          title={
            <Space size={16} wrap>
              <span>扫描 {result.scanned}</span>
              {result.listed > 0 && <Tag color="success">上架成功 {result.listed}</Tag>}
              {result.deleted > 0 && <Tag color="blue">已删除 {result.deleted}</Tag>}
              {result.skipped > 0 && <Tag>跳过 {result.skipped}</Tag>}
              {(result.pendingCount ?? 0) > 0 && <Tag color="orange">待处理 {result.pendingCount}</Tag>}
              {result.errors > 0 && <Tag color="error">删除失败 {result.errors}</Tag>}
              {result.stopped && <Tag color="warning">已停止: {result.reason}</Tag>}
            </Space>
          }
        />
      )}

      {/* 运行规则 — 默认锁定 */}
      <div style={{ flexShrink: 0, borderBottom: '1px solid #f0f0f0', paddingBottom: 10, opacity: rulesLocked ? 0.75 : 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Space size={8} wrap>
            <span style={{ fontWeight: 500 }}>运行规则</span>
            {!isGlobalScope && settings.useAccountRules && <Tag color="blue">单独设置中</Tag>}
          </Space>
          <Space size={4} wrap>
            {!isGlobalScope && (
              settings.useAccountRules ? (
                <Button size="small" onClick={() => handleAccountRulesEnabled(false)}>恢复使用全局规则</Button>
              ) : (
                <Button size="small" onClick={() => handleAccountRulesEnabled(true)}>单独设置规则</Button>
              )
            )}
            <Button
              size="small"
              type="text"
              onClick={() => rulesLocked ? handleUnlockRules() : setRulesLocked(true)}
            >
              {rulesLocked ? '已锁定' : '已解锁'}
            </Button>
          </Space>
        </div>
        {/* 扫描商品时：按状态码决定处理方式 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 13 }}>扫描商品时</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {activeStatusRules.map(rule => (
              <Tag key={rule.editStatus} style={{ fontSize: 12, padding: '2px 8px' }}>
                {rule.editStatus}({rule.label}) →
                <Select
                  value={rule.action}
                  size="small"
                  variant="borderless"
                  disabled={rulesLocked || !canEditRules}
                  style={{ width: 90, marginLeft: 4, verticalAlign: 'middle' }}
                  onChange={(v: 'submit' | 'delete' | 'skip') => handleUpdateStatusRule(rule.editStatus, v)}
                  options={[
                    { value: 'submit', label: '提交审核' },
                    { value: 'delete', label: '直接删除' },
                    { value: 'skip', label: '跳过' },
                  ]}
                />
              </Tag>
            ))}
            {!rulesLocked && canEditRules && (
              <Popconfirm title="恢复默认规则？" onConfirm={handleResetStatusRules}>
                <Button size="small" type="link">恢复默认</Button>
              </Popconfirm>
            )}
          </div>
          {!rulesLocked && canEditRules && (
            <Space wrap style={{ marginTop: 8 }}>
              <InputNumber
                controls={false}
                placeholder="状态码"
                value={newRuleStatus}
                onChange={v => setNewRuleStatus(v ?? undefined)}
                style={{ width: 80 }}
                min={0}
                size="small"
              />
              <Input
                placeholder="含义"
                value={newRuleLabel}
                onChange={e => setNewRuleLabel(e.target.value)}
                style={{ width: 100 }}
                size="small"
                onPressEnter={handleAddStatusRule}
              />
              <Select
                value={newRuleAction}
                onChange={(v: 'submit' | 'delete' | 'skip') => setNewRuleAction(v)}
                style={{ width: 100 }}
                size="small"
                options={[
                  { value: 'submit', label: '提交审核' },
                  { value: 'delete', label: '直接删除' },
                  { value: 'skip', label: '跳过' },
                ]}
              />
              <Button size="small" icon={<PlusOutlined />} onClick={handleAddStatusRule}>添加</Button>
            </Space>
          )}
        </div>

        <Divider style={{ margin: '8px 0 12px' }} />

        {/* 提审失败时：按错误码/关键词决定处理方式 */}
        <div>
          <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 13 }}>提审失败时</div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {/* 立即停止 */}
            <div>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>遇到这些错误码 → 停止任务</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                {activeBlacklistRules.map(r => {
                  const isDefault = blacklistDefaultCodes.has(r.code);
                  return (
                    <Tooltip key={r.code} title={isDefault ? '系统默认规则，不可删除' : undefined}>
                      <Tag
                        closable={!rulesLocked && canEditRules && !isDefault}
                        onClose={() => handleDeleteRule(r.code)}
                        color={isDefault ? '#cf1322' : 'red'}
                        style={{ fontSize: 11, ...(isDefault ? { borderStyle: 'solid', opacity: 0.75 } : {}) }}
                      >
                        {r.code}
                      </Tag>
                    </Tooltip>
                  );
                })}
                {!rulesLocked && canEditRules && (
                  <>
                    <Input
                      placeholder="错误码"
                      value={newRuleCode}
                      onChange={e => setNewRuleCode(e.target.value)}
                      style={{ width: 100 }}
                      size="small"
                      onPressEnter={handleAddRule}
                    />
                    <Input
                      placeholder="说明"
                      value={newRuleDesc}
                      onChange={e => setNewRuleDesc(e.target.value)}
                      style={{ width: 120 }}
                      size="small"
                      onPressEnter={handleAddRule}
                    />
                    <Button size="small" icon={<PlusOutlined />} onClick={handleAddRule} />
                  </>
                )}
              </div>
            </div>
            {/* 不删除 */}
            <div>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>错误信息包含这些词 → 不删商品</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                {activeSkipKeywords.map(kw => (
                  <Tag
                    key={kw}
                    closable={!rulesLocked && canEditRules}
                    onClose={() => handleDeleteKeyword(kw)}
                    color="orange"
                    style={{ fontSize: 11 }}
                  >
                    {kw}
                  </Tag>
                ))}
                {!rulesLocked && canEditRules && (
                  <>
                    <Input
                      placeholder="关键词"
                      value={newKeyword}
                      onChange={e => setNewKeyword(e.target.value)}
                      style={{ width: 100 }}
                      size="small"
                      onPressEnter={handleAddKeyword}
                    />
                    <Button size="small" icon={<PlusOutlined />} onClick={handleAddKeyword} />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 执行记录 */}
      {!isGlobalScope && (
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', paddingTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexShrink: 0, gap: 8 }}>
          <span style={{ fontWeight: 500 }}>执行记录</span>
          <Space size={4}>
            <Button size="small" type="text" icon={<ReloadOutlined />} onClick={() => { fetchLogs(); fetchQuota(); }} />
            <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={clearLogs} />
          </Space>
        </div>
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {logs.length === 0 ? (
          <div style={{ color: '#999', textAlign: 'center', padding: 32 }}>暂无记录</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ color: '#bbb', fontSize: 11, textAlign: 'center' }}>最新</div>
            {[...logs].reverse().map((log, index, arr) => {
              const nextLog = arr[index - 1];
              const showDivider = index > 0 && log.runId !== nextLog?.runId;
              const isSuccess = log.status === 'success';
              const isSkipAction = log.action === 'skip';
              const actionLabel = log.action === 'delete' ? '删除' : log.action === 'check' ? '检查' : log.action === 'skip' ? '待处理' : '上架';
              const actionColor = log.action === 'delete' ? '#fa8c16' : log.action === 'check' ? '#52c41a' : isSkipAction ? '#fa8c16' : '#1677ff';
              const inBlacklist = log.errorCode != null && activeBlacklistRules.some(r =>
                r.code === log.errorCode || (log.errorMsg && log.errorMsg.includes(`错误码:${r.code}`))
              );
              return (
                <React.Fragment key={log.id}>
                  {showDivider && <Divider style={{ margin: '4px 0' }} />}
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    background: isSuccess ? '#f6ffed' : isSkipAction ? '#fff7e6' : '#fff2f0',
                    borderLeft: `3px solid ${isSuccess ? '#b7eb8f' : isSkipAction ? '#ffd591' : '#ffccc7'}`,
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
                        {log.errorCode != null && (
                          <Tag color="error" style={{ fontSize: 11, marginRight: 4, lineHeight: '18px', padding: '0 4px' }}>errcode:{log.errorCode}</Tag>
                        )}
                        {log.errorMsg}
                        {isSkipAction && (
                          <Tag color="orange" style={{ fontSize: 10, marginLeft: 4, lineHeight: '16px', padding: '0 4px', verticalAlign: 'middle' }}>待处理</Tag>
                        )}
                        {log.errorCode != null && !inBlacklist && !isSkipAction && log.action === 'list' && (
                          <Tooltip title="将此错误码加入停止黑名单，以后遇到时立即停止任务">
                            <Button
                              type="link"
                              size="small"
                              style={{ fontSize: 11, padding: '0 4px', height: 'auto', marginLeft: 4, verticalAlign: 'middle', color: '#ff4d4f' }}
                              onClick={() => handleAddToBlacklist(log.errorCode!, log.errorMsg)}
                            >
                              停止黑名单
                            </Button>
                          </Tooltip>
                        )}
                        {log.errorCode != null && !inBlacklist && !isSkipAction && log.action === 'list' && (
                          <Tooltip title="添加关键词，以后错误信息包含该词时保留商品不删除">
                            <Button
                              type="link"
                              size="small"
                              style={{ fontSize: 11, padding: '0 4px', height: 'auto', marginLeft: 4, verticalAlign: 'middle', color: '#fa8c16' }}
                              onClick={() => {
                                const kw = window.prompt('输入关键词，以后错误信息包含该词时保留商品不删除', '');
                                if (kw?.trim()) handleAddKeywordFromLog(kw.trim());
                              }}
                            >
                              保留不删
                            </Button>
                          </Tooltip>
                        )}
                        {inBlacklist && (
                          <Tag color="red" style={{ fontSize: 10, marginLeft: 4, lineHeight: '16px', padding: '0 4px', verticalAlign: 'middle' }}>黑名单</Tag>
                        )}
                      </div>
                    )}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        )}
        </div>
      </div>
      )}

      <Modal
        title="全局商品提审定时任务"
        open={globalScheduleModalOpen}
        okText={globalScheduledJob ? '保存全局定时任务' : '创建全局定时任务'}
        cancelText="取消"
        confirmLoading={savingGlobalScheduledJob}
        onOk={handleSaveGlobalScheduledJob}
        onCancel={() => setGlobalScheduleModalOpen(false)}
        destroyOnHidden
      >
        <Form<GlobalScheduleFormValues>
          form={globalScheduleForm}
          layout="vertical"
          initialValues={{ enabled: true, cronExpression: '0 9 * * *', staggerMinutes: 10 }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', rowGap: 8, columnGap: 12, marginBottom: 16, fontSize: 13 }}>
            <span style={{ color: '#666' }}>任务类型</span>
            <span style={{ fontWeight: 500 }}>商品提审</span>
            <span style={{ color: '#666' }}>作用范围</span>
            <span style={{ fontWeight: 500 }}>全部账号</span>
          </div>
          <Form.Item name="enabled" label="启用任务" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="cronExpression" label="执行时间" rules={[{ required: true, message: '请选择执行时间' }]}>
            <Select options={cronPresets} />
          </Form.Item>
          <Form.Item name="staggerMinutes" label="每账号错峰间隔（分钟）">
            <InputNumber min={0} max={240} style={{ width: '100%' }} />
          </Form.Item>
          <Alert
            type="info"
            showIcon
            title="保存后会创建或更新唯一的全局商品提审定时任务。"
          />
        </Form>
      </Modal>

    </div>
  );
};

export default React.memo(Listing);
