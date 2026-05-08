# Category Management (类目管理)

## Category CRUD

### 获取所有类目 (Get All Categories)
- **Path:** `/shop/ec/category/all`
- **Method:** POST
- **Request Parameters:** None

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |
  | category_list | array CategoryInfo | 类目列表 |

- **CategoryInfo Struct:**

  | Field | Type | Description |
  |-------|------|-------------|
  | category_id | number | 类目id |
  | name | string | 类目名称 |
  | level | number | 类目层级(1/2/3) |
  | parent_category_id | number | 父类目id，一级类目为0 |
  | children | array CategoryInfo | 子类目列表 |
  | qualification | object QualificationInfo | 类目资质信息 |
  | product_qualification | object QualificationInfo | 商品资质信息 |

- **QualificationInfo Struct:**

  | Field | Type | Description |
  |-------|------|-------------|
  | fields | array QualificationField | 资质字段列表 |

- **QualificationField Struct:**

  | Field | Type | Description |
  |-------|------|-------------|
  | key | string | 字段key |
  | name | string | 字段名称 |
  | type | string | 字段类型：select_one(单选)/select_many(多选)/integer(整数)/integer_unit(整数+单位)/decimal4(小数)/decimal4_unit(小数+单位) |
  | required | bool | 是否必填 |
  | options | array Option | 选项列表(type为select时) |

- **Error Codes:** 48001, 47001, 40097
- **Notes:** 返回所有类目信息，包括资质信息和商品资质信息

### 获取类目信息 (Get Category Detail)
- **Path:** `/shop/ec/category/detail`
- **Method:** POST
- **Request Parameters:**

  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | leaf_category_id | number | Yes | 叶子类目id(最末级类目) |

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |
  | category_detail | object CategoryDetail | 类目详情 |

- **CategoryDetail Struct:**

  | Field | Type | Description |
  |-------|------|-------------|
  | category_id | number | 类目id |
  | name | string | 类目名称 |
  | level | number | 类目层级 |
  | qualification | object QualificationInfo | 类目资质 |
  | product_qualification | object QualificationInfo | 商品资质 |
  | brand_qualification | object QualificationInfo | 品牌资质 |
  | limit_info | object LimitInfo | 限制信息 |

- **Error Codes:** 48001, 47001, 40097

### 申请类目 (Apply for Category)
- **Path:** `/channels/ec/category/add`
- **Method:** POST
- **Request Parameters:**

  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | leaf_category_id | number | Yes | 叶子类目id |
  | qualification | object QualificationData | No | 类目资质数据 |
  | product_qualification | object QualificationData | No | 商品资质数据 |

- **QualificationData Struct:**

  | Field | Type | Required | Description |
  |-------|------|----------|-------------|
  | fields | array FieldValue | No | 资质字段值列表 |

- **FieldValue Struct:**

  | Field | Type | Required | Description |
  |-------|------|----------|-------------|
  | key | string | Yes | 字段key |
  | value | string | Yes | 字段值 |

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |
  | audit_id | string | 审核单id |

- **Error Codes:** 48001, 47001, 40097, 100001
- **Notes:** 提交类目申请后需要等待审核，审核结果通过回调通知

### 获取店铺的类目审核单列表 (Get Category Audit List)
- **Path:** `/shop/ec/category/getbizcatflowlist`
- **Method:** POST
- **Request Parameters:**

  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | page_size | number | No | 每页数量(不超过50) |
  | next_key | string | No | 分页参数 |

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |
  | biz_cat_flow_list | array BizCatFlowInfo | 审核单列表 |
  | has_more | bool | 是否还有更多 |
  | next_key | string | 分页参数 |

- **BizCatFlowInfo Struct:**

  | Field | Type | Description |
  |-------|------|-------------|
  | audit_id | string | 审核单id |
  | category_id | number | 类目id |
  | category_name | string | 类目名称 |
  | status | number | 审核状态：1:审核中，2:审核通过，3:审核拒绝 |
  | reject_reason | string | 拒绝原因 |
  | create_time | number | 提交时间 |

- **Error Codes:** 48001, 47001, 40097

### 获取店铺的类目审核单详情 (Get Category Audit Detail)
- **Path:** `/shop/ec/category/getbizcatflowdetail`
- **Method:** POST
- **Request Parameters:**

  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | audit_id | string | Yes | 审核单id |

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |
  | audit_detail | object AuditDetail | 审核单详情 |

- **AuditDetail Struct:**

  | Field | Type | Description |
  |-------|------|-------------|
  | audit_id | string | 审核单id |
  | category_id | number | 类目id |
  | category_name | string | 类目名称 |
  | status | number | 审核状态：1:审核中，2:审核通过，3:审核拒绝 |
  | reject_reason | string | 拒绝原因 |
  | create_time | number | 提交时间 |
  | qualification | object QualificationData | 提交的类目资质数据 |
  | product_qualification | object QualificationData | 提交的商品资质数据 |

- **Error Codes:** 48001, 47001, 40097, 100002

### 获取店铺的类目权限列表 (Get Category Permission List)
- **Path:** `/shop/ec/category/get_category_relation_list`
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
  | category_relation_list | array CategoryRelationInfo | 类目权限列表 |
  | has_more | bool | 是否还有更多 |
  | next_key | string | 分页参数 |

- **CategoryRelationInfo Struct:**

  | Field | Type | Description |
  |-------|------|-------------|
  | category_id | number | 类目id |
  | category_name | string | 类目名称 |
  | status | number | 权限状态 |

- **Error Codes:** 48001, 47001, 40097

### 获取店铺的类目权限详情 (Get Category Permission Detail)
- **Path:** `/shop/ec/category/get_category_relation_detail`
- **Method:** POST
- **Request Parameters:**

  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | category_id | number | Yes | 类目id |

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |
  | category_detail | object CategoryRelationDetail | 类目权限详情 |

- **CategoryRelationDetail Struct:**

  | Field | Type | Description |
  |-------|------|-------------|
  | category_id | number | 类目id |
  | category_name | string | 类目名称 |
  | qualification_list | array QualificationDetail | 资质详情列表 |
  | status | number | 权限状态 |

- **Error Codes:** 48001, 47001, 40097, 100002

### 撤销类目审核 (Cancel Category Audit)
- **Path:** `/shop/ec/category/audit/cancel`
- **Method:** POST
- **Request Parameters:**

  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | audit_id | string | Yes | 审核单id |

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |

- **Error Codes:** 48001, 47001, 40097, 100002
- **Notes:** 仅可撤销审核中的申请

## Category Rules (类目规则)

### 获取保证金类目规则 (Get Deposit Category Rule)
- **Path:** `/shop/ec/category/getcategoryrule`
- **Method:** POST
- **Request Parameters:**

  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | rule_type | number | Yes | 规则类型，1:保证金规则 |

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |
  | rule_list | array CategoryRule | 类目规则列表 |

- **CategoryRule Struct:**

  | Field | Type | Description |
  |-------|------|-------------|
  | category_id | number | 类目id |
  | category_name | string | 类目名称 |
  | deposit_amount | number | 保证金金额，单位为分 |

- **Error Codes:** 48001, 47001, 40097
- **Notes:** 返回各分类的保证金金额要求

### 获取发货方式类目规则 (Get Shipping Method Category Rule)
- **Path:** `/shop/ec/category/getcategoryrule`
- **Method:** POST
- **Request Parameters:**

  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | rule_type | number | Yes | 规则类型，2:发货方式规则 |

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |
  | rule_list | array CategoryRule | 类目规则列表 |

- **CategoryRule Struct:**

  | Field | Type | Description |
  |-------|------|-------------|
  | category_id | number | 类目id |
  | category_name | string | 类目名称 |
  | delivery_method | number | 发货方式，0:快递发货，1:虚拟发货 |

- **Error Codes:** 48001, 47001, 40097
- **Notes:** 同一个接口路径，通过rule_type区分不同的规则类型

### 获取类目下商品发布规则 (Get Category Product Publishing Rule)
- **Path:** `/shop/ec/category/getcategoryproductrule`
- **Method:** POST
- **Request Parameters:**

  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | category_id | number | Yes | 叶子类目id |

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |
  | product_rule | object ProductRule | 商品发布规则 |

- **ProductRule Struct:**

  | Field | Type | Description |
  |-------|------|-------------|
  | category_id | number | 类目id |
  | category_name | string | 类目名称 |
  | fields | array RuleField | 规则字段列表 |

- **RuleField Struct:**

  | Field | Type | Description |
  |-------|------|-------------|
  | key | string | 字段key |
  | name | string | 字段名称 |
  | type | string | 字段类型 |
  | required | bool | 是否必填 |
  | options | array Option | 选项列表 |

- **Error Codes:** 48001, 47001, 40097
