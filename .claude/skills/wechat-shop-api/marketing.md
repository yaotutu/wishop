# Marketing Management (营销管理 - 优惠券)

## Coupon Operations

### 创建优惠券 (Create Coupon)
- **Path:** `/channels/ec/coupon/create`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | type | number | Yes | 优惠券类型: 1=商品条件折扣券, 2=商品满减券, 3=商品统一折扣券, 4=商品直减券, 101=店铺条件折扣券, 102=店铺满减券, 103=店铺统一折扣券, 104=店铺直减券 |
  | name | string | Yes | 优惠券名称，最长10个中文字符 |
  | discount_info.discount_condition.product_cnt | number | No | 商品件数门槛，不能和价格门槛同时设置 |
  | discount_info.discount_condition.product_ids | string array | No | 商品id，商品券需填写，最多200个商品 |
  | discount_info.discount_condition.product_price | number | No | 商品价格门槛，单位为分，不能和件数门槛同时设置 |
  | discount_info.discount_fee | number | No | 优惠减免金额，单位为分，不可超过200元 |
  | discount_info.discount_num | number | No | 优惠折扣数，5000=5折, 7000=7折, 范围1000-10000, 必须是100的整数, 不可低于2折 |
  | ext_info.jump_product_id | string | No | 商品折扣券领取后跳转的商品id |
  | ext_info.notes | string | No | 备注信息 |
  | promote_info.promote_type | number | Yes | 推广类型: 1=小店内推广, 9=会员券, 10=会员开卡礼券 |
  | receive_info.end_time | number | Yes | 优惠券领用结束时间（秒级时间戳） |
  | receive_info.limit_num_one_person | number | Yes | 单人限领张数 |
  | receive_info.start_time | number | Yes | 优惠券领用开始时间（秒级时间戳） |
  | receive_info.total_num | number | Yes | 优惠券领用总数 |
  | valid_info.end_time | number | No | 有效期结束时间（秒级时间戳），valid_type=1时必填 |
  | valid_info.start_time | number | No | 有效期开始时间（秒级时间戳），valid_type=1时必填 |
  | valid_info.valid_day_num | number | No | 有效期天数，valid_type=2时必填 |
  | valid_info.valid_type | number | Yes | 有效期类型: 1=指定时间范围, 2=生效天数 |
  | auto_valid_info.auto_valid_type | number | No | 自动生效类型: 0=不启用, 1=启用(按领券开始时间) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |
  | data.coupon_id | string | 优惠券ID |
- **Notes:** 创建后status=1（未生效，编辑中）。所有时间字段为秒级时间戳。
- **Error Codes:** 10021005(名称太长), 10021006(折扣数失败), 10021007(价格失败), 10021008(直减券最低价), 10021009(领取时间失败), 10021010(有效时间失败), 10021011(发放量失败), 10021012(限领失败), 10021024(信息违规), 10021035(类型不支持), 10021071(结束时间应晚于当前), 10021077(领券区间不可大于365天)

### 获取优惠券详情 (Get Coupon Detail)
- **Path:** `/channels/ec/coupon/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | coupon_id | string | Yes | 优惠券ID |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |
  | coupon.coupon_id | string | 优惠券ID |
  | coupon.type | number | 优惠券类型 |
  | coupon.status | number | 优惠券状态 |
  | coupon.create_time | number | 创建时间 |
  | coupon.update_time | number | 更新时间 |
  | coupon.coupon_info.name | string | 优惠券名称 |
  | coupon.coupon_info.valid_info.valid_type | number | 有效期类型: 1=指定时间, 2=天数 |
  | coupon.coupon_info.valid_info.valid_day_num | number | 有效天数(valid_type=2) |
  | coupon.coupon_info.valid_info.start_time | number | 有效期开始(valid_type=1) |
  | coupon.coupon_info.valid_info.end_time | number | 有效期结束(valid_type=1) |
  | coupon.coupon_info.promote_info.promote_type | number | 推广类型 |
  | coupon.coupon_info.discount_info.discount_num | number | 折扣数×1000, 如5.1折=5100 |
  | coupon.coupon_info.discount_info.discount_fee | number | 减免金额(分), 如0.5元=50 |
  | coupon.coupon_info.discount_info.discount_condition.product_cnt | number | 满x件可用 |
  | coupon.coupon_info.discount_info.discount_condition.product_price | number | 价格满x可用(分) |
  | coupon.coupon_info.discount_info.discount_condition.product_ids | string array | 指定商品id |
  | coupon.coupon_info.receive_info.start_time | number | 领用开始时间 |
  | coupon.coupon_info.receive_info.end_time | number | 领用结束时间 |
  | coupon.coupon_info.receive_info.limit_num_one_person | number | 单人限领张数 |
  | coupon.coupon_info.receive_info.total_num | number | 领用总数 |
  | coupon.stock_info.issued_num | number | 剩余量 |
  | coupon.stock_info.receive_num | number | 已领未用量 |
  | coupon.stock_info.used_num | number | 已用量 |
- **Error Codes:** 10021037(优惠券不存在)

### 获取优惠券ID列表 (Get Coupon ID List)
- **Path:** `/channels/ec/coupon/get_list`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | page_index | number | No | 页码, 默认1 |
  | page_size | number | No | 每页数量, 默认10 |
  | status | number | No | 按状态过滤 |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |
  | total_num | number | 总数 |
  | coupon_id_list | string array | 优惠券ID列表 |

### 获取用户优惠券详情 (Get User Coupon Detail)
- **Path:** `/channels/ec/coupon/get_user_coupon`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | user_coupon_id | string | Yes | 用户优惠券ID |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |
  | user_coupon | object | 用户优惠券详情 |

### 获取用户优惠券ID列表 (Get User Coupon ID List)
- **Path:** `/channels/ec/coupon/get_user_coupon_list`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | page_index | number | No | 页码, 默认1 |
  | page_size | number | No | 每页数量, 默认10 |
  | coupon_id | string | No | 按优惠券ID过滤 |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |
  | total_num | number | 总数 |
  | user_coupon_id_list | string array | 用户优惠券ID列表 |

### 更新优惠券内容 (Update Coupon Content)
- **Path:** `/channels/ec/coupon/update`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | coupon_id | string | Yes | 优惠券ID |
  | type | number | Yes | 优惠券类型(同创建) |
  | name | string | Yes | 优惠券名称 |
  | discount_info | object | No | 同创建接口discount_info结构 |
  | promote_info.promote_type | number | Yes | 推广类型 |
  | receive_info | object | Yes | 同创建接口receive_info结构 |
  | valid_info | object | Yes | 同创建接口valid_info结构 |
  | ext_info | object | No | 同创建接口ext_info结构 |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |
  | data.coupon_id | string | 优惠券ID |
- **Error Codes:** 同创建优惠券 + 10021037(优惠券不存在)

### 更新优惠券状态 (Update Coupon Status)
- **Path:** `/channels/ec/coupon/update_status`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | coupon_id | string | Yes | 优惠券ID |
  | status | number | Yes | 目标状态 |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |
