# Quality Inspection Management (质检管理)

### 查询质检仓配置 (Get QIC Warehouse Config)
- **Path:** `/channels/ec/qic/inspect/config/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | access_token | String | Yes | 接口调用凭证 (Access token, passed as query param) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
  | warehouse_list | Array | 质检仓列表 (QIC warehouse list with config details) |
- **Notes:** Returns available quality inspection warehouse configurations

---

### 查询送检配置模板信息 (Get Inspection Submit Config Template)
- **Path:** `/channels/ec/qic/inspect/submitconfig/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | access_token | String | Yes | 接口调用凭证 (Access token, passed as query param) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
  | template_info | Object | 送检配置模板信息 (Template info) |
- **Template Info Contents:**
  - Warehouse list (质检仓列表)
  - Agency list (检测机构列表)
  - Express company list (快递公司列表)
  - Product info templates (商品模板)
  - Insurance type list (保险类型列表)

---

### 打印质检码 (Print QC Code)
- **Path:** `/channels/ec/qic/inspect/code/print`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | access_token | String | Yes | 接口调用凭证 (Access token, passed as query param) |
  | inspection_id | String | Yes | 送检记录 ID (Inspection record ID) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
  | code_url | String | 质检码 URL (QC code URL/image) |
- **Notes:** Must bind inspection info first (via submit API) before printing the QC code

---

### 绑定送检信息 (Bind Inspection Info)
- **Path:** `/channels/ec/qic/inspect/submit`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | access_token | String | Yes | 接口调用凭证 (Access token, passed as query param) |
  | product_id | String | Yes | 商品 SPU ID |
  | sku_id | String | Yes | 商品 SKU ID |
  | warehouse_id | String | Yes | 质检仓 ID (QIC warehouse ID) |
  | agency_id | String | Yes | 检测机构 ID (Inspection agency ID) |
  | express_company_id | String | Yes | 快递公司 ID (Express company ID) |
  | count | Number | Yes | 送检数量 (Inspection quantity) |
  | insurance_type | Number | No | 保险类型 (Insurance type) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
  | inspection_id | String | 送检记录 ID (Inspection record ID) |
- **Notes:** Binds inspection information to a product, required before printing QC codes

---

### 自寄快递送检 (Self-Ship for Inspection)
- **Path:** `/channels/ec/qic/inspect/register_logistics`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | access_token | String | Yes | 接口调用凭证 (Access token, passed as query param) |
  | inspection_id | String | Yes | 送检记录 ID (Inspection record ID) |
  | waybill_id | String | Yes | 快递单号 (Tracking number) |
  | delivery_id | String | Yes | 快递公司 ID (Express company ID) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
- **Notes:** Register or modify self-shipping express info for inspection. Maximum 3 modifications allowed.
