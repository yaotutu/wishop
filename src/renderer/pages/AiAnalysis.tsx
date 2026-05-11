import React from 'react';
import { Card, Alert, Select, Input, Button, Table, Tag, Space, Progress } from 'antd';
import { RobotOutlined, ThunderboltOutlined, WarningOutlined } from '@ant-design/icons';

const mockResults = [
  { id: 1, product: '夏季薄款防晒衣 女款', score: 72, compliance: 'pass', risks: ['标题含"最薄"可能违反广告法'], suggestion: '建议将"最薄"修改为"超薄"或"轻薄"' },
  { id: 2, product: '家用便携榨汁杯', score: 85, compliance: 'pass', risks: [], suggestion: '商品信息完整，建议补充更多实物图' },
  { id: 3, product: '男士透气运动鞋', score: 45, compliance: 'fail', risks: ['描述含"全网最低价"违反广告法', '缺少产品参数信息', '主图含水印'], suggestion: '需立即修改违规描述，补充产品参数，更换无水印主图' },
  { id: 4, product: '车载手机支架', score: 91, compliance: 'pass', risks: [], suggestion: '商品状态良好，无需修改' },
  { id: 5, product: '儿童益智积木套装', score: 58, compliance: 'warning', risks: ['未标注适用年龄范围', '缺少3C认证信息'], suggestion: '儿童用品需标注适用年龄和认证信息，建议尽快补充' },
  { id: 6, product: '不锈钢保温杯 500ml', score: 88, compliance: 'pass', risks: ['描述中材质说明不够详细'], suggestion: '建议补充304/316材质检测报告' },
  { id: 7, product: '无线蓝牙耳机', score: 63, compliance: 'warning', risks: ['标题关键词堆砌', '价格标示不清晰'], suggestion: '精简标题关键词，明确标注促销价格规则' },
  { id: 8, product: '厨房多功能切菜器', score: 78, compliance: 'pass', risks: ['图片清晰度不足'], suggestion: '建议重新拍摄高清产品图' },
];

const complianceMap: Record<string, { color: string; text: string }> = {
  pass: { color: 'success', text: '合规' },
  warning: { color: 'warning', text: '注意' },
  fail: { color: 'error', text: '违规' },
};

const AiAnalysis: React.FC = () => {
  const columns = [
    { title: '商品名称', dataIndex: 'product', key: 'product', ellipsis: true },
    {
      title: '评分', dataIndex: 'score', key: 'score', width: 100,
      render: (s: number) => (
        <Progress
          percent={s}
          size="small"
          strokeColor={s >= 80 ? '#52c41a' : s >= 60 ? '#faad14' : '#ff4d4f'}
          format={(p) => `${p}分`}
        />
      ),
    },
    {
      title: '合规', dataIndex: 'compliance', key: 'compliance', width: 80,
      render: (c: string) => <Tag color={complianceMap[c]?.color}>{complianceMap[c]?.text}</Tag>,
    },
    {
      title: '风险提示', dataIndex: 'risks', key: 'risks',
      render: (risks: string[]) => risks.length > 0
        ? risks.map((r, i) => <div key={i} style={{ fontSize: 12, color: '#ff4d4f' }}>· {r}</div>)
        : <span style={{ color: '#999', fontSize: 12 }}>无风险</span>,
    },
    {
      title: '建议', dataIndex: 'suggestion', key: 'suggestion', width: 200, ellipsis: true,
      render: (s: string) => <span style={{ fontSize: 12, color: '#666' }}>{s}</span>,
    },
    {
      title: '操作', key: 'action', width: 80,
      render: () => <Button type="link" size="small" disabled>查看详情</Button>,
    },
  ];

  const avgScore = Math.round(mockResults.reduce((sum, r) => sum + r.score, 0) / mockResults.length);
  const failCount = mockResults.filter(r => r.compliance === 'fail').length;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Alert type="warning" showIcon banner message="AI 商品分析功能开发中，当前展示数据仅供参考" />

      <Card size="small" title={<Space><RobotOutlined />AI 配置</Space>}>
        <Space wrap>
          <Space>
            <span style={{ fontSize: 13 }}>模型：</span>
            <Select value="openai" style={{ width: 160 }} size="small" disabled options={[
              { value: 'openai', label: 'OpenAI (GPT)' },
              { value: 'anthropic', label: 'Claude' },
              { value: 'deepseek', label: 'DeepSeek' },
              { value: 'qwen', label: '通义千问' },
            ]} />
          </Space>
          <Space>
            <span style={{ fontSize: 13 }}>API Key：</span>
            <Input.Password value="sk-****" style={{ width: 200 }} size="small" disabled />
          </Space>
          <Space>
            <span style={{ fontSize: 13 }}>Model：</span>
            <Input value="gpt-4o" style={{ width: 140 }} size="small" disabled />
          </Space>
          <Button type="primary" icon={<ThunderboltOutlined />} disabled>开始分析</Button>
        </Space>
      </Card>

      <div style={{ display: 'flex', gap: 12 }}>
        <Card size="small" style={{ flex: 1 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#999' }}>已分析商品</div>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{mockResults.length}</div>
          </div>
        </Card>
        <Card size="small" style={{ flex: 1 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#999' }}>平均评分</div>
            <div style={{ fontSize: 24, fontWeight: 600, color: avgScore >= 80 ? '#52c41a' : '#faad14' }}>{avgScore}分</div>
          </div>
        </Card>
        <Card size="small" style={{ flex: 1 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#999' }}>违规商品</div>
            <div style={{ fontSize: 24, fontWeight: 600, color: failCount > 0 ? '#ff4d4f' : '#52c41a' }}>
              {failCount}
            </div>
          </div>
        </Card>
      </div>

      <Card
        size="small"
        title={<Space><WarningOutlined />分析结果</Space>}
        style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
        styles={{ body: { flex: 1, overflow: 'auto', padding: 0, minHeight: 0 } }}
      >
        <Table
          dataSource={mockResults}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={false}
        />
      </Card>
    </div>
  );
};

export default AiAnalysis;
