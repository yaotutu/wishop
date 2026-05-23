import React, { useState } from 'react';
import { Alert, Card, Button, Empty, Space, Input, InputNumber, Table, Tag, Radio, Modal, message, Popconfirm, Upload } from 'antd';
import { UploadOutlined, DeleteOutlined, SearchOutlined, StopOutlined, ExclamationCircleOutlined, EyeOutlined } from '@ant-design/icons';
import { getErrorMessage } from '../../../shared/errors';
import type { ViolationMatch } from '../../../shared/types';
import { useViolationWorkflow } from '../../domains/violations/hooks';

interface ViolationProps {
  accountId: string;
}

const ViolationPage: React.FC<ViolationProps> = ({ accountId }) => {
  const {
    words,
    saveWords,
    scanning,
    deleting,
    violations,
    selectedKeys,
    setSelectedKeys,
    currentViolation,
    oneByOneScanning,
    logs,
    scanResult,
    error,
    clearError,
    batchScan,
    batchDelete,
    startOneByOne,
    nextViolation,
    deleteCurrentViolation,
    stop,
  } = useViolationWorkflow(accountId);
  const [wordsExpanded, setWordsExpanded] = useState(false);
  const [mode, setMode] = useState<'batch' | 'onebyone'>('batch');
  const [scanLimit, setScanLimit] = useState(100);
  const [previewWords, setPreviewWords] = useState<string[]>([]);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [activeResultTab, setActiveResultTab] = useState<'result' | 'logs'>('result');

  const showOperationError = (operation: string, err: unknown) => {
    message.error(`${operation}失败: ${getErrorMessage(err)}`);
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = [...new Set(
        text.split(/\r?\n/)
          .map(line => line.trim())
          .filter(line => line.length > 0)
      )];
      if (parsed.length === 0) {
        message.warning('文件内容为空');
        return;
      }
      setPreviewWords(parsed);
      setPreviewModalOpen(true);
    };
    reader.readAsText(file);
    return false;
  };

  const handleConfirmImport = async () => {
    try {
      await saveWords(previewWords);
      setPreviewModalOpen(false);
      setPreviewWords([]);
      message.success(`已导入 ${previewWords.length} 个违规词`);
    } catch (err: unknown) {
      showOperationError('导入违规词', err);
    }
  };

  // --- Batch scan ---
  const handleBatchScan = async () => {
    if (words.length === 0) {
      message.warning('请先上传违规词文件');
      return;
    }
    setActiveResultTab('logs');
    try {
      const result = await batchScan(scanLimit);
      setActiveResultTab('result');
      if (result.stopped) {
        message.warning(result.reason || '扫描已停止');
      }
    } catch (err: unknown) {
      showOperationError('批量扫描', err);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedKeys.length === 0) return;
    const toDelete = violations.filter(v => selectedKeys.includes(v.productId));
    try {
      const result = await batchDelete(toDelete);
      message.success(`已删除 ${result.deleted} 条，失败 ${result.errors} 条`);
    } catch (err: unknown) {
      showOperationError('批量删除', err);
    }
  };

  // --- One-by-one scan ---
  const handleOneByOneStart = async () => {
    if (words.length === 0) {
      message.warning('请先上传违规词文件');
      return;
    }
    setActiveResultTab('logs');
    try {
      const result = await startOneByOne();
      if (result.type === 'done') {
        if (result.reason) message.warning(result.reason);
        else message.info('扫描完成，未发现违规商品');
      } else if (result.type === 'stopped') {
        message.warning(result.reason || '已停止');
      }
    } catch (err: unknown) {
      showOperationError('逐个扫描', err);
    }
  };

  const handleNextViolation = async () => {
    try {
      const result = await nextViolation();
      if (result.type === 'done') {
        if (result.reason) {
          message.warning(result.reason);
        } else {
          message.info('扫描完成，未发现违规商品');
        }
      } else if (result.type === 'stopped') {
        message.warning(result.reason || '已停止');
      }
    } catch (err: unknown) {
      showOperationError('继续扫描', err);
    }
  };

  const handleOneByOneSkip = async () => {
    await handleNextViolation();
  };

  const handleOneByOneDelete = async () => {
    if (!currentViolation) return;
    try {
      const result = await deleteCurrentViolation();
      if (result.type === 'stopped') {
        message.warning(result.reason || '已停止');
      }
    } catch (err: unknown) {
      showOperationError('删除违规商品', err);
    }
  };

  const handleStop = async () => {
    try {
      await stop();
    } catch (err: unknown) {
      showOperationError('停止扫描', err);
    }
  };

  const highlightTitle = (title: string, matchedWords: string[]) => {
    let parts: { text: string; highlight: boolean }[] = [{ text: title, highlight: false }];
    for (const word of matchedWords) {
      const newParts: { text: string; highlight: boolean }[] = [];
      for (const part of parts) {
        if (part.highlight) {
          newParts.push(part);
          continue;
        }
        const lower = part.text.toLowerCase();
        const idx = lower.indexOf(word.toLowerCase());
        if (idx === -1) {
          newParts.push(part);
          continue;
        }
        if (idx > 0) newParts.push({ text: part.text.slice(0, idx), highlight: false });
        newParts.push({ text: part.text.slice(idx, idx + word.length), highlight: true });
        if (idx + word.length < part.text.length) {
          newParts.push({ text: part.text.slice(idx + word.length), highlight: false });
        }
      }
      parts = newParts;
    }
    return parts;
  };

  const isRunning = scanning || oneByOneScanning;

  const columns = [
    {
      title: '商品标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (title: string, record: ViolationMatch) => {
        const parts = highlightTitle(title, record.matchedWords);
        return <span>{parts.map((p, i) => p.highlight
          ? <Tag key={i} color="red" style={{ margin: 0 }}>{p.text}</Tag>
          : <span key={i}>{p.text}</span>
        )}</span>;
      },
    },
    {
      title: '匹配词',
      dataIndex: 'matchedWords',
      key: 'matchedWords',
      width: 200,
      render: (matchedWords: string[]) => matchedWords.map(w => (
        <Tag key={w} color="orange">{w}</Tag>
      )),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: unknown, record: ViolationMatch) => (
        <Popconfirm
          title="确认删除此商品？"
          onConfirm={async () => {
            try {
              const result = await batchDelete([record]);
              if (result.deleted > 0) {
                message.success('已删除');
              } else {
                message.error('删除失败');
              }
            } catch (err: unknown) {
              showOperationError('删除违规商品', err);
            }
          }}
          okText="删除"
          cancelText="取消"
        >
          <Button type="link" danger size="small">删除</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
      {error && (
        <Alert
          type="error"
          showIcon
          closable
          message={error}
          onClose={clearError}
        />
      )}

      {/* 操作栏 */}
      <Card size="small">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, minWidth: 0 }}>
          {/* 左侧：词库状态 */}
          <Space size={16} wrap>
            {words.length > 0 ? (
              <>
                <Tag color="green">已加载 {words.length} 个违规词</Tag>
                <Button size="small" type="link" icon={<EyeOutlined />} onClick={() => setWordsExpanded(!wordsExpanded)}>
                  {wordsExpanded ? '收起' : '查看'}
                </Button>
              </>
            ) : (
              <span style={{ color: '#999', fontSize: 13 }}>暂未加载违规词</span>
            )}
          </Space>
          {/* 右侧：按钮组 */}
          <Space size={8} wrap>
            {words.length > 0 && (
              <Popconfirm
                title="确认清空违规词库？"
                onConfirm={async () => {
                  try {
                    await saveWords([]);
                    message.success('已清空');
                  } catch (err: unknown) {
                    showOperationError('清空违规词库', err);
                  }
                }}
                okText="清空"
                cancelText="取消"
              >
                <Button size="small" icon={<DeleteOutlined />}>清空词库</Button>
              </Popconfirm>
            )}
            <Upload accept=".txt" showUploadList={false} beforeUpload={handleFileUpload}>
              <Button size="small" type="primary" icon={<UploadOutlined />}>上传违规词文件</Button>
            </Upload>
          </Space>
        </div>
        {/* 词库展开区 */}
        {wordsExpanded && words.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <Input.TextArea
              value={words.join('\n')}
              readOnly
              autoSize={{ minRows: 3, maxRows: 10 }}
              style={{ fontFamily: 'monospace', fontSize: 12, color: '#666' }}
            />
          </div>
        )}
      </Card>

      {/* 扫描控制 */}
      <Card size="small">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <Space size={16} wrap>
            <Space size={4}>
              <Tag color="blue">草稿箱</Tag>
              <Radio.Group value={mode} onChange={e => setMode(e.target.value)} size="small">
                <Radio.Button value="batch">批量扫描</Radio.Button>
                <Radio.Button value="onebyone">逐个提示</Radio.Button>
              </Radio.Group>
            </Space>
            <Space size={4}>
              <span style={{ color: '#999', fontSize: 12 }}>上限</span>
              <InputNumber size="small" min={1} max={10000} value={scanLimit} onChange={v => setScanLimit(v || 100)} style={{ width: 64 }} />
              <span style={{ color: '#999', fontSize: 12 }}>条</span>
            </Space>
          </Space>
          <Space wrap>
            {isRunning && <span style={{ color: '#999', fontSize: 12 }}>执行中...</span>}
            {isRunning ? (
              <Button danger size="small" icon={<StopOutlined />} onClick={handleStop}>停止</Button>
            ) : (
              <Button
                type="primary"
                size="small"
                icon={<SearchOutlined />}
                onClick={mode === 'batch' ? handleBatchScan : handleOneByOneStart}
                disabled={words.length === 0}
              >
                开始扫描
              </Button>
            )}
          </Space>
        </div>
      </Card>

      {/* 结果区：Tab 切换扫描结果 / 执行日志 */}
      {(scanResult || logs.length > 0 || isRunning) && (
        <Card
          size="small"
          style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
          styles={{ body: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: 0 } }}
          tabList={[
            { key: 'result', tab: <span>扫描结果{scanResult ? ` (${scanResult.scanned})` : ''}</span> },
            { key: 'logs', tab: <span>执行日志{logs.length > 0 ? ` (${logs.length})` : ''}</span> },
          ]}
          activeTabKey={activeResultTab}
          onTabChange={key => setActiveResultTab(key as 'result' | 'logs')}
        >
          {/* 扫描结果 tab */}
          {activeResultTab === 'result' && (
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              {/* 摘要 + 操作栏 */}
              {scanResult && mode === 'batch' && (
                <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <Space size={12} wrap>
                    <span style={{ fontSize: 13 }}>已扫描 <b>{scanResult.scanned}</b> 条</span>
                    {scanResult.total > 0 ? (
                      <Tag color="error">{scanResult.total} 条违规</Tag>
                    ) : (
                      <Tag color="success">无违规</Tag>
                    )}
                  </Space>
                  {violations.length > 0 && (
                    <Space size={8} wrap>
                      <Button
                        size="small"
                        onClick={() => {
                          const allKeys = violations.map(v => v.productId);
                          setSelectedKeys(selectedKeys.length === allKeys.length ? [] : allKeys);
                        }}
                      >
                        {selectedKeys.length === violations.length ? '取消全选' : '全选'}
                      </Button>
                      <Button
                        size="small"
                        type="primary"
                        danger
                        icon={<DeleteOutlined />}
                        disabled={selectedKeys.length === 0}
                        loading={deleting}
                        onClick={handleBatchDelete}
                      >
                        删除选中 ({selectedKeys.length})
                      </Button>
                    </Space>
                  )}
                </div>
              )}
              {/* 表格 */}
              {mode === 'batch' && violations.length > 0 ? (
                <div style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
                  <Table
                    dataSource={violations}
                    rowKey="productId"
                    size="small"
                    pagination={false}
                    rowSelection={{
                      selectedRowKeys: selectedKeys,
                      onChange: keys => setSelectedKeys(keys),
                    }}
                    columns={columns}
                    scroll={{ x: 720 }}
                  />
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={scanResult ? '无违规商品' : '尚未扫描'} />
                </div>
              )}
            </div>
          )}

          {/* 执行日志 tab */}
          {activeResultTab === 'logs' && (
            <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}>
              {logs.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无日志" style={{ padding: 32 }} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {[...logs].reverse().map(log => {
                    const isSuccess = log.status === 'success';
                    return (
                      <div key={log.id} style={{
                        padding: '4px 8px',
                        borderRadius: 4,
                        background: isSuccess ? '#f6ffed' : '#fff2f0',
                        borderLeft: `3px solid ${isSuccess ? '#b7eb8f' : '#ffccc7'}`,
                        fontSize: 12,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 600, color: isSuccess ? '#52c41a' : '#cf1322', flexShrink: 0 }}>
                            {log.action === 'delete' ? '删除' : '检查'}
                          </span>
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {log.productTitle || log.productId || ''}
                          </span>
                          <span style={{ color: '#bbb', fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {new Date(log.timestamp).toLocaleTimeString('zh-CN')}
                          </span>
                        </div>
                        {log.errorMsg && (
                          <div style={{ color: '#cf1322', marginTop: 2, lineHeight: 1.6, wordBreak: 'break-all' }}>
                            {log.errorCode != null && <Tag color="error" style={{ fontSize: 11, marginRight: 4, lineHeight: '18px', padding: '0 4px' }}>errcode:{log.errorCode}</Tag>}
                            {log.errorMsg}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* 逐个模式弹窗 */}
      <Modal
        open={!!currentViolation}
        closable={false}
        footer={null}
        width={500}
        centered
      >
        {currentViolation && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <Space>
                <ExclamationCircleOutlined style={{ color: '#faad14', fontSize: 18 }} />
                <span style={{ fontWeight: 600, fontSize: 15 }}>发现违规商品</span>
              </Space>
            </div>
            <div style={{ marginBottom: 8, color: '#999', fontSize: 13 }}>
              已扫描 {currentViolation.scanned} 条商品
            </div>
            <div style={{
              padding: '12px 16px',
              background: '#fff7e6',
              border: '1px solid #ffd591',
              borderRadius: 8,
              marginBottom: 12,
            }}>
              <div style={{ fontSize: 14, lineHeight: 1.8, wordBreak: 'break-all' }}>
                {highlightTitle(currentViolation.title, currentViolation.matchedWords).map((p, i) =>
                  p.highlight
                    ? <Tag key={i} color="red" style={{ margin: '2px 1px' }}>{p.text}</Tag>
                    : <span key={i}>{p.text}</span>
                )}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <span style={{ color: '#999', fontSize: 13, marginRight: 8 }}>匹配到违规词：</span>
              {currentViolation.matchedWords.map(w => (
                <Tag key={w} color="orange">{w}</Tag>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button danger icon={<StopOutlined />} onClick={handleStop}>停止扫描</Button>
              <Button onClick={handleOneByOneSkip}>跳过继续</Button>
              <Button type="primary" danger icon={<DeleteOutlined />} onClick={handleOneByOneDelete}>删除此商品</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 文件上传预览确认弹窗 */}
      <Modal
        title="确认导入违规词"
        open={previewModalOpen}
        onCancel={() => { setPreviewModalOpen(false); setPreviewWords([]); }}
        footer={[
          <Button key="cancel" onClick={() => { setPreviewModalOpen(false); setPreviewWords([]); }}>
            取消
          </Button>,
          <Button key="confirm" type="primary" onClick={handleConfirmImport}>
            确认导入 ({previewWords.length} 个词)
          </Button>,
        ]}
        width={500}
        centered
      >
        <div style={{ marginBottom: 12, color: '#666' }}>
          从文件中解析到 <b style={{ color: '#1677ff' }}>{previewWords.length}</b> 个违规词，
          {words.length > 0 && <span style={{ color: '#ff4d4f' }}>将替换当前已有的 {words.length} 个词</span>}
          {words.length === 0 && '确认后将作为当前违规词库'}
        </div>
        <Input.TextArea
          value={previewWords.join('\n')}
          readOnly
          autoSize={{ minRows: 6, maxRows: 16 }}
          style={{ fontFamily: 'monospace', fontSize: 12 }}
        />
      </Modal>
    </div>
  );
};

export default React.memo(ViolationPage);
