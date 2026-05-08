# Logistics & Shipping (物流发货)

## Address Management (地址管理)

### 添加地址 (Add Address)
- **Path:** `/channels/ec/merchant/address/add`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | address_detail | object AddressDetail | Yes | Address info. See Address Definition. Contains `address_info` (object), `landline` (string), `remark` (string), `send_addr` (bool), `default_send` (bool), `recv_addr` (bool), `default_recv` (bool), `address_type` (object with `same_city` int, `pickup` int) |
  | address_detail.address_info.user_name | string | Yes | Recipient name |
  | address_detail.address_info.postal_code | string | No | Postal code |
  | address_detail.address_info.province_name | string | Yes | Province name |
  | address_detail.address_info.city_name | string | Yes | City name |
  | address_detail.address_info.county_name | string | Yes | District/county name |
  | address_detail.address_info.detail_info | string | Yes | Detailed address |
  | address_detail.address_info.tel_number | string | Yes | Phone number |
  | address_detail.address_info.lat | number | No | Latitude |
  | address_detail.address_info.lng | number | No | Longitude |
  | address_detail.address_info.house_number | string | No | House number |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | address_id | string | New address ID |
- **Error Codes:** Common error codes
- **Notes:** `address_type.same_city` and `address_type.pickup` are 0 or 1 flags.

### 获取地址列表 (Get Address List)
- **Path:** `/channels/ec/merchant/address/list`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | offset | number | Yes | Offset for pagination |
  | limit | number | Yes | Number of items to retrieve |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | address_id_list | Array\<string\> | List of address IDs |
- **Error Codes:** Common error codes
- **Notes:** Returns only IDs; use `address/get` to retrieve details for each.

### 获取地址详情 (Get Address Detail)
- **Path:** `/channels/ec/merchant/address/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | address_id | string | Yes | Address ID |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | address_detail | object AddressDetail | Address details including `address_id`, `name`, `address_info`, `landline`, `remark`, `send_addr`, `default_send`, `recv_addr`, `default_recv`, `create_time`, `update_time`, `address_type` |
- **Error Codes:** Common error codes
- **Notes:** Response includes `create_time` and `update_time` (unix timestamps).

### 更新地址 (Update Address)
- **Path:** `/channels/ec/merchant/address/update`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | address_detail | object AddressDetail | Yes | Address info. Must include `address_id` field along with updated fields. Same structure as add. |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
- **Error Codes:** Common error codes, 10021040 (address_id error)
- **Notes:** The `address_detail` must contain `address_id` to identify which address to update.

### 删除地址 (Delete Address)
- **Path:** `/channels/ec/merchant/address/delete`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | address_id | string | Yes | Address ID to delete |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
- **Error Codes:** Common error codes
- **Notes:** Cannot delete an address that is set as default.

## Freight Template (运费模板)

### 增加运费模版 (Add Freight Template)
- **Path:** `/channels/ec/merchant/addfreighttemplate`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | freight_template | object FreightTemplate | Yes | Freight template details. See Freight Template Definition. |
  | freight_template.name | string | Yes | Template name |
  | freight_template.valuation_type | string | Yes | Valuation type: `PIECE` (per piece) or `WEIGHT` (per weight) |
  | freight_template.send_time | string | Yes | Shipping time, e.g. `SendTime_FOUR_HOUR` |
  | freight_template.address_info | object | Yes | Sender address info |
  | freight_template.delivery_type | string | Yes | Delivery type: `EXPRESS` etc. |
  | freight_template.shipping_method | string | Yes | Shipping method: `FREE` (free), `UNIFY` (flat rate), `CUSTOM` (custom) |
  | freight_template.is_default | bool | No | Whether this is the default template |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | template_id | string | New freight template ID |
- **Error Codes:** Common error codes, 10021053 (invalid default template rule - default cannot specify address), 10021054 (invalid province/city/district), 10021200 (template name already exists), 10021055 (template must include default rule), 10021081 (template has no sender address)
- **Notes:** The default shipping rule must not specify a specific region.

### 查询运费模版 (Get Freight Template Detail)
- **Path:** `/channels/ec/merchant/getfreighttemplatedetail`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | template_id | string | Yes | Freight template ID |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | freight_template | object FreightTemplate | Full template including `template_id`, `name`, `valuation_type`, `send_time`, `address_info`, `delivery_type`, `delivery_id` (Array), `shipping_method`, `all_condition_free_detail`, `all_freight_calc_method`, `create_time`, `update_time`, `is_default`, `not_send_area` |
- **Error Codes:** Common error codes, 10020005 (template does not exist)
- **Notes:** Returns complete template data with shipping rules and excluded areas.

### 获取运费模板列表 (Get Freight Template List)
- **Path:** `/channels/ec/merchant/getfreighttemplatelist`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | offset | number | Yes | Starting position |
  | limit | number | Yes | Number of items to retrieve |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | template_id_list | Array\<string\> | List of freight template IDs |
- **Error Codes:** Common error codes
- **Notes:** Returns only IDs; use `getfreighttemplatedetail` for full info.

### 更新运费模版 (Update Freight Template)
- **Path:** `/channels/ec/merchant/updatefreighttemplate`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | freight_template | object FreightTemplate | Yes | Updated freight template details. Must include `template_id`. Same structure as add. |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | template_id | string | Updated template ID |
- **Error Codes:** Common error codes, 10021053 (invalid default template rule), 10021054 (invalid province/city/district), 10020007 (missing template ID), 10021081 (template has no sender address)
- **Notes:** Must include `template_id` in the freight_template object to identify which template to update.

## Electronic Waybill (电子面单)

### 电子面单取号 (Create Waybill Order)
- **Path:** `/channels/ec/logistics/ewaybill/biz/order/create`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | waybill_id | string | No | Pre-created waybill ID from precreate |
  | order_id | string | No | 订单ID (Order ID, for order-based waybill) |
  | delivery_id | string | No | 快递公司ID (Express company ID) |
  | sender | object | No | 寄件人信息 (Sender info) |
  | receiver | object | No | 收件人信息 (Receiver info) |
  | cargo | object | No | 货物信息 (Cargo details) |
  | ewaybill_template_id | string | No | 面单模板ID (Waybill template ID) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
  | waybill_id | string | 面单号 (Waybill number) |
  | print_data | string | 打印数据 (Print data, base64 encoded) |
- **Notes:** Creates electronic waybill. Must have express company electronic waybill account enabled.

---

### 电子面单预取号 (Pre-create Waybill Order)
- **Path:** `/channels/ec/logistics/ewaybill/biz/order/precreate`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | delivery_id | string | Yes | 快递公司ID (Express company ID) |
  | sender | object | No | 寄件人信息 (Sender info) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
  | waybill_id | string | 预取面单号 (Pre-created waybill ID, for use in create) |
- **Notes:** Pre-creates waybill order. Returns `waybill_id` for actual order creation.

---

### 电子面单取消下单 (Cancel Waybill Order)
- **Path:** `/channels/ec/logistics/ewaybill/biz/order/cancel`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | waybill_id | string | Yes | 面单号 (Waybill number to cancel) |
  | delivery_id | string | Yes | 快递公司ID (Express company ID) |
  | cancel_reason | string | No | 取消原因 (Cancellation reason) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
- **Notes:** Cancels a previously created waybill order.

---

### 查询开通的电子面单网点/账号信息 (Get Waybill Account Info)
- **Path:** `/channels/ec/logistics/ewaybill/biz/account/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | delivery_id | string | No | 快递公司ID, 不填返回全部 (Express company ID, returns all if omitted) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
  | account_list | object[] | 网点账号列表 (Account list) |
  | account_list[].delivery_id | string | 快递公司ID (Express company ID) |
  | account_list[].status | number | 状态 (Account status) |
  | account_list[].branch_name | string | 网点名称 (Branch name) |
  | account_list[].quota | number | 剩余面单数量 (Remaining waybill quota) |
- **Notes:** Returns electronic waybill account info including status and inventory.

---

### 查询开通的快递公司列表 (Get Available Express Companies)
- **Path:** `/channels/ec/logistics/ewaybill/biz/delivery/get`
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
  | delivery_list | object[] | 快递公司列表 (Express company list) |
  | delivery_list[].delivery_id | string | 快递公司ID (Express company ID) |
  | delivery_list[].delivery_name | string | 快递公司名称 (Express company name) |
- **Notes:** Returns list of express companies with electronic waybill enabled.

---

### 查询面单详情 (Get Waybill Order Detail)
- **Path:** `/channels/ec/logistics/ewaybill/biz/order/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | waybill_id | string | Yes | 面单号 (Waybill number) |
  | delivery_id | string | Yes | 快递公司ID (Express company ID) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
  | order_detail | object | 面单详情 (Waybill order details) |
  | order_detail.waybill_id | string | 面单号 (Waybill number) |
  | order_detail.status | number | 面单状态 (Waybill status) |
  | order_detail.sender | object | 寄件人信息 (Sender info) |
  | order_detail.receiver | object | 收件人信息 (Receiver info) |
  | order_detail.cargo | object | 货物信息 (Cargo details) |
- **Notes:** Retrieves waybill order details.

---

### 获取打印报文 (Get Print Data)
- **Path:** `/channels/ec/logistics/ewaybill/biz/print/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | waybill_id | string | Yes | 面单号 (Waybill number) |
  | delivery_id | string | Yes | 快递公司ID (Express company ID) |
  | ewaybill_template_id | string | No | 面单模板ID (Waybill template ID) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
  | print_data | string | 打印报文数据 (Print data, base64/JSON) |
- **Notes:** Gets print data payload for a waybill. Used with print component.

---

### 打印成功通知 (Print Success Notification)
- **Path:** `/channels/ec/logistics/ewaybill/biz/order/print`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | waybill_id | string | Yes | 面单号 (Waybill number) |
  | delivery_id | string | Yes | 快递公司ID (Express company ID) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
- **Notes:** Notifies the system that printing was successful for a waybill.

---

### 批量打印通知 (Batch Print Notification)
- **Path:** `/channels/ec/logistics/ewaybill/biz/order/batchprint`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | waybill_list | object[] | Yes | 面单列表 (Waybill list) |
  | waybill_list[].waybill_id | string | Yes | 面单号 (Waybill number) |
  | waybill_list[].delivery_id | string | Yes | 快递公司ID (Express company ID) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
- **Notes:** Batch notification for printing completion.

---

### 获取面单标准模板 (Get Standard Waybill Template)
- **Path:** `/channels/ec/logistics/ewaybill/biz/template/config`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | delivery_id | string | No | 快递公司ID, 不填返回全部 (Express company ID, returns all if omitted) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
  | template_list | object[] | 标准模板列表 (Standard template list) |
  | template_list[].template_id | string | 模板ID (Template ID) |
  | template_list[].template_name | string | 模板名称 (Template name) |
  | template_list[].template_content | string | 模板内容 (Template content) |
- **Notes:** Gets standard waybill template configurations from express companies.

---

### 新增面单模板 (Create Waybill Template)
- **Path:** `/channels/ec/logistics/ewaybill/biz/template/create`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | delivery_id | string | Yes | 快递公司ID (Express company ID) |
  | template_name | string | Yes | 模板名称 (Template name) |
  | template_content | object | Yes | 模板内容配置 (Template content config) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
  | template_id | string | 新模板ID (New template ID) |
- **Notes:** Creates a new custom waybill template.

---

### 删除面单模版 (Delete Waybill Template)
- **Path:** `/channels/ec/logistics/ewaybill/biz/template/delete`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | template_id | string | Yes | 面单模板ID (Waybill template ID to delete) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
- **Notes:** Deletes an existing waybill template.

---

### 更新面单模版 (Update Waybill Template)
- **Path:** `/channels/ec/logistics/ewaybill/biz/template/update`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | template_id | string | Yes | 面单模板ID (Waybill template ID) |
  | template_name | string | No | 模板名称 (Template name) |
  | template_content | object | No | 模板内容配置 (Template content config) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
- **Notes:** Updates an existing waybill template.

---

### 获取面单模板信息 (Get Waybill Template Info)
- **Path:** `/channels/ec/logistics/ewaybill/biz/template/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | delivery_id | string | No | 快递公司ID (Express company ID) |
  | offset | number | No | 分页偏移 (Pagination offset) |
  | limit | number | No | 每页数量 (Page size) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
  | template_list | object[] | 模板列表 (Template list) |
  | template_list[].template_id | string | 模板ID (Template ID) |
  | template_list[].template_name | string | 模板名称 (Template name) |
  | template_list[].delivery_id | string | 快递公司ID (Express company ID) |
  | template_list[].template_content | object | 模板内容 (Template content) |
  | template_list[].create_time | number | 创建时间 (Creation time) |
  | template_list[].update_time | number | 更新时间 (Update time) |
- **Notes:** Retrieves waybill template list with pagination.

---

### 根据模板ID获取面单模板信息 (Get Waybill Template by ID)
- **Path:** `/channels/ec/logistics/ewaybill/biz/template/getbyid`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | template_id | string | Yes | 面单模板ID (Waybill template ID) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
  | template_info | object | 模板详情 (Template details) |
  | template_info.template_id | string | 模板ID (Template ID) |
  | template_info.template_name | string | 模板名称 (Template name) |
  | template_info.delivery_id | string | 快递公司ID (Express company ID) |
  | template_info.template_content | object | 模板内容 (Template content) |
- **Notes:** Retrieves a single waybill template by its ID.

---

### 电子面单子件追加 (Add Sub-Order)
- **Path:** `/channels/ec/logistics/ewaybill/biz/order/addsuborder`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | waybill_id | string | Yes | 主面单号 (Main waybill number) |
  | delivery_id | string | Yes | 快递公司ID (Express company ID) |
  | cargo | object | No | 子件货物信息 (Sub-order cargo info) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
  | sub_waybill_id | string | 子件面单号 (Sub waybill number) |
- **Notes:** Adds a sub-order to an existing waybill. Supported carriers: SF, DBKD, JD, SXJD, Yunda.

---

## Virtual Numbers for Logistics (物流虚拟号)

### 获取虚拟号码池 (Get Virtual Number Pool)
- **Path:** `/channels/ec/logistics/phonenumberpool/get`
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
  | number_pool_list | object[] | 虚拟号池列表 (Virtual number pool list) |
- **Notes:** Returns available virtual phone number pools for logistics.

---

### 根据运单号获取真实手机号 (Get Real Phone by Waybill)
- **Path:** `/channels/ec/logistics/phonenumber/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | waybill_id | string | Yes | 运单号 (Tracking number) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
  | real_number | string | 真实手机号 (Real phone number) |
- **Notes:** Gets buyer's real phone number by tracking number.

---

### 根据运单号获取虚拟手机号 (Get Virtual Phone by Waybill)
- **Path:** `/channels/ec/logistics/virtualnumber/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | waybill_id | string | Yes | 运单号 (Tracking number) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
  | virtual_number | string | 虚拟手机号 (Virtual phone number) |
  | expire_time | number | 过期时间 (Expiration time) |
- **Notes:** Gets virtual phone number associated with a tracking number.

---

## Delivery (发货)

### 订单发货 (Ship Order)
- **Path:** `/channels/ec/order/delivery/send`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | order_id | string | Yes | 订单ID (Order ID) |
  | delivery_list | object[] | Yes | 物流信息列表 (Delivery info list) |
  | delivery_list[].delivery_id | string | Yes | 快递公司ID (Express company ID) |
  | delivery_list[].waybill_id | string | Yes | 运单号 (Tracking number) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
- **Notes:** Ships an order. Supports multiple packages via delivery_list array.

---

### 订单补发货 (Compensation Shipment)
- **Path:** `/channels/ec/order/delivery/compensation`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | order_id | string | Yes | 订单ID (Order ID) |
  | delivery_list | object[] | Yes | 补发物流信息 (Compensation delivery info) |
  | delivery_list[].delivery_id | string | Yes | 快递公司ID (Express company ID) |
  | delivery_list[].waybill_id | string | Yes | 运单号 (Tracking number) |
  | compensation_type | number | No | 补发类型: 1=漏发, 2=拆包, 3=破损, 4=赠品 (Type: 1=missing, 2=split, 3=damaged, 4=gift) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
- **Notes:** For compensation shipments: missing items, split packages, damaged goods, or gifts.

---

### 获取快递公司列表 (Get Express Company List - New)
- **Path:** `/channels/ec/order/deliverycompanylist/new/get`
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
  | delivery_company_list | object[] | 快递公司列表 (Express company list) |
  | delivery_company_list[].delivery_id | string | 快递公司ID (Express company ID) |
  | delivery_company_list[].delivery_name | string | 快递公司名称 (Express company name) |
- **Notes:** Gets the new version of the express company list.

---

### 获取快递公司列表-旧 (Get Express Company List - Legacy)
- **Path:** `/channels/ec/order/deliverycompanylist/get`
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
  | delivery_company_list | object[] | 快递公司列表 (Express company list) |
  | delivery_company_list[].delivery_id | string | 快递公司ID (Express company ID) |
  | delivery_company_list[].delivery_name | string | 快递公司名称 (Express company name) |
- **Notes:** Legacy version of express company list. Use `/new/get` for updated version.
