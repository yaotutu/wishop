# Membership (会员管理)

## Store Members (小店会员)

### 获取用户积分 (Get User Points)
- **Path:** `/channels/ec/vip/user/score/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | openid | string | Yes | User's openid |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | score | number | Current points balance |
  | total_score | number | Total accumulated points |
- **Notes:** Returns the current points balance and total accumulated points for the specified user.

### 获取用户信息 (Get User Info)
- **Path:** `/channels/ec/vip/user/info/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | openid | string | Yes | User's openid |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | user_info | object | User membership info including level, score, join_time, etc. |

### 获取用户列表 (Get User List)
- **Path:** `/channels/ec/vip/user/list/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | page_index | number | No | Page index, default 1 |
  | page_size | number | No | Page size, default 10, max 100 |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | total_num | number | Total count |
  | users[] | array[object] | User list with openid, nickname, level, score, etc. |

### 获取用户积分流水 (Get User Points Flow)
- **Path:** `/channels/ec/vip/user/score/flowrecord/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | openid | string | Yes | User's openid |
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
  | flow_records[] | array[object] | Points flow records with type, amount, description, time, etc. |

## Mini Program Store (小店关联小程序)

### 小店获取关联小程序信息 (Get Associated Mini Program Info)
- **Path:** `/channels/ec/vip/v3/wxa/info/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | (none) | - | - | No request body required |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | wxa_info | object | Mini program info including appid, nickname, status, etc. |
- **Notes:** Returns the mini program associated with the current shop for membership services.

## Mini Program Members (小程序会员服务)

### 新增小程序会员信息 (Add Mini Program Member)
- **Path:** `/wxa/vip/user/info/add`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | openid | string | Yes | User's openid |
  | nickname | string | No | Member nickname |
  | phone | string | No | Phone number |
  | birthday | string | No | Birthday (YYYY-MM-DD format) |
  | gender | number | No | Gender: 0=unknown, 1=male, 2=female |
  | custom_user_data | object | No | Custom user data fields |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
- **Notes:** Called from the mini program side. Creates a new member record for the specified user.

### 更新小程序会员信息 (Update Mini Program Member)
- **Path:** `/wxa/vip/user/info/update`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | openid | string | Yes | User's openid |
  | nickname | string | No | Updated nickname |
  | phone | string | No | Updated phone number |
  | birthday | string | No | Updated birthday |
  | gender | number | No | Updated gender |
  | custom_user_data | object | No | Updated custom user data |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
- **Notes:** Updates existing member info. Only provided fields will be updated.

### 获取小程序会员信息 (Get Mini Program Member)
- **Path:** `/wxa/vip/user/info/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | openid | string | Yes | User's openid |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | user_info | object | Member info including openid, nickname, phone, birthday, gender, custom_user_data, etc. |

### 获取小程序会员列表 (Get Mini Program Member List)
- **Path:** `/wxa/vip/user/list/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | page_index | number | No | Page index, default 1 |
  | page_size | number | No | Page size, default 10, max 100 |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | total_num | number | Total count |
  | users[] | array[object] | Member list |

### 删除小程序会员信息 (Delete Mini Program Member)
- **Path:** `/wxa/vip/user/info/delete`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | openid | string | Yes | User's openid to delete |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
- **Notes:** Permanently deletes the member record. This action cannot be undone.

### 获取小程序已关联小店列表 (Get Associated Store List)
- **Path:** `/wxa/vip/shop/list/get`
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
  | shops[] | array[object] | Associated store list with shop_id, shop_name, status, etc. |
- **Notes:** Returns the list of WeChat stores that are associated with the current mini program for membership services.
