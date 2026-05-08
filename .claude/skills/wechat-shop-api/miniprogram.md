# Mini Program Connection (连接小程序)

## Basics (基础)

### 获取文件下载链接 (Get File Download URL)
- **Path:** `/channels/ec/open/get_download_url`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | file_id | string | Yes | File ID to download |
  | expire_time | number | No | URL expiration time in seconds |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | url | string | Temporary download URL |
  | expire_time | number | URL expiration time |
- **Notes:** Returns a temporary download URL for the specified file. The URL has a limited validity period.

### 上传资料 (Upload Material)
- **Path:** `/channels/ec/open/upload`
- **Method:** POST
- **Request Parameters:** (multipart/form-data)
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | media | file | Yes | File to upload |
  | file_type | number | No | File type indicator |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | file_id | string | Uploaded file ID |
- **Notes:** Used for uploading custom product fulfillment files. The returned file_id can be used in subsequent API calls.

## Gift Sending via Mini Program (合作商家为小程序发放礼物)

### 查询小店礼物活动列表 (Get Store Gift Activity List)
- **Path:** `/channels/ec/b2c/activity/list/promoter/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | page_index | number | No | Page index, default 1 |
  | page_size | number | No | Page size, default 10 |
  | status | number | No | Filter by activity status |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | total_num | number | Total count |
  | activities[] | array[object] | Gift activity list with activity_id, product_id, status, etc. |

### 查询礼物活动详情 (Get Gift Activity Detail)
- **Path:** `/channels/ec/b2c/activity/info/promoter/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | activity_id | number | Yes | Activity ID |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | activity | object | Activity detail including product info, gift rules, status, etc. |

### 指定礼物收礼者 (Set Gift Recipient)
- **Path:** `/channels/ec/order/presentorder/receiver/set`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | activity_id | number | Yes | Activity ID |
  | order_id | string | No | Order ID |
  | receiver_openid | string | Yes | Recipient's OpenID |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
- **Notes:** Sets the designated recipient for a gift order. The recipient must be a WeChat user.

### 创建并发送礼物 (Create and Send Gift)
- **Path:** `/channels/ec/order/presentorder/create`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | activity_id | number | Yes | Activity ID |
  | product_id | number | Yes | Product ID |
  | sku_id | number | Yes | SKU ID |
  | receiver_openid | string | No | Recipient OpenID (if already set) |
  | buyer_message | string | No | Gift message from buyer |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | order_id | string | Created gift order ID |
- **Notes:** Creates a gift order and sends it to the specified recipient.

### 查询礼物订单列表 (Get Gift Order List)
- **Path:** `/channels/ec/order/presentlist/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | page_index | number | No | Page index, default 1 |
  | page_size | number | No | Page size, default 10 |
  | start_time | number | No | Start time filter |
  | end_time | number | No | End time filter |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | total_num | number | Total count |
  | orders[] | array[object] | Gift order list |

### 查询收礼者订单列表 (Get Recipient Order List)
- **Path:** `/channels/ec/order/receiverorderlist/get`
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
  | orders[] | array[object] | Recipient order list |

### 查询礼物订单详情 (Get Gift Order Detail)
- **Path:** `/channels/ec/order/present/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | order_id | string | Yes | Gift order ID |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | order | object | Gift order detail including sender info, recipient info, product info, status, etc. |
