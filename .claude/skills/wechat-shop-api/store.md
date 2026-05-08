# Store Management (店铺管理)

### 获取店铺基本信息 (Get Store Basic Info)
- **Path:** `/channels/ec/basics/info/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | (none) | - | - | 无请求体 (No request body required, only access_token) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
  | shop_info | Object | 店铺信息 (Store information) |
  | shop_info.shop_name | String | 店铺名称 (Store name) |
  | shop_info.shop_type | Number | 店铺类型 (Store type) |
  | shop_info.shop_status | Number | 店铺状态 (Store status) |
  | shop_info.bind_time | Number | 绑定时间 (Binding time) |
- **Notes:** Returns basic store information including name, type, and status

---

### 获取店铺H5链接 (Get Store H5 Link)
- **Path:** `/channels/ec/basics/shop/h5url/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | (none) | - | - | 无请求体 (No request body required, only access_token) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
  | h5_url | String | 店铺 H5 页面链接 (Store H5 page URL) |
  | h5_url_with_wecom | String | 带企业微信参数的 H5 链接 (H5 URL with enterprise WeChat params) |
- **Notes:** Supports enterprise WeChat parameters

---

### 获取店铺二维码 (Get Store QR Code)
- **Path:** `/channels/ec/basics/shop/qrcode/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | (none) | - | - | 无请求体 (No request body required, only access_token) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
  | qrcode_url | String | 二维码图片 URL (QR code image URL) |
  | qrcode_url_with_wecom | String | 带企业微信参数的二维码 URL (QR code URL with enterprise WeChat params) |
- **Notes:** Supports enterprise WeChat parameters

---

### 获取店铺口令 (Get Store Tag Link)
- **Path:** `/channels/ec/basics/shop/taglink/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | (none) | - | - | 无请求体 (No request body required, only access_token) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
  | taglink | String | 店铺微信口令 (Store WeChat tag/link text) |
  | taglink_with_wecom | String | 带企业微信参数的口令 (Tag link with enterprise WeChat params) |
- **Notes:** Supports enterprise WeChat parameters
