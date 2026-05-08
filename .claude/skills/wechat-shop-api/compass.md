# Compass Merchant (罗盘商家版)

### 获取授权视频号列表 (Get Authorized Channels List)
- **Path:** `/channels/ec/compass/shop/finder/authorization/list/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | page_index | number | No | Page index, default 1 |
  | page_size | number | No | Page size, default 10 |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | total_num | number | Total count |
  | finders[] | array[object] | Authorized finder list with finder_username, alias, authorization status, etc. |
- **Notes:** Returns the list of video channels (finders) that have authorized the shop.

### 获取带货达人列表 (Get Influencer List)
- **Path:** `/channels/ec/compass/shop/finder/list/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | page_index | number | No | Page index, default 1 |
  | page_size | number | No | Page size, default 10 |
  | start_time | number | No | Query start date (YYYYMMDD format as number) |
  | end_time | number | No | Query end date (YYYYMMDD format as number) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | total_num | number | Total count |
  | finders[] | array[object] | Influencer list with finder_username, sale_amount, sale_count, etc. |

### 获取带货数据概览 (Get Sales Overview)
- **Path:** `/channels/ec/compass/shop/finder/overall/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | start_time | number | Yes | Query start date (YYYYMMDD format) |
  | end_time | number | Yes | Query end date (YYYYMMDD format) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | data | object | Overview data including total_sale_amount, total_sale_count, total_order_count, etc. |

### 获取带货达人商品列表 (Get Influencer Product List)
- **Path:** `/channels/ec/compass/shop/finder/product/list/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | finder_username | string | Yes | Finder username |
  | page_index | number | No | Page index, default 1 |
  | page_size | number | No | Page size, default 10 |
  | start_time | number | No | Query start date |
  | end_time | number | No | Query end date |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | total_num | number | Total count |
  | products[] | array[object] | Product list with product_id, sale_amount, sale_count, etc. |

### 获取带货达人详情 (Get Influencer Detail)
- **Path:** `/channels/ec/compass/shop/finder/product/overall/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | finder_username | string | Yes | Finder username |
  | start_time | number | Yes | Query start date |
  | end_time | number | Yes | Query end date |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | data | object | Influencer detail including sale_amount, sale_count, product_count, etc. |

### 获取店铺开播列表 (Get Live Stream List)
- **Path:** `/channels/ec/compass/shop/live/list/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | page_index | number | No | Page index, default 1 |
  | page_size | number | No | Page size, default 10 |
  | start_time | number | No | Query start date |
  | end_time | number | No | Query end date |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | total_num | number | Total count |
  | lives[] | array[object] | Live stream list with live_id, start_time, end_time, sale_amount, viewer_count, etc. |

### 获取电商数据概览 (Get E-Commerce Overview)
- **Path:** `/channels/ec/compass/shop/overall/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | start_time | number | Yes | Query start date (YYYYMMDD format) |
  | end_time | number | Yes | Query end date (YYYYMMDD format) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | data | object | E-commerce overview including total_sale_amount, total_order_count, total_uv, total_pv, etc. |
- **Notes:** Provides overall e-commerce metrics for the shop within the specified time range.

### 获取商品详细信息 (Get Product Data Detail)
- **Path:** `/channels/ec/compass/shop/product/data/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | product_id | number | Yes | Product ID |
  | start_time | number | Yes | Query start date |
  | end_time | number | Yes | Query end date |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | data | object | Product detail data including sale_amount, sale_count, uv, pv, cart_count, etc. |

### 获取商品列表 (Get Product List)
- **Path:** `/channels/ec/compass/shop/product/list/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | page_index | number | No | Page index, default 1 |
  | page_size | number | No | Page size, default 10 |
  | start_time | number | No | Query start date |
  | end_time | number | No | Query end date |
  | sort_key | number | No | Sort field |
  | sort_order | number | No | Sort order: 0=desc, 1=asc |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | total_num | number | Total count |
  | products[] | array[object] | Product list with product_id, title, sale_amount, sale_count, etc. |

### 获取店铺人群数据 (Get Customer Profile Data)
- **Path:** `/channels/ec/compass/shop/sale/profile/data/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | start_time | number | Yes | Query start date |
  | end_time | number | Yes | Query end date |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | data | object | Customer profile data |
  | data.gender_list[] | array[object] | 性别分布, 含 gender(0=未知,1=男,2=女), user_cnt, user_ratio |
  | data.age_list[] | array[object] | 年龄分布, 含 age_range(年龄段区间), user_cnt, user_ratio |
  | data.region_list[] | array[object] | 地区分布, 含 province, city, user_cnt, user_ratio |
  | data.platform_list[] | array[object] | 平台分布, 含 platform(来源平台), user_cnt, user_ratio |
- **Notes:** user_ratio为占比百分比值(如 45.5 表示45.5%)。
