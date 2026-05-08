# After-Sales Management (售后管理)

## After-Sale Orders (售后单)

### 获取售后单 (Get After-Sale Order)
- **Path:** `/channels/ec/aftersale/getaftersaleorder`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | after_sale_order_id | String | Yes | 售后单号 (After-sale order ID) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | after_sale_order_id | String | 售后单号 (After-sale order ID) |
  | status | String | 售后单当前状态，参考 AfterSaleStatus 枚举 (Current status, see AfterSaleStatus enum) |
  | openid | String | 订单归属人身份标识 (Order owner identity, buyer for self-purchase, recipient for gifts) |
  | unionid | String | 订单归属人在开放平台的唯一标识符 (UnionID of order owner) |
  | present_giver_openid | String | 礼物订单赠送者openid (Gift order giver openid, gift orders only) |
  | present_giver_unionid | String | 礼物订单赠送者 UnionID (Gift order giver UnionID) |
  | product_info | Object AfterSaleProductInfo | 售后相关商品信息 (Product info, see AfterSaleProductInfo) |
  | refund_info | Object RefundInfo | 退款详情 (Refund details, see RefundInfo) |
  | return_info | Object ReturnInfo | 用户退货信息 (User return info, see ReturnInfo) |
  | merchant_upload_info | Object MerchantUploadInfo | 商家上传的信息 (Merchant uploaded info, see MerchantUploadInfo) |
  | create_time | Number | 售后单创建时间戳 (Creation timestamp) |
  | update_time | Number | 售后单更新时间戳 (Update timestamp) |
  | reason | String | 退款原因 (Refund reason code) |
  | reason_text | String | 退款原因解释 (Refund reason text description) |
  | type | String | 售后类型。REFUND:退款；RETURN:退货退款；EXCHANGE:换货 (Type: REFUND/RETURN/EXCHANGE) |
  | complaint_id | String | 纠纷id (Complaint ID) |
  | order_id | String | 订单号 (Order ID) |
  | refund_resp | Object ApplyRefundResp | 微信支付退款的响应 (WeChat Pay refund response) |
  | deadline | Number | 操作剩余时间（秒数）(Operation remaining time in seconds) |
  | exchange_product_info | Object AfterSaleExchangeProductInfo | 换货相关商品信息 (Exchange product info) |
  | exchange_delivery_info | Object AfterSaleExchangeDeliveryInfo | 换货相关物流信息 (Exchange delivery info) |
  | virtual_tel_num_info | Object VirtualTelNumInfo | 虚拟号码信息 (Virtual phone number info) |
- **Struct: AfterSaleProductInfo**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | product_id | String | 商品 SPU ID |
  | sku_id | String | 商品 SKU ID |
  | count | Number | 售后数量 (After-sale quantity) |
  | fast_refund | Bool | 是否极速退款 (Is fast refund) |
  | gift_product_list | Array | 赠品信息，参考 AfterSaleGiftProductInfo |
- **Struct: RefundInfo**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | amount | Number | 退款金额（分）(Refund amount in cents) |
  | refund_reason | Number | 售后单退款直接原因, 参考 RefundReason 枚举 |
- **Struct: ReturnInfo**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | waybill_id | String | 快递单号 (Tracking number) |
  | delivery_id | String | 物流公司 ID (Logistics company ID) |
  | delivery_name | String | 物流公司名称 (Logistics company name) |
- **Struct: MerchantUploadInfo**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | reject_reason | String | 拒绝原因 (Rejection reason) |
  | refund_certificates | Array\<String\> | 退款凭证 (Refund certificate media_ids) |
- **Struct: ApplyRefundResp**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | code | String | 错误码 (Error code) |
  | ret | Number | 状态码 (Status code) |
  | message | String | 描述 (Description) |
- **Struct: AfterSaleExchangeProductInfo**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | product_id | String | 商品 SPU ID |
  | old_sku_id | String | 旧商品 SKU ID |
  | new_sku_id | String | 新商品 SKU ID |
  | product_cnt | Number | 数量 (Quantity) |
  | old_sku_price | Number | 旧商品价格 (Old product price) |
  | new_sku_price | Number | 新商品价格 (New product price) |
- **Struct: VirtualTelNumInfo**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | virtual_tel_number | String | 虚拟号码 (Virtual phone number) |
  | virtual_tel_expire_time | Number | 虚拟号码过期时间 (Expiration time) |
- **Enum: AfterSaleStatus**
  | Value | Description |
  |-------|-------------|
  | USER_CANCELD | 用户取消申请 (User cancelled) |
  | MERCHANT_PROCESSING | 商家受理中 (Merchant processing) |
  | MERCHANT_REJECT_REFUND | 商家拒绝退款 (Merchant rejected refund) |
  | MERCHANT_REJECT_RETURN | 商家拒绝退货退款 (Merchant rejected return) |
  | USER_WAIT_RETURN | 待买家退货 (Waiting for buyer return) |
  | RETURN_CLOSED | 退货退款关闭 (Return closed) |
  | MERCHANT_WAIT_RECEIPT | 待商家收货 (Waiting for merchant receipt) |
  | MERCHANT_OVERDUE_REFUND | 商家逾期未退款 (Merchant overdue refund) |
  | MERCHANT_REFUND_SUCCESS | 退款完成 (Refund completed) |
  | MERCHANT_RETURN_SUCCESS | 退货退款完成 (Return completed) |
  | PLATFORM_REFUNDING | 平台退款中 (Platform refunding) |
  | PLATFORM_REFUND_FAIL | 平台退款失败 (Platform refund failed) |
  | USER_WAIT_CONFIRM | 待用户确认 (Waiting for user confirmation) |
  | MERCHANT_REFUND_RETRY_FAIL | 商家打款失败，客服关闭售后 (Merchant payment failed) |
  | MERCHANT_FAIL | 售后关闭 (After-sale closed) |
  | USER_WAIT_CONFIRM_UPDATE | 待用户处理商家协商 (Waiting for user to handle negotiation) |
  | USER_WAIT_HANDLE_MERCHANT_AFTER_SALE | 待用户处理商家代发起的售后申请 (Waiting for user to handle merchant-initiated after-sale) |
  | WAIT_PACKAGE_INTERCEPT | 物流线上拦截中 (Package intercepting) |
  | MERCHANT_REJECT_EXCHANGE | 商家拒绝换货 (Merchant rejected exchange) |
  | MERCHANT_REJECT_RESHIP | 商家拒绝发货 (Merchant rejected reship) |
  | USER_WAIT_RECEIPT | 待用户收货 (Waiting for user receipt) |
  | MERCHANT_EXCHANGE_SUCCESS | 换货完成 (Exchange completed) |
- **Enum: RefundReason**
  | Value | Description |
  |-------|-------------|
  | 1 | 商家通过店铺管理页或者小助手发起退款 |
  | 2 | 退货退款场景，商家同意买家未上传物流单号情况下确认收货并退款 |
  | 3 | 商家通过后台 API 发起退款 |
  | 4 | 未发货售后平台自动同意 |
  | 5 | 平台介入纠纷退款 |
  | 6 | 特殊场景下平台强制退款 |
  | 7 | 退货退款场景，买家同意没有上传物流单号情况下，商家确认收货并退款 |
  | 8 | 商家发货超时，平台退款 |
  | 9 | 商家处理买家售后申请超时，平台自动同意退款 |
  | 10 | 用户确认收货超时，平台退款 |
  | 11 | 商家确认收货超时，平台退款 |

---

### 同意售后 (Accept After-Sale)
- **Path:** `/channels/ec/aftersale/acceptapply`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | after_sale_order_id | String | Yes | 售后单号 (After-sale order ID) |
  | address_id | String | No | 同意退货时必须传入地址 ID (Required for return acceptance) |
  | accept_type | Number | No | 针对退货退款: 1=同意退货退款并通知用户退货; 2=确认收到货并退款给用户。不填则自动选择 (Return-refund operation type) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
- **Error Codes:**
  | Code | Description |
  |------|-------------|
  | 10020000 | 售后单号不合法 (Invalid after-sale order ID) |
  | 10020001 | 售后单状态不合法 (Invalid after-sale status) |
  | 10021041 | 当前售后单不支持此操作，请检查售后单状态 |
  | 10021043 | 售后单非当前账号 (After-sale order belongs to another account) |
  | 10021044 | 当前用户太多，请稍后再试 (Too many users, try later) |
  | 10021045 | 退款失败 (Refund failed) |
  | 10021046 | 金额不足 (Insufficient balance) |
  | 10021050 | 售后单不存在 (After-sale order not found) |
  | 10021059 | 平台退款请求太频繁，1qpm 限制 |
  | 10021060 | 缺少退货地址 address_id 参数 |
  | 10021062 | 退货地址 address_id 错误 |
- **Notes:**
  - Do not repeat refund operations on the same order within 1 minute
  - For REFUND type: calling means refunding the buyer immediately
  - For RETURN type: first call = agree to return-refund; second call (after receiving goods) = confirm receipt and refund
  - For EXCHANGE type: this API is for agreeing to exchange; use acceptexchangereship or rejectexchangereship for shipping

---

### 换货发货 (Exchange Reship)
- **Path:** `/channels/ec/aftersale/acceptexchangereship`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | after_sale_order_id | String | Yes | 售后单号 (After-sale order ID) |
  | waybill_id | String | Yes | 快递单号 (Tracking number) |
  | delivery_id | String | Yes | 快递公司 ID，通过获取快递公司列表接口获得，非主流可以填 OTHER (Logistics company ID) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
- **Error Codes:**
  | Code | Description |
  |------|-------------|
  | 9700224 | 参数错误 (Parameter error) |
  | 10020000 | 售后单号不合法 (Invalid after-sale order ID) |
  | 10020001 | 售后单状态不合法 (Invalid after-sale status) |
  | 10021041 | 当前售后单不支持此操作 |
  | 10021043 | 售后单非当前账号 |
  | 10021050 | 售后单不存在 |
  | 10021059 | 平台退款请求太频繁 |
  | 10020261 | 存在不合规字符 |
- **Notes:** Do not repeat exchange reship operations on the same order within 1 minute

---

### 售后单兑换虚拟号 (Get Virtual Number for After-Sale)
- **Path:** `/channels/ec/aftersale/applyvirtualtelnum`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | after_sale_order_id | String | Yes | 售后单号 (After-sale order ID) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
  | virtual_tel_num_info | Object VirtualTelNumInfo | 虚拟号码信息 (Virtual phone number info) |

---

### 代用户发起售后 (Initiate After-Sale on Behalf of User)
- **Path:** `/channels/ec/aftersale/genaftersaleorder`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | request_id | String | Yes | 请求唯一 ID，失败可用相同 ID 重试避免重复 (Unique request ID for idempotent retry) |
  | order_id | String | Yes | 订单 ID (Order ID) |
  | product_id | String | Yes | 商品 SPU ID |
  | sku_id | String | Yes | 商品 SKU ID |
  | count | Number | Yes | 发起售后数量 (After-sale quantity) |
  | amount | Number | Yes | 售后退款金额，单位分 (Refund amount in cents) |
  | reason | String | Yes | 售后原因，参考 AfterSaleReason 枚举 |
  | type | String | Yes | 售后类型，REFUND：仅退款；RETURN：退货退款 |
  | address_id | String | No | 退货退款时的退货地址 ID (Return address ID for RETURN type) |
  | desc | String | No | 代发起售后补充说明 (Additional description) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
  | after_sale_order_id | String | 售后单号 (After-sale order ID) |
- **Error Codes:**
  | Code | Description |
  |------|-------------|
  | 10020000 | 售后单号不存在 |
  | 10020001 | 售后单状态不合法 |
  | 10021041 | 当前售后单不支持此操作 |
  | 10021043 | 售后单非当前账号 |
  | 10021050 | 售后单不存在 |
  | 10021084 | 售后原因不合法 (Invalid after-sale reason) |
  | 10021089 | request_id 对应的售后单已经发起 (Duplicate request_id) |
  | 10021085 | 获取订单信息失败 |
  | 10021086 | 虚拟商品不支持退货退款 |
  | 10021083 | 请求 ID 不合法 |
  | 10021088 | 订单不支持代发起售后 |
  | 10021060 | 缺少退货地址参数 |
- **Enum: AfterSaleReason**
  | Value | Description |
  |-------|-------------|
  | 10000014 | 双方协商一致退款 (Mutual agreement) |
  | 10000002 | 拍错/多拍 (Wrong/extra purchase) |
  | 10000000 | 不想要了 (No longer wanted) |
  | 10000001 | 缺货 (Out of stock) |
  | 10000006 | 卖家发错货 (Seller sent wrong item) |
  | 10000021 | 质量问题 (Quality issue) |
  | 10000007 | 未收到商品 (Not received) |
  | 10000015 | 快递长时间未送达 (Delivery timeout) |
  | 10000017 | 物流无跟踪记录 (No tracking record) |
  | 10000008 | 其他 (Others) |

---

### 获取售后单列表 (Get After-Sale Order List)
- **Path:** `/channels/ec/aftersale/getaftersalelist`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | begin_create_time | Number | No | 售后单创建起始时间 (Creation start time) |
  | end_create_time | Number | No | 售后单创建结束时间，与 begin_create_time 差不得大于 24 小时 |
  | begin_update_time | Number | No | 售后单更新起始时间 (Update start time) |
  | end_update_time | Number | No | 售后单更新结束时间，与 begin_update_time 差不得大于 24 小时 |
  | next_key | String | No | 翻页参数，从第二页开始传 (Pagination key from previous page) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
  | after_sale_order_id_list | Array\<String\> | 售后单号列表 (After-sale order ID list) |
  | has_more | Bool | 是否还有数据 (Has more data) |
  | next_key | String | 翻页参数 (Next page key) |
- **Error Codes:**
  | Code | Description |
  |------|-------------|
  | 10020004 | 非法的时间区间，不得大于 24 小时 |
  | 10020003 | 非法的 openid 参数 |
- **Notes:** begin_create_time/end_create_time and begin_update_time/end_update_time are used in pairs; at least one pair is required

---

### 商家协商 (Merchant Negotiate)
- **Path:** `/channels/ec/aftersale/merchantupdateaftersale`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | after_sale_order_id | String | Yes | 售后单号 (After-sale order ID) |
  | type | Number | Yes | 协商修改后的售后类型。1:退款；2:退货退款 |
  | amount | Number | Yes | 金额（单位：分）(Amount in cents) |
  | merchant_update_desc | String | Yes | 协商描述 (Negotiation description) |
  | update_reason_type | Number | Yes | 协商原因，参考 MerchantUpdateReason 枚举值 |
  | merchant_update_type | Number | Yes | 1=已协商一致邀请买家取消售后; 2=邀请买家核实与补充凭证; 3=修改买家售后申请 |
  | media_ids | Array\<String\> | Conditional | 协商凭证 id 列表 (Certificate media IDs, required when update_reason_type has need_image=1) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
- **Error Codes:**
  | Code | Description |
  |------|-------------|
  | 9700223 | 系统失败 (System error) |
  | 9700224 | 参数错误 (Parameter error) |
  | 10020000 | 售后单号不合法 |
  | 10020001 | 售后单状态不合法 |
  | 10021041 | 当前售后单不支持此操作 |
  | 10021043 | 售后单非当前账号 |
  | 10021044 | 当前用户太多，请稍后再试 |
  | 10021050 | 售后单不存在 |
- **Notes:** Key MerchantUpdateReason values: 6=已协商一致新退款方案; 8=生鲜邀请仅退款; 10=仅修改退款金额; 44/45/46=协商取消售后

---

### 获取全量售后原因 (Get All After-Sale Reasons)
- **Path:** `/channels/ec/aftersale/reason/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | (empty body) | - | - | No parameters required |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
  | reason_list | Array | 售后原因列表 (List of after-sale reasons) |

---

### 拒绝售后 (Reject After-Sale)
- **Path:** `/channels/ec/aftersale/rejectapply`
- **Method:** GET
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | after_sale_order_id | String | Yes | 售后单号 (After-sale order ID) |
  | reject_reason | String | No | 拒绝原因具体描述，可自定义 (Custom rejection description) |
  | reject_reason_type | Number | Yes | 拒绝原因枚举值 (Rejection reason enum value) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
- **Error Codes:**
  | Code | Description |
  |------|-------------|
  | 10020000 | 售后单号不存在 |
  | 10020001 | 售后单状态不合法 |
  | 10021041 | 当前售后单不支持此操作 |
  | 10021043 | 售后单非当前账号 |
  | 10021050 | 售后单不存在 |
  | 10021068 | 当前售后暂不支持直接拒绝，需先使用售后协商功能 |
- **Notes:** Some after-sale orders require using the negotiation (merchantupdateaftersale) API first before rejecting

---

### 换货拒绝发货 (Reject Exchange Reship)
- **Path:** `/channels/ec/aftersale/rejectexchangereship`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | after_sale_order_id | String | Yes | 售后单号 (After-sale order ID) |
  | reject_reason | String | No | 拒绝原因具体描述 (Custom rejection description) |
  | reject_reason_type | Number | Yes | 拒绝原因枚举值 (Rejection reason enum value) |
  | reject_certificates | Array\<String\> | No | 退款凭证 media_id 列表 (Rejection certificate media IDs) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
- **Error Codes:**
  | Code | Description |
  |------|-------------|
  | 9700224 | 参数错误 |
  | 10020000 | 售后单号不存在 |
  | 10020001 | 售后单状态不合法 |
  | 10021041 | 当前售后单不支持此操作 |
  | 10021043 | 售后单非当前账号 |
  | 10021050 | 售后单不存在 |
  | 10021068 | 需先使用售后协商功能 |
  | 10020261 | 存在不合规字符 |

---

### 获取拒绝售后原因 (Get Rejection Reasons)
- **Path:** `/channels/ec/aftersale/rejectreason/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | (empty body) | - | - | No parameters required |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
  | reject_reason_list | Array | 拒绝原因列表 (List of rejection reasons with type values and descriptions) |

---

### 上传退款凭证 (Upload Refund Certificate)
- **Path:** `/channels/ec/aftersale/uploadrefundcertificate`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | after_sale_order_id | String | Yes | 售后单号 (After-sale order ID) |
  | refund_certificates | Array\<String\> | Yes | 退款凭证 media_id 列表，使用图片上传接口获取（数据类型填 0）|
  | desc | String | Yes | 描述 (Description) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
- **Error Codes:**
  | Code | Description |
  |------|-------------|
  | 10020000 | 售后单号不存在 |
  | 10020001 | 售后单状态不合法 |
  | 10021041 | 当前售后单不支持此操作 |
  | 10021043 | 售后单非当前账号 |
  | 10021050 | 售后单不存在 |

---

### 代用户发起退差价 (Initiate Price Difference Refund)
- **Path:** `/channels/ec/aftersale/refundpricediff`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | order_id | String | Yes | 订单 ID (Order ID) |
  | product_id | String | Yes | 商品 SPU ID |
  | sku_id | String | Yes | 商品 SKU ID |
  | amount | Number | Yes | 退差价金额，单位分 (Price difference in cents) |
  | reason | String | Yes | 退差价原因 (Reason for price difference refund) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
  | after_sale_order_id | String | 售后单号 (After-sale order ID) |

---

### 商家处理极速换货用户退货 (Handle Fast Exchange Receipt)
- **Path:** `/channels/ec/aftersale/handlefastexchangereship`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | after_sale_order_id | String | Yes | 售后单号 (After-sale order ID) |
  | type | Number | Yes | 操作类型。1=同意收货；2=拒绝收货 (Action: 1=accept, 2=reject) |
  | reject_reason | String | No | 拒绝原因（type=2 时必填）|
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
- **Notes:** Accept or reject user's return in fast exchange scenario

## Complaint Orders (纠纷单)

### 商家补充纠纷单留言 (Add Complaint Message)
- **Path:** `/channels/ec/aftersale/addcomplaintmaterial`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | complaint_id | String | Yes | 纠纷单 ID (Complaint order ID) |
  | content | String | Yes | 留言内容 (Message content) |
  | media_id_list | Array\<String\> | No | 凭证图片 media_id 列表 |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |

---

### 商家举证 (Submit Complaint Evidence)
- **Path:** `/channels/ec/aftersale/addcomplaintproof`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | complaint_id | String | Yes | 纠纷单 ID (Complaint order ID) |
  | content | String | Yes | 举证文字内容 (Evidence text content) |
  | media_id_list | Array\<String\> | Yes | 举证图片 media_id 列表 (Evidence image media IDs) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |

---

### 获取纠纷单 (Get Complaint Order)
- **Path:** `/channels/ec/aftersale/getcomplaintorder`
- **Method:** GET
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | complaint_id | String | Yes | 纠纷单 ID (Complaint order ID) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
  | complaint_order | Object | 纠纷单详情 (Complaint order details) |

---

### 同步工单 (Sync Work Order)
- **Path:** `/channels/ec/aftersale/syncworkorder`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | complaint_id | String | Yes | 纠纷单 ID (Complaint order ID) |
  | work_order_list | Array | Yes | 工单列表 (Work order list to sync) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
- **Notes:** Full overwrite sync, not incremental

## Guarantee Orders (保障单)

### 获取保障单详情 (Get Guarantee Order Detail)
- **Path:** `/channels/ec/aftersale/getguaranteeorder`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | guarantee_order_id | Number | Yes | 保障单号 (Guarantee order ID) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
  | guarantee_order | Object GuaranteeOrder | 保障单详情 (Guarantee order details) |
- **Struct: GuaranteeOrder**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | guarantee_order_id | Number | 保障单号 |
  | type | Number | 保障单类型 1=假一赔四 2=坏损包退 |
  | order_id | Number | 订单号 |
  | status | String | 保障单当前状态，参考 GuaranteeStatus |
  | create_time | Number | 创建时间戳 |
  | update_time | Number | 更新时间戳 |
  | apply_reason | String | 申请原因 |
  | product_info | Array GuaranteeProductInfo | 商品信息 |
  | expire_time | Number | 过期时间 |
  | openid | String | 买家身份标识 |
  | unionid | String | 买家 UnionID |
  | pay_amount | Number | 退款金额（分）|
  | merchant_refuse_reason | String | 商家拒绝原因 |
  | order_pay_info | Object OrderPayInfo | 订单支付信息 |
  | complete_time | Number | 完成时间 |
  | order_type | Number | 订单类型 0=普通 10=礼物 |
  | history_list | Array HandleItem | 协商历史 |
- **Enum: GuaranteeStatus**
  | Value | Description |
  |-------|-------------|
  | STATUS_WAIT_MERCHANT_HANDLE | 等待商家处理 |
  | STATUS_WAIT_PLATFORM_HANDLE | 等待平台处理 |
  | STATUS_WAIT_USER_CONFIRM | 等待用户确认 |
  | STATUS_WAIT_MERCHANT_PROOF | 等待商家举证 |
  | STATUS_WAIT_USER_PROOF | 等待用户举证 |
  | STATUS_WAIT_BOTH_PROOF | 等待双方举证 |
  | STATUS_PAYING | 赔付中 |
  | STATUS_PAY_SUCC | 赔付成功 |
  | STATUS_PAY_FAIL | 赔付失败 |
  | STATUS_USER_CANCEL | 用户取消申请 |
- **Error Codes:**
  | Code | Description |
  |------|-------------|
  | 9700223 | 系统失败 |
  | 9700224 | 参数错误 |
  | 10021041 | 当前售后单不支持此操作 |
  | 10021057 | 售后单不存在 |

---

### 商家同意保障单申请 (Accept Guarantee)
- **Path:** `/channels/ec/aftersale/merchantacceptguarantee`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | guarantee_order_id | Number | Yes | 保障单号 (Guarantee order ID) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
- **Error Codes:**
  | Code | Description |
  |------|-------------|
  | 9700223 | 系统失败 |
  | 9700224 | 参数错误 |
  | 10021041 | 当前售后单不支持此操作 |
  | 10021057 | 售后单不存在 |

---

### 商家协商保障单 (Negotiate Guarantee)
- **Path:** `/channels/ec/aftersale/merchantmodifyguarantee`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | guarantee_order_id | Number | Yes | 保障单号 (Guarantee order ID) |
  | bad_level | Number | Yes | 商家修改坏损比例，可填 10/30/50/80/100 (Damage level percentage) |
  | merchant_remark | String | No | 商家备注 (Merchant remarks) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
- **Error Codes:**
  | Code | Description |
  |------|-------------|
  | 9700223 | 系统失败 |
  | 9700224 | 参数错误 |
  | 10021057 | 售后单不存在 |

---

### 商家举证保障单 (Submit Guarantee Evidence)
- **Path:** `/channels/ec/aftersale/merchantproofguarantee`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | guarantee_order_id | Number | Yes | 保障单号 (Guarantee order ID) |
  | content | String | Yes | 商家举证文字内容 (Evidence text content) |
  | pic_list | Array\<String\> | Yes | 举证凭证 media_id 列表 (Evidence image media IDs) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
- **Error Codes:**
  | Code | Description |
  |------|-------------|
  | 9700223 | 系统失败 |
  | 9700224 | 参数错误 |
  | 10021041 | 当前售后单不支持此操作 |
  | 10021057 | 售后单不存在 |

---

### 商家拒绝保障单申请 (Reject Guarantee)
- **Path:** `/channels/ec/aftersale/merchantrefuseguarantee`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | guarantee_order_id | Number | Yes | 保障单号 (Guarantee order ID) |
  | reason | String | Yes | 商家拒绝原因 (Rejection reason) |
  | pic_list | Array\<String\> | Yes | 拒绝凭证 media_id 列表 (Rejection evidence media IDs) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
- **Error Codes:**
  | Code | Description |
  |------|-------------|
  | 9700223 | 系统失败 |
  | 9700224 | 参数错误 |
  | 10021041 | 当前售后单不支持此操作 |
  | 10021057 | 售后单不存在 |

---

### 商家获取保障单列表 (Get Guarantee Order List)
- **Path:** `/channels/ec/aftersale/searchguaranteeorder`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | guarantee_order_id_list | Array\<Number\> | No | 保障单号列表 (Guarantee order IDs) |
  | order_id_list | Array\<Number\> | No | 订单号列表 (Order IDs) |
  | type | Number | No | 保障单类型 0=全部 1=假一赔四 2=坏损包退 |
  | begin_time | Number | No | 保障单申请开始时间戳 (Start time) |
  | end_time | Number | No | 保障单申请结束时间戳 (End time) |
  | status_list | Array | No | 保障单状态筛选，参考 GuaranteeStatus |
  | offset | Number | No | 列表起始下标，默认 0 (List offset, default 0) |
  | limit | Number | Yes | 需要的保障单条数 (Page size) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
  | guarantee_order_list | Array\<Object GuaranteeOrder\> | 保障单详情列表 |
  | total_num | Number | 保障单列表总数 (Total count) |
- **Error Codes:**
  | Code | Description |
  |------|-------------|
  | 9700223 | 系统失败 |
  | 9700224 | 参数错误 |
  | 10021041 | 当前售后单不支持此操作 |
  | 10021057 | 售后单不存在 |
