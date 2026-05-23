export const REFUND_PREPARE_SCRIPT = String.raw`
((input) => {
  const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const visibleText = (root) => normalize(root && (root.innerText || root.textContent));
  const textContent = (root) => normalize(root && root.textContent);
  const urlOrderId = new URL(location.href).searchParams.get('bizOrderId') || '';
  if (!(location.hostname === 'refund2.taobao.com' && location.pathname.includes('/dispute/apply.htm'))) {
    throw new Error('当前页面不是淘宝退款申请页');
  }
  if (input.platformOrderId && urlOrderId && input.platformOrderId !== urlOrderId) {
    throw new Error('淘宝退款页订单号不匹配：当前 ' + urlOrderId + '，期望 ' + input.platformOrderId);
  }
  const reasonRoot = Array.from(document.querySelectorAll('.mod-select-pc')).find(select => textContent(select.querySelector('.select-title')).includes('退款原因'));
  if (!reasonRoot) throw new Error('未找到淘宝退款原因下拉框');
  const selectedWrap = reasonRoot.querySelector('.selected-wrap');
  const selectedReason = visibleText(selectedWrap);
  if (selectedReason !== input.reason) {
    selectedWrap && selectedWrap.click();
    const option = Array.from(reasonRoot.querySelectorAll('.options-item')).find(item => visibleText(item) === input.reason);
    if (!option) throw new Error('退款原因列表中没有“' + input.reason + '”');
    option.click();
  }
  const submitButton = document.querySelector('#submitButtonContainer_1 .button-item') || Array.from(document.querySelectorAll('.button-item, [role="button"], button')).find(element => visibleText(element) === '提交');
  const amountInput = document.querySelector('#applyRefundFeeInput_1-input');
  const snapshot = {
    platformOrderId: input.platformOrderId || urlOrderId,
    selectedReason: visibleText(reasonRoot.querySelector('.selected-wrap')) || input.reason,
    refundAmountText: amountInput && amountInput.value ? amountInput.value.trim() : '',
    submitReady: !!submitButton && !submitButton.classList.contains('disabled'),
    url: location.href,
  };
  if (input.autoSubmit) {
    if (!snapshot.submitReady || !submitButton) throw new Error('淘宝提交按钮尚未就绪');
    submitButton.click();
    snapshot.autoSubmitted = true;
  }
  return snapshot;
})
`;
