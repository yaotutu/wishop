export const OPEN_CHECKOUT_ADDRESS_EDITOR_SCRIPT = String.raw`
(async () => {
  const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const isVisible = (element) => {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  };
  const editorTexts = ['使用新地址', '新增地址', '添加地址', '添加收货地址', '新建地址'];
  const existingFrame = document.querySelector('iframe[src*="/member/fresh/deliver_address_frame.htm"]');
  if (existingFrame) return { opened: true, reason: '地址表单已打开', url: location.href };
  const target = Array.from(document.querySelectorAll('button, a, span, div, [role="button"]'))
    .filter(isVisible)
    .find(element => editorTexts.some(text => normalize(element.textContent) === text));
  if (!target) {
    return { opened: false, reason: '当前页面未找到“使用新地址/新增地址”入口', url: location.href, title: document.title };
  }
  target.click();
  return { opened: true, reason: '已点击新地址入口', url: location.href };
})()
`;

export const ADDRESS_FILL_SCRIPT = String.raw`
async (address) => {
  const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const isVisible = (element) => {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  };
  const normalizeAddressPart = (value) => normalize(value || '').replace(/\s+/g, '');
  const PLACEHOLDER_CITY_NAMES = new Set(['市辖区', '县', '省直辖县级行政区划']);
  const NO_STREET_OPTION_TEXTS = ['暂不选择', '暂不选择街道', '不选择', '无街道', '其他'];
  const addressCandidates = (value) => {
    const normalized = normalizeAddressPart(value);
    if (!normalized) return [];
    if (normalized === '暂不选择') return NO_STREET_OPTION_TEXTS;
    const suffixless = normalized
      .replace(/(维吾尔自治区|壮族自治区|回族自治区|自治区|特别行政区|自治州|地区|林区|新区|省|市|区|县|镇|乡|街道|盟)$/u, '');
    const citySuffix = normalized.endsWith('市') ? normalized.slice(0, -1) : '';
    return Array.from(new Set([normalized, suffixless, citySuffix].filter(Boolean)));
  };
  const inferStreetName = (addr) => {
    const text = String((addr.county_name || '') + (addr.detail_info || '') + (addr.house_number || ''));
    const match = text.match(/([\u4e00-\u9fa5A-Za-z0-9]+?(?:街道|镇|乡|苏木|民族乡|开发区|工业园区|园区|农场))/u);
    return match && match[1] ? match[1] : '';
  };
  const stripLeadingDivisionNames = (text, divisions) => {
    let next = normalize(text);
    for (let attempt = 0; attempt < 4; attempt++) {
      const previous = next;
      for (const division of divisions) {
        const normalized = normalizeAddressPart(division);
        if (!normalized) continue;
        const matched = addressCandidates(normalized).sort((a, b) => b.length - a.length).find(candidate => next.startsWith(candidate));
        if (matched) {
          next = next.slice(matched.length).trim();
          break;
        }
      }
      if (next === previous) break;
    }
    return next || normalize(text);
  };
  const normalizeCheckoutAddress = (addr) => {
    const warnings = [];
    const province = normalizeAddressPart(addr.province_name);
    const city = normalizeAddressPart(addr.city_name);
    const county = normalizeAddressPart(addr.county_name);
    const street = normalizeAddressPart(inferStreetName(addr));
    const divisions = [];
    if (province) divisions.push({ label: '省', value: province });
    if (city && !PLACEHOLDER_CITY_NAMES.has(city)) {
      divisions.push({ label: '市', value: city });
      if (county && county !== city) divisions.push({ label: '区县', value: county });
    } else if (county) {
      divisions.push({ label: '市/区县', value: county });
    } else if (city) {
      warnings.push('已忽略微信地址占位城市：' + city);
    }
    if (street) {
      const lastDivision = divisions[divisions.length - 1] && divisions[divisions.length - 1].value;
      if (street !== lastDivision) divisions.push({ label: '街道', value: street });
    } else {
      divisions.push({ label: '街道', value: '暂不选择' });
    }
    const virtual = addr.virtual_number_info;
    const extension = virtual && virtual.extension ? String(virtual.extension).trim() : '';
    const phone = virtual && virtual.virtual_number
      ? String(virtual.virtual_number).trim()
      : String(addr.purchaser_tel_number || addr.tel_number || addr.virtual_order_tel_number || '').trim();
    const name = extension ? String((addr.user_name || '') + ' [拨打后输入分机号' + extension + ']').trim() : String(addr.user_name || '');
    const rawDetail = String((addr.detail_info || '') + (addr.house_number || ''));
    const fullLine = String((addr.province_name || '') + (addr.city_name || '') + (addr.county_name || '') + (addr.detail_info || '') + (addr.house_number || ''));
    const detail = stripLeadingDivisionNames(rawDetail || fullLine, divisions.map(item => item.value));
    return { divisions, detail, name, phone, warnings };
  };
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  const waitForElement = async (selector, label) => {
    for (let attempt = 0; attempt < 40; attempt++) {
      const element = Array.from(document.querySelectorAll(selector)).find(isVisible);
      if (element) return element;
      await sleep(120);
    }
    result.warnings.push('未找到' + label);
    return null;
  };
  const result = { filledFields: [], warnings: [] };
  const normalized = normalizeCheckoutAddress(address);
  result.warnings.push(...normalized.warnings);
  const setValue = async (selector, value, label) => {
    const el = await waitForElement(selector, label + '输入框');
    if (!el) {
      return;
    }
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
    descriptor && descriptor.set ? descriptor.set.call(el, value) : (el.value = value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    result.filledFields.push(label);
  };
  const waitForOption = async (candidates) => {
    for (let attempt = 0; attempt < 20; attempt++) {
      const option = Array.from(document.querySelectorAll('.cndzk-entrance-division-box-content-tag'))
        .filter(isVisible)
        .find(element => candidates.some(candidate => normalizeAddressPart(element.textContent) === candidate));
      if (option) return option;
      await sleep(120);
    }
    return null;
  };
  await waitForElement('input#fullName[name="fullName"], input[name="fullName"], input#mobile[name="mobile"], input[name="mobile"], .cndzk-entrance-associate-area-textarea, textarea, .cndzk-entrance-division-header-click', '地址表单控件');
  const trigger = Array.from(document.querySelectorAll('.cndzk-entrance-division-header-click')).find(isVisible);
  if (!trigger) {
    result.warnings.push('未找到省市区街道选择器');
  } else {
    trigger.click();
    await sleep(180);
    for (const division of normalized.divisions) {
      const candidates = addressCandidates(division.value);
      const option = await waitForOption(candidates);
      if (!option) {
        result.warnings.push('未找到' + division.label + '：' + division.value);
        continue;
      }
      option.click();
      result.filledFields.push(division.label);
      await sleep(220);
    }
  }
  await setValue('.cndzk-entrance-associate-area-textarea, textarea', normalized.detail, '详细地址');
  await setValue('input#fullName[name="fullName"], input[name="fullName"]', normalized.name, '收货人');
  await setValue('input#mobile[name="mobile"], input[name="mobile"]', normalized.phone, '手机号');
  return result;
}
`;
