export const PURCHASE_LOOKUP_SCRIPT = String.raw`
(() => {
  const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const pageText = () => normalize(document.body && (document.body.innerText || document.body.textContent));
  const valueAfterLabel = (text, labels) => {
    for (const label of labels) {
      const index = text.indexOf(label);
      if (index < 0) continue;
      const rest = text.slice(index + label.length).replace(/^[：:\s]+/, '');
      const value = rest.split(/\s{2,}|\n| {2,}/)[0];
      if (value) return normalize(value);
    }
    return '';
  };
  const exactElementTextMatches = (candidates, root) => {
    for (const element of Array.from((root || document.body).querySelectorAll('*'))) {
      const text = normalize(element.textContent);
      if (candidates.includes(text)) return text;
    }
    return '';
  };
  const ORDER_STATUS = ['交易关闭', '卖家已发货', '买家已付款', '交易成功', '等待买家付款', '退款中', '退款成功', '已签收'];
  const LOGISTICS_STATUS = ['包裹正在等待揽收', '已揽收', '运输中', '派送中', '已签收', '等待揽收', '包裹已出库'];
  const COMPANIES = ['顺丰', '中通', '圆通', '申通', '韵达', '极兔', '邮政', 'EMS', '京东', '德邦', '菜鸟'];
  const text = pageText();
  const statusRoot = document.querySelector('#headerContainer') || document.querySelector('#headerP1Container') || document.body;
  const packageText = Array.from(document.querySelectorAll('*')).map(element => normalize(element.textContent)).find(item => item.includes('包裹') && /[A-Z0-9]{8,}/i.test(item) && COMPANIES.some(company => item.includes(company))) || '';
  const packageMatch = packageText.match(/包裹\d*\s*(?:\(共\d+件\))?\s*([^\s]+?(?:速递|快递|物流|快运|邮政|EMS|顺丰|中通|圆通|申通|韵达|极兔|京东|德邦|菜鸟))\s+([A-Z0-9]{8,})/i);
  const logisticsCompany = valueAfterLabel(text, ['物流公司', '快递公司', '承运公司']) || (packageMatch && packageMatch[1]) || COMPANIES.find(company => text.includes(company)) || '';
  const trackingNumber = valueAfterLabel(text, ['运单号码', '运单号', '快递单号', '物流单号', '包裹单号']) || (packageMatch && packageMatch[2]) || '';
  const logisticsLine = Array.from(statusRoot.querySelectorAll('*')).map(element => normalize(element.textContent)).find(item => item.includes('查看物流详情') && item.includes('包裹')) || '';
  const detailMatch = logisticsLine.match(/已发货\s*(.+?)\s*查看物流详情/);
  const urlOrderId = new URL(location.href).searchParams.get('biz_order_id') || '';
  return {
    platformOrderId: urlOrderId || valueAfterLabel(text, ['订单编号', '订单号']),
    platformOrderStatus: exactElementTextMatches(ORDER_STATUS, statusRoot) || ORDER_STATUS.find(item => text.includes(item)) || '',
    logisticsStatus: valueAfterLabel(text, ['物流状态', '包裹状态', '配送状态']) || (detailMatch && detailMatch[1].trim()) || LOGISTICS_STATUS.find(item => text.includes(item)) || '',
    logisticsCompany: logisticsCompany || '',
    trackingNumber: trackingNumber || '',
    remark: location.href,
  };
})()
`;
