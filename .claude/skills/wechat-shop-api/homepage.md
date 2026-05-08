# Homepage Management (主页管理)

## Product Sorting (商品排序)

### 获取主页展示商品列表 (Get Homepage Product List)
- **Path:** `/channels/ec/store/window/product/list/get`
- **Method:** POST
- **Request Parameters:**

  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | page_size | number | No | 每页数量(不超过50) |
  | next_key | string | No | 分页参数，首页不填 |

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |
  | product_id_list | array string | 商品id列表 |
  | has_more | bool | 是否还有更多 |
  | next_key | string | 分页参数 |
  | hide_product_id_list | array string | 被隐藏的商品id列表 |
  | settop_product_id | string | 被置顶的商品id |

- **Error Codes:** 48001, 47001, 40097

### 重新排序主页展示商品 (Reorder Homepage Products)
- **Path:** `/channels/ec/store/window/product/reorder`
- **Method:** POST
- **Request Parameters:**

  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | product_id_list | array string | Yes | 商品id列表，按展示顺序排列 |

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |

- **Error Codes:** 48001, 47001, 40097
- **Notes:** product_id_list中的商品id顺序即为展示顺序

### 隐藏小店主页商品 (Hide Homepage Product)
- **Path:** `/channels/ec/store/window/product/hide`
- **Method:** POST
- **Request Parameters:**

  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | product_id | string | Yes | 商品id |
  | is_hide | bool | Yes | 是否隐藏，true:隐藏，false:取消隐藏 |

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |

- **Error Codes:** 48001, 47001, 40097
- **Notes:** 隐藏的商品不会在小店主页展示，但不会下架，仍可通过其他渠道购买

### 置顶小店主页商品 (Pin Homepage Product)
- **Path:** `/channels/ec/store/window/product/settop`
- **Method:** POST
- **Request Parameters:**

  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | product_id | string | Yes | 商品id |
  | is_settop | bool | Yes | 是否置顶，true:置顶，false:取消置顶 |

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |

- **Error Codes:** 48001, 47001, 40097
- **Notes:** 仅可置顶一个商品

## Homepage Background (主页背景图)

### 提交主页背景图申请 (Submit Background Image Application)
- **Path:** `/channels/ec/basics/homepage/background/apply/submit`
- **Method:** POST
- **Request Parameters:**

  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | img_url | string | Yes | 背景图片url，需要通过图片上传接口获取 |

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |
  | apply_id | string | 申请id |

- **Error Codes:** 48001, 47001, 40097

### 查询主页背景图 (Query Background Image)
- **Path:** `/channels/ec/basics/homepage/background/get`
- **Method:** POST
- **Request Parameters:** None

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |
  | active_img_url | string | 当前生效的背景图url |
  | apply_list | array ApplyInfo | 申请中的背景图列表 |

- **ApplyInfo Struct:**

  | Field | Type | Description |
  |-------|------|-------------|
  | apply_id | string | 申请id |
  | img_url | string | 背景图url |
  | audit_status | number | 审核状态 |

- **Error Codes:** 48001, 47001, 40097
- **Notes:** 返回当前生效的背景图和审核中的申请

### 清空主页背景图并撤销流程中的申请 (Remove Background & Cancel Pending)
- **Path:** `/channels/ec/basics/homepage/background/remove`
- **Method:** POST
- **Request Parameters:** None

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |

- **Error Codes:** 48001, 47001, 40097
- **Notes:** 会清空当前生效的背景图并撤销所有审核中的申请

### 撤销主页背景图申请 (Cancel Background Application)
- **Path:** `/channels/ec/basics/homepage/background/apply/cancel`
- **Method:** POST
- **Request Parameters:**

  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | apply_id | string | Yes | 申请id |

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |

- **Error Codes:** 48001, 47001, 40097

## Featured Banner (精选展示位)

### 提交精选展示位申请 (Submit Banner Application)
- **Path:** `/channels/ec/basics/homepage/banner/apply/submit`
- **Method:** POST
- **Request Parameters:**

  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | img_url | string | Yes | banner图片url |
  | link | object LinkInfo | No | 跳转链接信息 |

- **LinkInfo Struct:**

  | Field | Type | Required | Description |
  |-------|------|----------|-------------|
  | product_id | string | No | 商品id |
  | path | string | No | 小程序路径 |

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |
  | apply_id | string | 申请id |

- **Error Codes:** 48001, 47001, 40097

### 查询精选展示位 (Query Banner)
- **Path:** `/channels/ec/basics/homepage/banner/get`
- **Method:** POST
- **Request Parameters:** None

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |
  | active_info | object BannerInfo | 当前生效的banner信息 |
  | apply_list | array ApplyInfo | 审核中的banner列表 |

- **BannerInfo Struct:**

  | Field | Type | Description |
  |-------|------|-------------|
  | img_url | string | banner图片url |
  | link | object LinkInfo | 跳转链接信息 |

- **ApplyInfo Struct:**

  | Field | Type | Description |
  |-------|------|-------------|
  | apply_id | string | 申请id |
  | img_url | string | banner图片url |
  | link | object LinkInfo | 跳转链接信息 |
  | audit_status | number | 审核状态 |

- **Error Codes:** 48001, 47001, 40097

### 清空精选展示位并撤销流程中的申请 (Remove Banner & Cancel Pending)
- **Path:** `/channels/ec/basics/homepage/banner/remove`
- **Method:** POST
- **Request Parameters:** None

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |

- **Error Codes:** 48001, 47001, 40097
- **Notes:** 会清空当前生效的banner并撤销所有审核中的申请

### 撤销精选展示位申请 (Cancel Banner Application)
- **Path:** `/channels/ec/basics/homepage/banner/apply/cancel`
- **Method:** POST
- **Request Parameters:**

  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | apply_id | string | Yes | 申请id |

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |

- **Error Codes:** 48001, 47001, 40097

## Product Categories (商品分类)

### 获取在店铺主页展示的商品分类 (Get Homepage Category Tree)
- **Path:** `/channels/ec/store/classification/tree/get`
- **Method:** POST
- **Request Parameters:** None

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |
  | classification_tree | array ClassificationNode | 分类树结构 |

- **ClassificationNode Struct:**

  | Field | Type | Description |
  |-------|------|-------------|
  | classification_id | string | 分类id |
  | name | string | 分类名称 |
  | parent_id | string | 父分类id |
  | sort | number | 排序值 |
  | children | array ClassificationNode | 子分类列表 |

- **Error Codes:** 48001, 47001, 40097

### 获取分类关联的商品ID列表 (Get Category Product IDs)
- **Path:** `/channels/ec/store/classification/tree/product/get`
- **Method:** POST
- **Request Parameters:**

  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | classification_id | string | Yes | 分类id |
  | page_size | number | No | 每页数量 |
  | next_key | string | No | 分页参数 |

- **Response Parameters:**

  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 |
  | errmsg | string | 错误信息 |
  | product_id_list | array string | 商品id列表 |
  | has_more | bool | 是否还有更多 |
  | next_key | string | 分页参数 |

- **Error Codes:** 48001, 47001, 40097
- **Notes:** 分类由分类树结构和分类-商品映射两部分组成
