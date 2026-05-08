# Product Management (商品管理)

## Products (商品)

### 添加商品 (Add Product)
- **Path:** `/channels/ec/product/add`
- **Method:** POST
- **Notes:** Creates draft product. Must call listing API to submit for review. SKU count > 25 triggers async update. Use `listing=1` to auto-submit. Images must use URLs from upload API (prefix `mmecimage.cn/p/`). Supports new multi-level category tree via `cats_v2`.
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | out_product_id | string | No | External platform product ID, max 128 chars, immutable after creation |
  | title | string | Yes | Product title, min 5 valid chars, max 60 chars. Must contain Chinese. Allowed special chars: `·~～!@#$%^&()！@#￥%……&*（）-_——=+[]【】、{}\|｜;'；':"'，。、<>?《》？` |
  | sub_title | string | No | Subtitle, max 18 chars |
  | head_imgs | string[] | Yes | Main images, 3-9 images (food/fresh categories need min 4). No duplicates. |
  | deliver_method | number | Yes | Delivery method: 0=express, 1=no shipping (phone), 3=no shipping (selectable account type). Default 0. |
  | deliver_acct_type | number[] | Yes | Delivery account types: 1=WeChat openid, 2=QQ, 3=phone, 4=email. Only when deliver_method=3. |
  | desc_info | object | No | Product description info |
  | desc_info.imgs | string[] | No | Detail images, 1-20 (food/fresh need min 3). No duplicates. |
  | desc_info.desc | string | No | Detail text |
  | cats | object[] | Yes | Legacy category array, always size 3 (level1/2/3). Use cats_v2 for new tree. |
  | cats[].cat_id | string(uint64) | Yes | Category ID from category API |
  | cats_v2 | object[] | No | New multi-level category tree. Array index maps to level (0=L1, last=leaf). |
  | cats_v2[].cat_id | string(uint64) | Yes | Category ID |
  | attrs | object[] | No | Product attributes. Some categories require specific attrs. |
  | attrs[].attr_key | string | Yes | Attribute key name |
  | attrs[].attr_value | string | Yes | Attribute value. select_many: `;` separated. integer_unit/decimal4_unit: `value unit`. integer/decimal4: number string. |
  | spu_code | string | No | Merchant custom product code |
  | brand_id | string(uint64) | No | Brand ID. "2100000000" = no brand. |
  | qualifications | string[] | No | Product qualification images, max 5. Deprecated, use product_qua_infos. |
  | product_qua_infos | object[] | No | Product qualification list |
  | product_qua_infos[].qua_id | string(uint64) | No | Qualification ID from category API |
  | product_qua_infos[].qua_url | string[] | No | Qualification images, max 10 per qua_id |
  | express_info | object | No | Shipping info. Not needed when deliver_method=1 or 3. |
  | express_info.template_id | string(uint64) | No | Freight template ID from template API |
  | express_info.weight | number | No | Product weight in grams. Required when template pricing is by weight. |
  | aftersale_desc | string | No | After-sale description, max 200 chars |
  | limited_info | object | No | Purchase limit info |
  | limited_info.period_type | number | No | Limit period: 0=none (default), 1=daily, 2=weekly, 3=monthly, 4=yearly |
  | limited_info.limited_buy_num | number | No | Purchase limit quantity |
  | extra_service | object | Yes | Service options |
  | extra_service.seven_day_return | number | Yes | 7-day return: 0=no, 1=yes, 2=yes (except custom), 3=yes (except after use) |
  | extra_service.freight_insurance | number | Yes | Freight insurance: 0=no, 1=yes |
  | extra_service.fake_one_pay_three | number | No | Fake-compensation: 0=no, 1=yes (pay 3x for fake) |
  | extra_service.damage_guarantee | number | No | Damage guarantee: 0=no, 1=yes (return for damage) |
  | skus | object[] | Yes | SKU list, 1-500 items |
  | skus[].out_sku_id | string | No | External SKU ID, max 128 chars, immutable |
  | skus[].thumb_img | string | No | SKU thumbnail image URL |
  | skus[].sale_price | number | Yes | Sale price in fen (分), max 1000000000 (10M yuan) |
  | skus[].stock_num | number | Yes | Stock quantity |
  | skus[].sku_code | string | No | Merchant custom SKU code, max 100 chars |
  | skus[].sku_attrs | object[] | Yes | Sale attributes. First SKU's key order determines detail page spec display order. |
  | skus[].sku_attrs[].attr_key | string | Yes | Attribute key (e.g. "Color", "Size"), max 40 chars |
  | skus[].sku_attrs[].attr_value | string | Yes | Attribute value. Same format rules as attrs[].attr_value. |
  | skus[].sku_deliver_info | object | No | SKU delivery info for pre-sale |
  | skus[].sku_deliver_info.stock_type | number | No | Stock type: 0=in-stock (default), 1=full-payment pre-sale |
  | skus[].sku_deliver_info.full_payment_presale_delivery_type | number | No | Delivery point for stock_type=1: 0=n days after payment, 1=n days after pre-sale ends |
  | skus[].sku_deliver_info.presale_begin_time | number | No | Pre-sale start time (unix seconds). Only for delivery_type=1. |
  | skus[].sku_deliver_info.presale_end_time | number | No | Pre-sale end time (unix seconds). Max 30 days from now. Max range 15 days. |
  | skus[].sku_deliver_info.full_payment_presale_delivery_time | number | No | Delivery days. For type=0: 4-15 days. For type=1: 1-3 days. |
  | listing | number | No | Auto-list after add: 1=yes, 0=no (default) |
  | after_sale_info | object | No | After-sale address config |
  | after_sale_info.after_sale_address_id | number | No | After-sale address ID from address management API |
  | size_chart | object | No | Size chart config |
  | size_chart.enable | bool | No | Enable size chart |
  | size_chart.specification_list | object[] | No | Size chart data (required when enabled) |
  | size_chart.specification_list[].name | string | Yes | Size attribute name |
  | size_chart.specification_list[].unit | string | Yes | Unit for size values |
  | size_chart.specification_list[].is_range | bool | Yes | Whether values are ranges |
  | size_chart.specification_list[].value_list | object[] | Yes | Size-to-attribute mapping list |
  | size_chart.specification_list[].value_list[].key | string | Yes | Size value, must match SKU size attribute |
  | size_chart.specification_list[].value_list[].value | string | No | Single value (when is_range=false), max 5 chars |
  | size_chart.specification_list[].value_list[].left | string | No | Range left bound (when is_range=true), max 5 chars |
  | size_chart.specification_list[].value_list[].right | string | No | Range right bound (when is_range=true), max 5 chars |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | data.product_id | string(uint64) | Product ID |
  | data.create_time | string | Creation time |
- **Error Codes:**
  | Code | Description |
  |------|-------------|
  | 10020008 | Product not editable |
  | 10020011 | Category length incorrect (expected 3 levels) |
  | 10020012 | Sale attribute invalid for category |
  | 10020013 | SKU count must be 1-500 |
  | 10020017 | Illegal category |
  | 10020018 | Merchant lacks category qualification |
  | 10020019 | Invalid freight template |
  | 10020020 | Title empty |
  | 10020021 | Title too long |
  | 10020022 | Head images empty |
  | 10020028 | SKU price too high |
  | 10020035 | Image URL invalid, must have prefix mmecimage.cn/p/ |
  | 10020038 | Listed product missing SKU |
  | 10020039 | SKU price is 0 |
  | 10020040 | Sale price > market price |
  | 10020048 | Category deposit insufficient, new products blocked |
  | 10020066 | Review quota exceeded (per hour) |
  | 10020067 | Async update in progress, cannot list |
  | 10020106 | Need at least 3 head images |
  | 10020107 | Need at least 1 detail image |
  | 10020108 | Category requires 7-day return |
  | 10020210 | Limited purchase stock cannot be 0 |

---

### 删除商品 (Delete Product)
- **Path:** `/channels/ec/product/delete`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | product_id | string(uint64) | Yes | 商品ID (Product ID) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
- **Notes:** Works for regular products and gifts. Cannot delete products with pending orders.

---

### 获取商品 (Get Product)
- **Path:** `/channels/ec/product/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | product_id | string(uint64) | Yes | 商品ID (Product ID) |
  | data_type | number | No | 数据类型: 1=线上数据(默认), 2=草稿数据, 3=同时获取线上和草稿 (Data type: 1=online default, 2=draft, 3=both) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
  | data.product | object | 商品信息 (Product info, same structure as add request) |
  | data.product.product_id | string(uint64) | 商品ID (Product ID) |
  | data.product.title | string | 标题 (Title) |
  | data.product.head_imgs | string[] | 主图列表 (Main images) |
  | data.product.cats | object[] | 类目 (Categories) |
  | data.product.skus | object[] | SKU列表 (SKU list) |
  | data.product.status | number | 商品状态 (Product status) |
  | data.product.edit_status | number | 编辑状态 (Edit status) |
- **Notes:** Returns full product object. Use data_type=1 to get live version.

---

### 获取商品列表 (Get Product List)
- **Path:** `/channels/ec/product/list/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | page_size | number | No | 每页数量, 默认10, 最大50 (Page size, default 10, max 50) |
  | next_key | string | No | 分页key, 首页不填 (Pagination key, omit for first page) |
  | status | number | No | 商品状态筛选 (Product status filter) |
  | start_create_time | number | No | 起始创建时间, 秒级时间戳 (Start create time, unix seconds) |
  | end_create_time | number | No | 截止创建时间, 秒级时间戳 (End create time, unix seconds) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
  | data.product_id_list | string[] | 商品ID列表 (Product ID list) |
  | data.next_key | string | 下一页分页key (Next page key) |
  | data.has_more | bool | 是否有下一页 (Has more pages) |
- **Notes:** Returns product IDs only, use product/get to fetch details.

---

### 更新商品 (Update Product)
- **Path:** `/channels/ec/product/update`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | product_id | string(uint64) | Yes | 商品ID (Product ID to update) |
  | title | string | No | 标题 (Title) |
  | sub_title | string | No | 副标题 (Subtitle) |
  | head_imgs | string[] | No | 主图 (Main images) |
  | desc_info | object | No | 商品描述 (Description info) |
  | cats | object[] | No | 类目 (Categories) |
  | cats_v2 | object[] | No | 新类目树 (New category tree) |
  | attrs | object[] | No | 商品参数 (Attributes) |
  | skus | object[] | No | SKU列表 (SKU list, same structure as add) |
  | brand_id | string(uint64) | No | 品牌ID (Brand ID) |
  | express_info | object | No | 运费信息 (Express info) |
  | extra_service | object | No | 服务选项 (Extra service options) |
  | limited_info | object | No | 限购信息 (Purchase limit info) |
  | after_sale_info | object | No | 售后信息 (After-sale info) |
  | size_chart | object | No | 尺码表 (Size chart) |
  | product_qua_infos | object[] | No | 商品资质 (Product qualifications) |
  | aftersale_desc | string | No | 售后说明 (After-sale description) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
  | data.product_id | string(uint64) | 商品ID (Product ID) |
  | data.create_time | string | 更新时间 (Update time) |
- **Notes:** Updates draft version only. Must call listing to submit for review. SKU count > 25 triggers async update. Same error codes as add product.

---

### 免审更新商品 (Audit-Free Update)
- **Path:** `/channels/ec/product/auditfree`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | product_id | string(uint64) | Yes | 商品ID (Product ID) |
  | skus | object[] | No | 需更新的SKU (SKUs to update) |
  | skus[].sku_id | string(uint64) | Yes | SKU ID |
  | skus[].sale_price | number | No | 售卖价格, 单位分 (Sale price in fen) |
  | skus[].stock_num | number | No | 库存数量 (Stock quantity) |
  | limited_info | object | No | 限购信息 (Purchase limit info) |
  | limited_info.period_type | number | No | 限购周期类型 (Limit period type) |
  | limited_info.limited_buy_num | number | No | 限购数量 (Limit quantity) |
  | after_sale_info | object | No | 售后地址 (After-sale address) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
- **Notes:** Only updates live version, does not affect draft. Limited to price, stock, purchase limits, and after-sale address.

---

### 上架商品 (List Product)
- **Path:** `/channels/ec/product/listing`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | product_id | string(uint64) | Yes | 商品ID (Product ID) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
- **Error Codes:**
  | Code | Description |
  |------|-------------|
  | 10020008 | Product not editable |
  | 10020052 | Product not found |
  | 10020066 | Hourly review quota exceeded |
  | 10020111 | Daily review quota exceeded |
  | 10020208 | Store listing banned |
- **Notes:** Submits draft for review. If async update in progress, returns 10020067.

---

### 下架商品 (Delist Product)
- **Path:** `/channels/ec/product/delisting`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | product_id | string(uint64) | Yes | 商品ID (Product ID) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
- **Notes:** Takes effect immediately. Product enters delisted state.

---

### 撤回商品审核 (Cancel Product Audit)
- **Path:** `/channels/ec/product/audit/cancel`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | product_id | string(uint64) | Yes | 商品ID (Product ID) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
- **Notes:** Only works when product is in "under review" status.

---

### 获取商品H5短链 (Get Product H5 Link)
- **Path:** `/channels/ec/product/h5url/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | product_id | string(uint64) | Yes | 商品ID (Product ID) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
  | data.h5_url | string | 商品H5页面链接 (Product H5 page URL) |
  | data.h5_url_with_wecom | string | 带企微参数的H5链接 (H5 URL with enterprise WeChat params) |
- **Notes:** Supports enterprise WeChat parameters.

---

### 获取商品口令 (Get Product Tag Link)
- **Path:** `/channels/ec/product/taglink/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | product_id | string(uint64) | Yes | 商品ID (Product ID) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
  | data.taglink | string | 商品微信口令 (Product WeChat tag/link text) |
  | data.taglink_with_wecom | string | 带企微参数的口令 (Tag link with enterprise WeChat params) |
- **Notes:** Supports enterprise WeChat parameters.

---

### 获取商品二维码 (Get Product QR Code)
- **Path:** `/channels/ec/product/qrcode/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | product_id | string(uint64) | Yes | 商品ID (Product ID) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
  | data.qrcode_url | string | 二维码图片URL (QR code image URL) |
  | data.qrcode_url_with_wecom | string | 带企微参数的二维码URL (QR code URL with enterprise WeChat params) |
- **Notes:** Supports enterprise WeChat parameters.

---

### 获取商品的移动应用跳转scheme码 (Get Product Scheme Code)
- **Path:** `/channels/ec/product/scheme/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | product_id | string(uint64) | Yes | 商品ID (Product ID) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
  | data.scheme | string | 移动应用跳转scheme码 (Mobile app jump scheme code) |
- **Notes:** Used for deep linking into WeChat mini program product page.

---

### 类目推荐 (Category Recommendation)
- **Path:** `/channels/ec/product/category/classify`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | title | string | No | 商品标题 (Product title) |
  | img_url | string | No | 商品图片URL (Product image URL) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
  | data.cats_list | object[][] | 推荐类目列表, 每项为类目数组 (Recommended category list) |
  | data.cats_list[][].cat_id | string(uint64) | 类目ID (Category ID) |
  | data.cats_list[][].name | string | 类目名称 (Category name) |
- **Notes:** Returns recommended categories based on title and/or image. At least one of title/img_url required.

---

### 商品立即开售 (Start Sale Immediately)
- **Path:** `/channels/ec/product/begintimingsale`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | product_id | string(uint64) | Yes | 商品ID (Product ID) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
- **Notes:** Starts timed sale immediately instead of waiting for scheduled time.

---

### 取消商品开售 (Cancel Timed Sale)
- **Path:** `/channels/ec/product/canceltimingsale`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | product_id | string(uint64) | Yes | 商品ID (Product ID) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
- **Notes:** Cancels a pending timed sale for the product.

---

### 站内外商品属性映射 (External Product Attribute Mapping)
- **Path:** `/channels/ec/product/externalproductmapping`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | cat_id | string(uint64) | Yes | 类目ID (Category ID) |
  | external_attrs | object[] | No | 外部属性列表 (External attribute list) |
  | external_attrs[].attr_key | string | Yes | 外部属性键 (External attribute key) |
  | external_attrs[].attr_value | string | Yes | 外部属性值 (External attribute value) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
  | data.attrs | object[] | 映射后的内部属性 (Mapped internal attributes) |
  | data.attrs[].attr_key | string | 属性键 (Attribute key) |
  | data.attrs[].attr_value | string | 属性值 (Attribute value) |
- **Notes:** Maps external platform attributes to WeChat Shop internal attributes for a given category.

---

### 发品前校验 (Pre-Publish Validation)
- **Path:** `/channels/ec/product/categoryprecheck`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | cat_ids | string[] | Yes | 类目ID列表 (Category ID list to validate) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
  | data.result | object | 校验结果 (Validation result) |
- **Notes:** Validates store publishing qualifications for given categories before submitting products.

---

### 获取商品上架策略 (Get Listing Strategy)
- **Path:** `/channels/ec/product/auditstrategy/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | (none) | - | - | 无请求体 (No request body, only access_token) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
  | data.strategy_type | number | 上架策略类型 (Listing strategy type) |
- **Notes:** Returns store-level listing strategy settings.

---

### 设置商品上架策略 (Set Listing Strategy)
- **Path:** `/channels/ec/product/auditstrategy/set`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | strategy_type | number | Yes | 上架策略类型 (Listing strategy type) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
- **Notes:** Strategy changes apply to all newly published products.

---

### 获取商品提审限额 (Get Audit Quota)
- **Path:** `/channels/ec/product/getauditquota`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | (none) | - | - | 无请求体 (No request body, only access_token) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
  | data.quota | number | 剩余提审次数 (Remaining review quota) |
  | data.total | number | 总提审次数 (Total review quota) |
- **Notes:** Returns current product audit quota information.

---

### 商品属性映射及推荐 (Enhanced Attribute Mapping)
- **Path:** `/channels/ec/product/externalproductmappingnew`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | cat_id | string(uint64) | Yes | 类目ID (Category ID) |
  | external_attrs | object[] | No | 外部属性列表 (External attributes) |
  | title | string | No | 商品标题 (Product title for recommendation) |
  | img_url | string | No | 商品图片URL (Product image URL) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
  | data.attrs | object[] | 映射后的属性列表 (Mapped attributes) |
  | data.sale_attrs | object[] | 映射后的销售属性列表 (Mapped sale attributes) |
- **Notes:** Enhanced version of externalproductmapping. Returns both regular and sale attributes.

---

### 商品品牌推荐 (Product Brand Recommendation)
- **Path:** `/channels/ec/product/productbrandrecommend`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | title | string | No | 商品标题 (Product title) |
  | cat_id | string(uint64) | No | 类目ID (Category ID) |
  | head_img | string | No | 商品主图 (Product main image) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
  | data.brand_list | object[] | 推荐品牌列表 (Recommended brand list) |
  | data.brand_list[].brand_id | string(uint64) | 品牌ID (Brand ID) |
  | data.brand_list[].brand_name | string | 品牌名称 (Brand name) |
- **Notes:** Recommends brands from store's qualified brands based on product info.

---

### 新增第三方货源信息 (Add Third-Party Source Info)
- **Path:** `/channels/ec/product/addproductthirdpartysource`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | product_id | string(uint64) | Yes | 商品ID (Product ID) |
  | source_info | object | Yes | 货源信息 (Source information) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
- **Notes:** Adds third-party supply source info to product.

---

## Stock (库存)

### 获取库存 (Get Stock)
- **Path:** `/channels/ec/product/stock/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | product_id | string(uint64) | Yes | 商品ID (Product ID) |
  | sku_id | string(uint64) | Yes | SKU ID |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
  | data.stock_num | number | 库存数量 (Stock quantity) |
  | data.sku_id | string(uint64) | SKU ID |
- **Notes:** Returns stock for a single SKU.

---

### 批量获取库存信息 (Batch Get Stock)
- **Path:** `/channels/ec/product/stock/batchget`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | product_id_list | string[] | Yes | 商品ID列表 (Product ID list, max 100) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
  | data.stocks | object[] | 库存列表 (Stock list) |
  | data.stocks[].product_id | string(uint64) | 商品ID (Product ID) |
  | data.stocks[].sku_stock_list | object[] | SKU库存列表 (SKU stock list) |
  | data.stocks[].sku_stock_list[].sku_id | string(uint64) | SKU ID |
  | data.stocks[].sku_stock_list[].stock_num | number | 库存数量 (Stock quantity) |
- **Notes:** Returns all SKU stock for given products. Max 100 product IDs per request.

---

### 获取库存流水 (Get Stock Flow)
- **Path:** `/channels/ec/product/stock/getflow`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | product_id | string(uint64) | Yes | 商品ID (Product ID) |
  | sku_id | string(uint64) | Yes | SKU ID |
  | page_index | number | No | 页码, 从0开始 (Page index, starts from 0) |
  | page_size | number | No | 每页数量, 默认10 (Page size, default 10) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
  | data.flows | object[] | 流水列表 (Flow list) |
  | data.flows[].type | number | 变动类型 (Change type) |
  | data.flows[].num | number | 变动数量 (Change quantity, positive=increase, negative=decrease) |
  | data.flows[].timestamp | number | 变动时间 (Change timestamp) |
  | data.flows[].order_id | string | 关联订单ID (Related order ID) |
  | data.total | number | 总记录数 (Total records) |
- **Notes:** Returns stock change history for a specific SKU.

---

### 快速更新库存 (Update Stock)
- **Path:** `/channels/ec/product/stock/update`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | product_id | string(uint64) | Yes | 商品ID (Product ID) |
  | sku_id | string(uint64) | Yes | SKU ID |
  | stock_num | number | Yes | 目标库存数量 (Target stock quantity, not delta) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
- **Notes:** Sets stock to absolute value (not increment/decrement). Takes effect immediately on live product.

---

## Gifts (赠品)

### 添加非卖商品 (Add Gift Product)
- **Path:** `/channels/ec/product/gift/add`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | title | string | Yes | 赠品标题 (Gift title) |
  | head_imgs | string[] | Yes | 主图列表 (Main images) |
  | desc_info | object | No | 描述信息 (Description info) |
  | skus | object[] | Yes | SKU列表 (SKU list, same structure as product) |
  | skus[].thumb_img | string | No | SKU小图 (SKU thumbnail) |
  | skus[].sale_price | number | Yes | 参考价格, 单位分 (Reference price in fen) |
  | skus[].stock_num | number | Yes | 库存 (Stock quantity) |
  | skus[].sku_attrs | object[] | Yes | 销售属性 (Sale attributes) |
  | express_info | object | No | 运费信息 (Express info, if shipping required) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
  | data.product_id | string(uint64) | 赠品ID (Gift product ID) |
  | data.create_time | string | 创建时间 (Creation time) |
- **Notes:** Creates a non-sellable gift product for use in gift activities.

---

### 更新非卖商品 (Update Gift Product)
- **Path:** `/channels/ec/product/gift/update`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | product_id | string(uint64) | Yes | 赠品ID (Gift product ID) |
  | title | string | No | 标题 (Title) |
  | head_imgs | string[] | No | 主图 (Main images) |
  | desc_info | object | No | 描述信息 (Description) |
  | skus | object[] | No | SKU列表 (SKU list) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
- **Notes:** Updates draft version of gift product. Same rules as product update.

---

### 在售商品转赠品 (Convert On-Sale Product to Gift)
- **Path:** `/channels/ec/product/gift/onsale/set`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | product_id | string(uint64) | Yes | 要转换的商品ID (Product ID to convert) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
- **Notes:** Converts an on-sale product to a gift product. Product must be delisted first.

---

### 获取赠品 (Get Gift)
- **Path:** `/channels/ec/product/gift/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | gift_id | string(uint64) | Yes | 赠品ID (Gift ID) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
  | data.product | object | 赠品信息 (Gift product info, same structure as product) |
- **Notes:** Returns gift product details.

---

### 获取赠品列表 (Get Gift List)
- **Path:** `/channels/ec/product/gift/list/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | page_size | number | No | 每页数量 (Page size, default 10) |
  | next_key | string | No | 分页key (Pagination key) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
  | data.gift_id_list | string[] | 赠品ID列表 (Gift ID list) |
  | data.next_key | string | 下一页key (Next page key) |
  | data.has_more | bool | 是否有下一页 (Has more) |
- **Notes:** Returns list of gift product IDs.

---

### 更新赠品库存 (Update Gift Stock)
- **Path:** `/channels/ec/product/gift/stock/update`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | gift_id | string(uint64) | Yes | 赠品ID (Gift ID) |
  | sku_id | string(uint64) | Yes | SKU ID |
  | stock_num | number | Yes | 目标库存数量 (Target stock quantity) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
- **Notes:** Sets gift stock to absolute value.

---

## Gift Promotions (买赠活动)

### 创建赠品活动 (Create Gift Activity)
- **Path:** `/channels/ec/product/activity/add`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | product_id | string(uint64) | Yes | 主商品ID (Main product ID) |
  | gift_id_list | string[] | Yes | 赠品ID列表 (Gift ID list) |
  | start_time | number | Yes | 活动开始时间, 秒级时间戳 (Activity start time, unix seconds) |
  | end_time | number | Yes | 活动结束时间, 秒级时间戳 (Activity end time, unix seconds) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
  | data.activity_id | string | 活动ID (Activity ID) |
- **Notes:** Creates a gift-with-purchase promotion. Main product must be listed.

---

### 删除赠品活动 (Delete Gift Activity)
- **Path:** `/channels/ec/product/activity/del`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | activity_id | string | Yes | 活动ID (Activity ID) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
- **Notes:** Deletes a gift activity. Only works for non-started activities.

---

### 停止赠品活动 (Stop Gift Activity)
- **Path:** `/channels/ec/product/activity/stop`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | activity_id | string | Yes | 活动ID (Activity ID) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
- **Notes:** Stops an active gift activity immediately.

---

## Flash Sale (商品限时抢购)

### 添加限时抢购任务 (Add Flash Sale Task)
- **Path:** `/channels/ec/product/limiteddiscounttask/add`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | product_id | string(uint64) | Yes | 商品ID (Product ID) |
  | sku_price_list | object[] | Yes | SKU抢购价格列表 (Flash sale SKU price list) |
  | sku_price_list[].sku_id | string(uint64) | Yes | SKU ID |
  | sku_price_list[].sale_price | number | Yes | 抢购价, 单位分 (Flash sale price in fen) |
  | start_time | number | Yes | 开始时间, 秒级时间戳 (Start time, unix seconds) |
  | end_time | number | Yes | 结束时间, 秒级时间戳 (End time, unix seconds) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
  | data.task_id | string | 任务ID (Task ID) |
- **Notes:** Flash sale price must be lower than current sale price.

---

### 获取限时抢购任务列表 (Get Flash Sale Task List)
- **Path:** `/channels/ec/product/limiteddiscounttask/list/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | page_size | number | No | 每页数量 (Page size, default 10) |
  | next_key | string | No | 分页key (Pagination key) |
  | status | number | No | 任务状态筛选 (Task status filter) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
  | data.task_list | object[] | 任务列表 (Task list) |
  | data.task_list[].task_id | string | 任务ID (Task ID) |
  | data.task_list[].product_id | string(uint64) | 商品ID (Product ID) |
  | data.task_list[].status | number | 任务状态 (Task status) |
  | data.task_list[].start_time | number | 开始时间 (Start time) |
  | data.task_list[].end_time | number | 结束时间 (End time) |
  | data.next_key | string | 下一页key (Next page key) |
  | data.has_more | bool | 是否有下一页 (Has more) |
- **Notes:** Returns list of flash sale tasks.

---

### 停止限时抢购任务 (Stop Flash Sale Task)
- **Path:** `/channels/ec/product/limiteddiscounttask/stop`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | task_id | string | Yes | 任务ID (Task ID) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
- **Notes:** Stops an active flash sale task immediately.

---

### 删除限时抢购任务 (Delete Flash Sale Task)
- **Path:** `/channels/ec/product/limiteddiscounttask/delete`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | task_id | string | Yes | 任务ID (Task ID) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
- **Notes:** Deletes a flash sale task. Only works for not-started tasks.

---

## Product Status Enum (商品线上状态)

| Status | Description |
|--------|-------------|
| 0 | 初始值 (Initial) |
| 5 | 上架 (Listed) |
| 6 | 回收站 (Recycle bin) |
| 9 | 彻底删除 (Permanently deleted) |
| 11 | 自主下架 (Voluntarily delisted) |
| 13 | 违规下架/风控系统下架 (Banned/risk control delisted) |
| 14 | 保证金不足下架 (Deposit insufficient delisted) |
| 15 | 品牌过期下架 (Brand expired delisted) |
| 20 | 商品被封禁 (Product banned) |

## Edit Status Enum (商品草稿状态)

| Status | Description |
|--------|-------------|
| 0 | 初始值 (Initial) |
| 1 | 编辑中 (Editing) |
| 2 | 审核中 (Under review) |
| 3 | 审核失败 (Review failed) |
| 4 | 审核成功 (Review passed) |
| 7 | 异步提交上传中 (Async uploading, listing returns 10020067) |
| 8 | 异步提交上传失败 (Async upload failed, resubmit) |
