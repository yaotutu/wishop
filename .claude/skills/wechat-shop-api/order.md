# Order Management (订单管理)

## Order Retrieval

### 获取订单列表 (Get Order List)
- **Path:** `/channels/ec/order/list/get`
- **Method:** POST
- **Doc:** https://developers.weixin.qq.com/doc/store/shop/API/order/list/get.html
- **Request Parameters:**

  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | page_size | number | Yes | 每页数量(不超过50) |
  | next_key | string | No | 分页参数，首页不填，后续页从上一页返回中获取 |
  | start_create_time | number | No | 起始创建时间，秒级时间戳 |
  | end_create_time | number | No | 截止创建时间，秒级时间戳 |
  | status | number | No | 订单状态，枚举值见OrderStatus |
  | order_id | string | No | 订单号，精确匹配 |

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |
  | order_id_list | array string | 订单号列表 |
  | next_key | string | 分页参数，下一页请求回传 |
  | has_more | bool | 是否还有下一页 |

- **Error Codes:** 48001, 47001, 40097
- **Notes:** 接口获取的是经过脱敏处理的订单列表

### 获取订单详情 (Get Order Detail)
- **Path:** `/channels/ec/order/get`
- **Method:** POST
- **Doc:** https://developers.weixin.qq.com/doc/store/shop/API/order/get.html
- **Request Parameters:**

  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | order_id | string | Yes | 订单ID，可从获取订单列表中获得 |

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |
  | order | object Order | 订单结构，具体结构请参考Order结构体 |

- **Error Codes:**
  | Code | Description |
  |------|-------------|
  | 48001 | 无权调用本api，请检查相关权限是否已开通 |
  | 100002 | 订单不存在，请检查订单号与 token 是否正确 |
  | 47001 | 请求体格式不正确，请检查请求体中各个参数的类型是否正确 |
  | 40097 | 请求体参数不正确，请检查各个参数是否按规范填写，具体原因请查看errmsg |

- **Order Struct:**

  | Field | Type | Description |
  |-------|------|-------------|
  | create_time | number | 秒级时间戳 |
  | update_time | number | 秒级时间戳 |
  | order_id | string | 订单ID |
  | status | number | 订单状态，见OrderStatus枚举 |
  | openid | string | 订单归属人身份标识，自购场景为支付者，礼物场景为收礼者 |
  | unionid | string | 订单归属人在开放平台的唯一标识符 |
  | order_detail | object OrderDetail | 订单详细数据信息 |
  | aftersale_detail | object AfterSaleDetail | 售后信息 |
  | is_present | bool | 是否礼物订单 |
  | present_send_type | number | 礼物单类型，见PresentSendType枚举 |
  | present_order_id_str | string | 礼物订单ID |
  | present_note | string | 礼物订单留言 |
  | present_giver_openid | string | 礼物订单赠送者openid，仅送礼订单返回 |
  | present_giver_unionid | string | 礼物订单赠送者unionid |

- **OrderDetail Struct:**

  | Field | Type | Description |
  |-------|------|-------------|
  | product_infos | array ProductInfo | 商品列表 |
  | price_info | object PriceInfo | 价格信息 |
  | pay_info | object PayInfo | 支付信息 |
  | delivery_info | object DeliveryInfo | 配送信息 |
  | coupon_info | object CouponInfo | 优惠券信息 |
  | ext_info | object ExtInfo | 额外信息(备注等) |
  | commission_infos | array CommissionInfo | 分佣信息 |
  | sharer_info | object SharerInfo | 分享员信息 |
  | settle_info | object SettleInfo | 结算信息 |
  | sku_sharer_infos | array SkuSharerInfo | sku分享员信息 |
  | agent_info | object AgentInfo | 授权账号信息 |
  | source_infos | array SourceInfo | 订单来源信息 |
  | refund_info | object RefundInfo | 订单退款信息 |
  | greeting_card_info | object GreetingCardInfo | 商品贺卡信息 |
  | custom_info | object CustomInfo | 商品定制信息 |

- **ProductInfo Struct:**

  | Field | Type | Description |
  |-------|------|-------------|
  | product_id | string | 商品spuid |
  | sku_id | string | 商品skuid |
  | thumb_img | string | sku小图 |
  | sku_cnt | number | sku数量 |
  | sale_price | number | 售卖单价，单位为分 |
  | title | string | 商品标题 |
  | on_aftersale_sku_cnt | number | 正在售后/退款流程中的sku数量 |
  | finish_aftersale_sku_cnt | number | 完成售后/退款的sku数量 |
  | sku_code | string | 商品编码 |
  | market_price | number | 市场单价，单位为分 |
  | sku_attrs | array AttrInfo | sku属性 |
  | real_price | number | sku实付总价，取estimate_price和change_price中较小值 |
  | out_product_id | string | 商品外部spuid |
  | out_sku_id | string | 商品外部skuid |
  | is_discounted | bool | 是否有商家优惠金额 |
  | estimate_price | number | 使用所有优惠后sku总价 |
  | is_change_price | bool | 是否修改过价格 |
  | change_price | number | 改价后sku总价 |
  | out_warehouse_id | string | 区域库存id |
  | sku_deliver_info | object SkuDeliverInfo | 商品发货信息 |
  | extra_service | object ProductExtraService | 商品额外服务信息 |
  | use_deduction | bool | 是否使用了会员积分抵扣 |
  | deduction_price | number | 会员积分抵扣金额，单位为分 |
  | order_product_coupon_info_list | array OrderProductCouponInfo | 商品优惠券信息 |
  | delivery_deadline | number | 商品发货时效 |
  | merchant_discounted_price | number | 商家优惠金额，单位为分 |
  | finder_discounted_price | number | 达人优惠金额，单位为分 |
  | is_free_gift | number | 是否赠品，1:是赠品 |
  | free_gift_info | object OrderProductFreeGiftInfo | 赠品信息 |
  | product_unique_id | string | 商品常量编号，订单内商品唯一标识 |
  | change_sku_info | object ChangeSkuInfo | 更换sku信息 |
  | vip_discounted_price | number | 订单内商品维度会员权益优惠金额 |
  | bulkbuy_discounted_price | number | 订单内商品维度一起买优惠金额 |

- **PriceInfo Struct:**

  | Field | Type | Description |
  |-------|------|-------------|
  | product_price | number | 商品总价，单位为分 |
  | order_price | number | 用户实付金额，单位为分 |
  | freight | number | 运费，单位为分 |
  | discounted_price | number | 商家优惠金额，单位为分 |
  | is_discounted | bool | 是否有商家优惠券优惠 |
  | original_order_price | number | 订单原始价格，单位为分 |
  | estimate_product_price | number | 商品预估价格，单位为分 |
  | change_down_price | number | 改价后降低金额，单位为分 |
  | change_freight | number | 改价后运费，单位为分 |
  | is_change_freight | bool | 是否修改运费 |
  | use_deduction | bool | 是否使用了会员积分抵扣 |
  | deduction_price | number | 会员积分抵扣金额，单位为分 |
  | merchant_receieve_price | number | 商家实收金额，单位为分 |
  | merchant_discounted_price | number | 商家优惠金额，单位为分 |
  | finder_discounted_price | number | 达人优惠金额，单位为分 |
  | vip_discounted_price | number | 订单维度会员权益优惠金额 |

- **PayInfo Struct:**

  | Field | Type | Description |
  |-------|------|-------------|
  | prepay_id | string | 预支付id |
  | prepay_time | number | 预支付时间，秒级时间戳 |
  | pay_time | number | 支付时间，秒级时间戳 |
  | transaction_id | string | 支付订单号 |
  | payment_method | number | 支付方式，见PaymentMethod枚举 |

- **DeliveryInfo Struct:**

  | Field | Type | Description |
  |-------|------|-------------|
  | address_info | object AddressInfo | 地址信息 |
  | delivery_product_info | array DeliveryProductInfo | 发货物流信息 |
  | ship_done_time | number | 发货完成时间，秒级时间戳 |
  | deliver_method | number | 订单发货方式，0:普通物流，1/3:虚拟发货 |
  | address_under_review | object AddressInfo | 审核中的修改地址信息 |
  | address_apply_time | number | 修改地址申请时间，秒级时间戳 |
  | ewaybill_order_code | string | 电子面单代发时的订单密文 |
  | quality_inspect_type | number | 订单质检类型，0:不需要，1:珠宝玉石，2:生鲜 |
  | quality_inspect_info | object QualityInspectInfo | 质检信息 |
  | recharge_info | object RechargeInfo | 虚拟商品充值账户信息 |

- **AddressInfo Struct:**

  | Field | Type | Description |
  |-------|------|-------------|
  | user_name | string | 收货人姓名 |
  | postal_code | string | 邮编 |
  | province_name | string | 省份 |
  | city_name | string | 城市 |
  | county_name | string | 区 |
  | detail_info | string | 详细地址 |
  | tel_number | string | 联系方式 |
  | house_number | string | 门牌号码 |
  | virtual_order_tel_number | string | 虚拟发货订单联系方式 |
  | tel_number_ext_info | object TelNumberExtInfo | 虚拟号码相关信息 |
  | use_tel_number | number | 0:不使用虚拟号码，1:使用虚拟号码 |
  | hash_code | string | 唯一用户收货地址标识 |

- **DeliveryProductInfo Struct:**

  | Field | Type | Description |
  |-------|------|-------------|
  | waybill_id | string | 快递单号 |
  | delivery_id | string | 快递公司编码 |
  | product_infos | array FreightProductInfo | 包裹中商品信息 |
  | delivery_name | string | 快递公司名称 |
  | delivery_time | number | 发货时间，秒级时间戳 |
  | deliver_type | number | 配送方式，见DeliveryType枚举 |
  | delivery_address | object AddressInfo | 发货地址 |

- **ExtInfo Struct:**

  | Field | Type | Description |
  |-------|------|-------------|
  | customer_notes | string | 用户备注 |
  | merchant_notes | string | 商家备注 |
  | confirm_receipt_time | number | 确认收货时间 |
  | finder_id | string | 视频号id |
  | live_id | string | 直播id |
  | order_scene | number | 下单场景，见OrderScene枚举 |
  | vip_order_session_id | string | 会员权益-session_id |
  | commission_handling_progress | number | 分佣单是否已生成，0:未生成，1:已生成 |

- **CommissionInfo Struct:**

  | Field | Type | Description |
  |-------|------|-------------|
  | sku_id | string | 商品skuid |
  | nickname | string | 分账方昵称 |
  | type | number | 分账方类型，0:达人，1:带货机构 |
  | status | number | 分账状态，1:未结算，2:已结算 |
  | amount | number | 分账金额 |
  | finder_id | string | 达人视频号id |
  | openfinderid | string | 达人openfinderid |
  | talent_id | string | 新带货平台id |
  | agency_id | string | 带货机构id |

- **SettleInfo Struct:**

  | Field | Type | Description |
  |-------|------|-------------|
  | predict_commission_fee | number | 预计技术服务费，单位为分 |
  | commission_fee | number | 实际技术服务费，单位为分 |
  | predict_wecoin_commission | number | 预计人气卡返佣金额，单位为分 |
  | wecoin_commission | number | 实际人气卡返佣金额，单位为分 |
  | settle_time | number | 商家结算时间 |

- **SourceInfo Struct:**

  | Field | Type | Description |
  |-------|------|-------------|
  | sku_id | string | 商品skuid |
  | sale_channel | number | 账号关联类型，0:关联账号，1:合作账号，2:授权号，100:达人带货，101:带货机构推广，102:其他 |
  | account_type | number | 带货账号类型，1:视频号，2:公众号，3:小程序，4:企业微信，5:带货达人，6:服务号，1000:带货机构 |
  | account_id | string | 带货账号id |
  | account_nickname | string | 带货账号昵称 |
  | content_type | number | 带货内容类型，1:企微成员转发 |
  | content_id | string | 带货内容id |
  | promoter_head_supplier_id | string | 自营推客推广的带货机构id |
  | original_id | string | 公众号/服务号id |

- **ChangeSkuInfo Struct:**

  | Field | Type | Description |
  |-------|------|-------------|
  | preshipment_change_sku_state | number | 发货前更换sku状态，3:等待商家处理，4:审核通过，5:拒绝，6:用户取消，7:超时拒绝 |
  | old_sku_id | number | 原sku_id |
  | new_sku_id | number | 用户申请更换的sku_id |
  | ddl_time_stamp | number | 商家处理请求的最后时间 |

- **OrderStatus Enum:**

  | Value | Description |
  |-------|-------------|
  | 10 | 待付款 |
  | 12 | 礼物待收下 |
  | 13 | 凑单买凑团中 |
  | 20 | 待发货 |
  | 21 | 部分发货 |
  | 30 | 待收货 |
  | 100 | 完成 |
  | 200 | 全部商品售后之后，订单取消 |
  | 250 | 未付款用户主动取消或超时未付款订单自动取消 |

- **PaymentMethod Enum:**

  | Value | Description |
  |-------|-------------|
  | 1 | 微信支付 |
  | 2 | 先用后付 |
  | 3 | 抽奖商品0元订单 |
  | 4 | 会员积分兑换订单 |

- **DeliveryType Enum:**

  | Value | Description |
  |-------|-------------|
  | 1 | 自寄快递 |
  | 2 | 在线签约快递单(已废弃) |
  | 3 | 虚拟商品无需物流发货 |
  | 4 | 在线快递散单(已废弃) |

- **OrderScene Enum:**

  | Value | Description |
  |-------|-------------|
  | 1 | 其他 |
  | 2 | 直播间 |
  | 3 | 短视频 |
  | 4 | 商品分享 |
  | 5 | 商品橱窗主页 |
  | 6 | 公众号文章商品卡片 |

- **PresentSendType Enum:**

  | Value | Description |
  |-------|-------------|
  | 0 | 普通单聊 |
  | 1 | 普通群聊 |
  | 2 | 公众号/服务号送礼 |
  | 3 | 视频号送礼 |
  | 4 | 企微单聊 |
  | 5 | 企微群聊 |
  | 6 | 小程序/小游戏送礼 |

- **InspectStatus Enum (珠宝玉石类质检状态):**

  | Value | Description |
  |-------|-------------|
  | 0 | 待录入送检信息 |
  | 1 | 待送检 |
  | 2 | 未入库已取消 |
  | 3 | 入库异常 |
  | 4 | 已入库 |
  | 5 | 质检中 |
  | 6 | 待出库 |
  | 7 | 出库异常 |
  | 8 | 待自提 |
  | 10 | 已取消已自提 |
  | 11 | 已发货 |
  | 12 | 待重新送检 |
  | 13 | 已达送检上限 |
  | 14 | 待驿站入库 |

- **FreshInspectStatus Enum (生鲜类质检状态):**

  | Value | Description |
  |-------|-------------|
  | 100 | 待上传打包信息 |
  | 200 | 质检中 |
  | 201 | 质检不通过 |
  | 202 | 质检通过 |

### 订单搜索 (Order Search)
- **Path:** `/channels/ec/order/search`
- **Method:** POST
- **Doc:** https://developers.weixin.qq.com/doc/store/shop/API/order/search.html
- **Request Parameters:**

  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | search_condition | object SearchCondition | Yes | 搜索条件 |
  | on_aftersale_order_exist | number | No | 不传:搜索全部；0:没有正在售后的订单；1:正在售后且售后单>=1 |
  | status | number | No | 订单状态，见RequestOrderStatus枚举 |
  | next_key | string | Yes | 分页参数，上一页请求返回 |
  | page_size | number | Yes | 每页数量(不超过100) |

- **SearchCondition Struct (至少设置一个字段):**

  | Field | Type | Required | Description |
  |-------|------|----------|-------------|
  | title | string | No | 商品标题关键词 |
  | sku_code | string | No | 商品编码 |
  | user_name | string | No | 收件人 |
  | tel_number_last4 | string | No | 收件人电话后四位 |
  | order_id | string | No | 只搜一个订单时使用 |
  | merchant_notes | string | No | 商家备注 |
  | customer_notes | string | No | 买家备注 |
  | address_under_review | bool | No | 申请修改地址审核中 |
  | present_order_id | string | No | 礼物单号 |

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | string | 错误码 |
  | errmsg | string | 错误信息 |
  | order_id_list | array string | 订单号列表 |
  | next_key | string | 分页参数，下一个页请求回传 |
  | has_more | bool | 是否还有下一页 |

- **RequestOrderStatus Enum:**

  | Value | Description |
  |-------|-------------|
  | 10 | 待付款 |
  | 12 | 礼物待收下 |
  | 13 | 凑单买凑团中 |
  | 20 | 待发货(包含部分发货) |
  | 21 | 部分发货 |
  | 30 | 待收货(包含部分发货) |
  | 100 | 完成 |
  | 250 | 订单取消 |

- **Error Codes:**
  | Code | Description |
  |------|-------------|
  | 47001 | 请求体格式不正确，请检查请求体中各个参数的类型是否正确 |
  | 40097 | 请求体参数不正确，请检查各个参数是否按规范填写 |
  | 10080000 | 账号发起注销，进入注销公示期 |
  | 10080001 | 账号已注销 |
  | 6060456 | 请求失败，请检查请求内是否包含不合法字符 |

## Order Modifications

### 修改订单价格 (Update Order Price)
- **Path:** `/channels/ec/order/price/update`
- **Method:** POST
- **Request Parameters:**

  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | order_id | string | Yes | 订单ID |
  | sku_price_list | array SkuPrice | Yes | 改价sku列表 |
  | change_freight | number | No | 改价后运费，单位为分，不填则不改运费 |
  | is_change_freight | bool | No | 是否修改运费 |

- **SkuPrice Struct:**

  | Field | Type | Required | Description |
  |-------|------|----------|-------------|
  | sku_id | string | Yes | skuid |
  | change_price | number | Yes | 改价后sku总价，单位为分 |

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |

- **Error Codes:** 48001, 47001, 40097, 100002
- **Notes:** 仅可改低不可改高；订单状态须为待发货(20)

### 修改订单备注 (Update Order Merchant Notes)
- **Path:** `/channels/ec/order/merchantnotes/update`
- **Method:** POST
- **Request Parameters:**

  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | order_id | string | Yes | 订单ID |
  | merchant_notes | string | Yes | 商家备注 |

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |

- **Error Codes:** 48001, 47001, 40097, 100002

### 修改订单地址 (Update Order Address)
- **Path:** `/channels/ec/order/address/update`
- **Method:** POST
- **Request Parameters:**

  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | order_id | string | Yes | 订单ID |
  | user_name | string | No | 收货人姓名 |
  | postal_code | string | No | 邮编 |
  | province_name | string | No | 省份 |
  | city_name | string | No | 城市 |
  | county_name | string | No | 区 |
  | detail_info | string | No | 详细地址 |
  | tel_number | string | No | 联系方式 |

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |

- **Error Codes:** 48001, 47001, 40097, 100002
- **Notes:** 进入协商流程，需要买家同意后才生效

### 修改物流信息 (Update Delivery Info)
- **Path:** `/channels/ec/order/deliveryinfo/update`
- **Method:** POST
- **Request Parameters:**

  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | order_id | string | Yes | 订单ID |
  | delivery_list | array DeliveryInfo | Yes | 物流信息列表 |

- **DeliveryInfo Struct:**

  | Field | Type | Required | Description |
  |-------|------|----------|-------------|
  | delivery_id | string | Yes | 快递公司编码 |
  | waybill_id | string | Yes | 快递单号 |
  | product_info_list | array FreightProductInfo | No | 包裹中商品信息 |

- **FreightProductInfo Struct:**

  | Field | Type | Required | Description |
  |-------|------|----------|-------------|
  | product_id | string | Yes | 商品id |
  | sku_id | string | Yes | sku_id |
  | product_cnt | number | Yes | 商品数量 |

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |

- **Error Codes:** 48001, 47001, 40097, 100002

### 同意用户修改收货地址申请 (Accept Address Change)
- **Path:** `/channels/ec/order/addressmodify/accept`
- **Method:** POST
- **Request Parameters:**

  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | order_id | string | Yes | 订单ID |

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |

- **Error Codes:** 48001, 47001, 40097, 100002

### 拒绝用户修改收货地址申请 (Reject Address Change)
- **Path:** `/channels/ec/order/addressmodify/reject`
- **Method:** POST
- **Request Parameters:**

  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | order_id | string | Yes | 订单ID |

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |

- **Error Codes:** 48001, 47001, 40097, 100002

## Quality Inspection

### 上传生鲜质检信息 (Upload Fresh Inspection Info)
- **Path:** `/channels/ec/order/freshinspect/submit`
- **Method:** POST
- **Request Parameters:**

  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | order_id | string | Yes | 订单ID |
  | inspect_info | object FreshInspectInfo | Yes | 生鲜质检信息 |

- **FreshInspectInfo Struct:**

  | Field | Type | Required | Description |
  |-------|------|----------|-------------|
  | video_url | string | No | 质检视频url |
  | image_url_list | array string | No | 质检图片url列表 |

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |

- **Error Codes:** 48001, 47001, 40097, 100002
- **Notes:** 仅适用于生鲜类质检订单

## Privacy & Virtual Numbers

### 解密订单中的详细收货信息 (Decrypt Sensitive Order Info)
- **Path:** `/channels/ec/order/sensitiveinfo/decode`
- **Method:** POST
- **Request Parameters:**

  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | order_id | string | Yes | 订单ID |

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |
  | address_info | object AddressInfo | 解密后的地址信息 |

- **Error Codes:** 48001, 47001, 40097, 100002
- **Notes:** 解密隐藏的买家信息（姓名、电话、地址）

### 申请查看订单真实号码 (Apply for Real Phone Number)
- **Path:** `/channels/ec/order/realnumber/apply`
- **Method:** POST
- **Request Parameters:**

  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | order_id | string | Yes | 订单ID |

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |

- **Error Codes:** 48001, 47001, 40097, 100002
- **Notes:** 当虚拟号码不够用时申请查看真实号码

### 查看订单真实号审核状态 (Get Real Number Audit Status)
- **Path:** `/channels/ec/order/realnumberviewaudit/get`
- **Method:** POST
- **Request Parameters:**

  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | order_id | string | Yes | 订单ID |

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |
  | audit_status | number | 审核状态 |
  | real_tel_number | string | 真实手机号(审核通过时返回) |

- **Error Codes:** 48001, 47001, 40097, 100002

### 订单再次申请虚拟号 (Reapply Virtual Number)
- **Path:** `/channels/ec/order/virtualnumber/applyagain`
- **Method:** POST
- **Request Parameters:**

  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | order_id | string | Yes | 订单ID |

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |
  | tel_number | string | 新的虚拟号码 |

- **Error Codes:** 48001, 47001, 40097, 100002
- **Notes:** 当虚拟号码过期时再次申请

### 订单虚拟号延期 (Extend Virtual Number)
- **Path:** `/channels/ec/order/virtualnumber/delay`
- **Method:** POST
- **Request Parameters:**

  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | order_id | string | Yes | 订单ID |

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |
  | expire_time | number | 新的过期时间 |

- **Error Codes:** 48001, 47001, 40097, 100002
- **Notes:** 过期前7天内可申请延期

## Gift Orders

### 礼物订单新增备注信息 (Add Gift Order Note)
- **Path:** `/channels/ec/order/presentnote/add`
- **Method:** POST
- **Request Parameters:**

  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | order_id | string | Yes | 订单ID |
  | present_note | string | No | 礼物留言 |

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |

- **Error Codes:** 48001, 47001, 40097, 100002

### 获取礼物单的子单列表 (Get Gift Sub-Orders)
- **Path:** `/channels/ec/order/presentsuborder/get`
- **Method:** POST
- **Request Parameters:**

  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | order_id | string | Yes | 礼物主订单ID |

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |
  | sub_order_id_list | array string | 子单订单号列表 |

- **Error Codes:** 48001, 47001, 40097, 100002

## Pre-Shipment SKU Change

### 获取所有待发货前更换sku待处理请求 (Get Pending SKU Change Requests)
- **Path:** `/channels/ec/order/preshipmentchangesku/get`
- **Method:** POST
- **Request Parameters:**

  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | page_size | number | No | 每页数量 |
  | next_key | string | No | 分页参数 |

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |
  | order_list | array PreshipmentChangeSkuInfo | 待处理换款请求列表 |
  | has_more | bool | 是否还有更多 |
  | next_key | string | 分页参数 |

- **PreshipmentChangeSkuInfo Struct:**

  | Field | Type | Description |
  |-------|------|-------------|
  | order_id | string | 订单ID |
  | old_sku_id | string | 原sku_id |
  | new_sku_id | string | 用户申请更换的sku_id |
  | ddl_time_stamp | number | 商家处理请求的最后时间 |

- **Error Codes:** 48001, 47001, 40097

### 同意待发货前更换sku请求 (Approve SKU Change)
- **Path:** `/channels/ec/order/preshipmentchangesku/approve`
- **Method:** POST
- **Request Parameters:**

  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | order_id | string | Yes | 订单ID |

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |

- **Error Codes:** 48001, 47001, 40097, 100002

### 拒绝待发货前更换sku请求 (Reject SKU Change)
- **Path:** `/channels/ec/order/preshipmentchangesku/reject`
- **Method:** POST
- **Request Parameters:**

  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | order_id | string | Yes | 订单ID |

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |

- **Error Codes:** 48001, 47001, 40097, 100002

## Private Number Management

### 添加待认证的手机号 (Add Phone for Virtual Number Verification)
- **Path:** `/channels/ec/merchant/privatenumber/addphone`
- **Method:** POST
- **Request Parameters:**

  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | phone_number | string | Yes | 待认证手机号 |

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |
  | url | string | 运营商认证页面URL |

- **Error Codes:** 48001, 47001, 40097
- **Notes:** 返回运营商认证页面URL，需要在手机浏览器中打开

### 获取短信验证码 (Get SMS Verification Code)
- **Path:** `/channels/ec/merchant/privatenumber/sendverifycode`
- **Method:** POST
- **Request Parameters:**

  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | phone_number | string | Yes | 手机号 |

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |

- **Error Codes:** 48001, 47001, 40097
- **Notes:** 向已认证的手机号发送验证码

### 获取小店手机号认证状态 (Get Phone Verification Status)
- **Path:** `/channels/ec/merchant/privatenumber/getphone`
- **Method:** POST
- **Request Parameters:**

  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | (none) | - | - | 无请求参数 |

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |
  | phone_number | string | 已认证的手机号 |
  | status | number | 认证状态 |

- **Error Codes:** 48001, 47001, 40097
