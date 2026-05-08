# General (通用)

## Token & Access Management

### 获取接口调用凭据 (Get Access Token)
- **Path:** `/cgi-bin/token`
- **Method:** GET
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | grant_type | String | Yes | 填写 client_credential (Must be "client_credential") |
  | appid | String | Yes | 第三方用户唯一凭证 (App ID) |
  | secret | String | Yes | 第三方用户唯一凭证密钥 (App Secret) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | access_token | String | 获取到的凭证 (Access token) |
  | expires_in | Number | 凭证有效时间，单位秒，默认 7200 (Expiration in seconds, default 7200) |
- **Error Codes:**
  | Code | Description |
  |------|-------------|
  | -1 | 系统繁忙，此时请开发者稍候再试 (System busy, retry later) |
  | 40001 | AppSecret 错误或者 AppSecret 不属于这个公众号 (Invalid AppSecret) |
  | 40002 | 请确保 grant_type 字段值为 client_credential (Invalid grant_type) |
  | 40013 | 不合法的 AppID (Invalid AppID) |
- **Notes:** Must cache token, do not call frequently. Token is valid for 7200 seconds (2 hours).

---

### 获取稳定版接口调用凭据 (Get Stable Access Token)
- **Path:** `/cgi-bin/stable_token`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | grant_type | String | Yes | 填写 client_credential (Must be "client_credential") |
  | appid | String | Yes | AppID |
  | secret | String | Yes | AppSecret |
  | force_refresh | Bool | No | 是否强制刷新，默认 false (Force refresh, default false) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | access_token | String | 获取到的凭证 (Access token) |
  | expires_in | Number | 凭证有效时间，单位秒 (Expiration in seconds) |
- **Notes:** Isolated from regular getAccessToken. Use force_refresh=true only when token is expired.

---

### 查询API调用额度 (Query API Quota)
- **Path:** `/cgi-bin/openapi/quota/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | access_token | String | Yes | 接口调用凭证 (Access token, passed as query param) |
  | cgi_path | String | Yes | API 路径，例如 `/channels/ec/product/add` (API path to query) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
  | quota | Object | 额度信息 (Quota info) |
  | quota.daily_limit | Number | 当日该账号可调用该接口的次数上限 (Daily limit) |
  | quota.used | Number | 已经调用的次数 (Used count) |
  | quota.remaining | Number | 剩余调用次数 (Remaining count) |
- **Notes:** Returns daily quota, call count, and frequency limit for a specific API

---

### 查询rid信息 (Query RID Info)
- **Path:** `/cgi-bin/openapi/rid/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | access_token | String | Yes | 接口调用凭证 (Access token, passed as query param) |
  | rid | String | Yes | 调用接口报错返回的 rid (Request ID from error response) |
  | start_time | Number | No | 查询开始时间戳 (Query start timestamp) |
  | end_time | Number | No | 查询结束时间戳 (Query end timestamp) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
  | request | Object | 请求信息 (Request info including invoke params, cost time, etc.) |
- **Notes:** Use this API to debug API error RIDs and retrieve detailed request information

---

### 重置API调用次数 (Reset API Quota - via token)
- **Path:** `/cgi-bin/clear_quota`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | access_token | String | Yes | 接口调用凭证 (Access token, passed as query param) |
  | appid | String | Yes | AppID |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
- **Notes:** Resets ALL API call quotas for the account. Use sparingly.

---

### 重置指定API调用次数 (Reset Specific API Quota)
- **Path:** `/cgi-bin/openapi/quota/clear`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | access_token | String | Yes | 接口调用凭证 (Access token, passed as query param) |
  | cgi_path | String | Yes | 需要重置的 API 路径 (API path to reset quota for) |
  | appid | String | Yes | AppID |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
- **Notes:** Resets quota for a specific API endpoint only

---

### 使用AppSecret重置API调用次数 (Reset API Quota - via AppSecret)
- **Path:** `/cgi-bin/clear_quota/v2`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | appid | String | Yes | AppID |
  | appsecret | String | Yes | AppSecret |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
- **Notes:** Alternative method to reset quota using AppSecret directly without access_token

---

### 网络通信检测 (Network Check)
- **Path:** `/cgi-bin/callback/check`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | access_token | String | Yes | 接口调用凭证 (Access token, passed as query param) |
  | action | String | No | 检测类型: all/dns/ping (Check type, default "all") |
  | check_operator | String | No | 检测平台: DEFAULT/CHINANET/UNICOM/CAPITAL (Platform, default "DEFAULT") |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
  | dns | Array | DNS 检测结果 (DNS check results) |
  | ping | Array | Ping 检测结果 (Ping check results) |
- **Notes:** Use to debug callback connection issues between your server and WeChat

---

### 获取微信API服务器IP (Get WeChat API Server IPs)
- **Path:** `/cgi-bin/get_api_domain_ip`
- **Method:** GET
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | access_token | String | Yes | 接口调用凭证 (Access token, passed as query param) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
  | ip_list | Array\<String\> | 微信 API 服务器 IP 地址列表 (WeChat API server IP list) |
- **Notes:** Returns IP list of WeChat API servers for firewall/whitelist configuration

---

### 获取微信推送服务器IP (Get WeChat Push Server IPs)
- **Path:** `/cgi-bin/getcallbackip`
- **Method:** GET
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | access_token | String | Yes | 接口调用凭证 (Access token, passed as query param) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
  | ip_list | Array\<String\> | 微信推送服务器 IP 地址列表 (WeChat push server IP list) |
- **Notes:** Returns IP list of WeChat push servers for callback verification
