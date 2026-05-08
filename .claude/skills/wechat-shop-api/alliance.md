# Alliance / Preferred Alliance (优选联盟)

## Promoter Operations (带货者操作)

### 获取带货者详情信息 (Get Promoter Detail)
- **Path:** `/channels/ec/league/promoter/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | finder_username | string | No | Finder username (video account) |
  | alias | string | No | Finder alias |
  | openid | string | No | OpenID of the promoter |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | promoter | object | Promoter info including finder_username, alias, status, etc. |
- **Notes:** Provide at least one identifier (finder_username, alias, or openid). Error code 10000002 means promoter not found.

### 获取带货者列表 (Get Promoter List)
- **Path:** `/channels/ec/league/promoter/list/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | page_index | number | No | Page index, default 1 |
  | page_size | number | No | Page size, default 10, max 100 |
  | status | number | No | Filter by status |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | total_num | number | Total count |
  | promoters[] | array[object] | Promoter list with finder_username, alias, status, etc. |

### 获取带货者商品数据列表 (Get Promoter Product Data List)
- **Path:** `/channels/ec/league/talent/getproductdatalist`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | finder_username | string | No | Finder username |
  | alias | string | No | Finder alias |
  | openid | string | No | OpenID |
  | page_index | number | No | Page index, default 1 |
  | page_size | number | No | Page size, default 10 |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | total_num | number | Total count |
  | product_data_list[] | array[object] | Product data list with product_id, sale_amount, sale_count, etc. |
- **Notes:** Provides sales data per product for the specified promoter.

### 编辑带货者 (Edit Promoter)
- **Path:** `/channels/ec/league/talent/update`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | finder_username | string | No | Finder username |
  | alias | string | No | Finder alias |
  | openid | string | No | OpenID |
  | commission_ratio | number | No | Commission ratio (0-100) |
  | status | number | No | Promoter status (0=disabled, 1=enabled) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
- **Notes:** Provide at least one identifier. Can update commission ratio and enable/disable the promoter.

## Product Operations (商品操作)

### 批量新增联盟商品 (Batch Add Alliance Products)
- **Path:** `/channels/ec/league/item/batchadd`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | items[] | array[object] | Yes | Alliance product list, max 50 items per call |
  | items[].product_id | number | Yes | Product ID |
  | items[].commission_ratio | number | No | Commission ratio (0-100) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | results[] | array[object] | Per-item results with product_id and success/failure info |
- **Notes:** Max 50 products per batch. Duplicate product_ids are ignored.

### 删除联盟商品 (Delete Alliance Product)
- **Path:** `/channels/ec/league/item/delete`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | product_id | number | Yes | Product ID to remove from alliance |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |

### 获取联盟商品详情 (Get Alliance Product Detail)
- **Path:** `/channels/ec/league/item/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | product_id | number | Yes | Product ID |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | item | object | Alliance item details including product_id, commission_ratio, status, etc. |

### 批量新增联盟机构推广 (Batch Add Alliance Organization Promotion)
- **Path:** `/channels/ec/league/item/headsupplier/batchadd`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | items[] | array[object] | Yes | Organization promotion product list |
  | items[].product_id | number | Yes | Product ID |
  | items[].commission_ratio | number | No | Commission ratio |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | results[] | array[object] | Per-item results |
- **Notes:** For adding products to be promoted by alliance organizations/head suppliers.

### 获取联盟商品推广列表 (Get Alliance Product Promotion List)
- **Path:** `/channels/ec/league/item/list/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | page_index | number | No | Page index, default 1 |
  | page_size | number | No | Page size, default 10, max 100 |
  | status | number | No | Filter by status |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | total_num | number | Total count |
  | items[] | array[object] | Alliance product list with product_id, commission_ratio, status, etc. |

### 更新联盟商品信息 (Update Alliance Product)
- **Path:** `/channels/ec/league/item/upd`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | product_id | number | Yes | Product ID |
  | commission_ratio | number | No | New commission ratio (0-100) |
  | status | number | No | New status |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
- **Notes:** Updates commission ratio or status for an existing alliance product.
