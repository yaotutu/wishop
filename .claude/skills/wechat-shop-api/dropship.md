# Drop Shipping Management (代发管理)

## Supplier Association (关联供货商)

### 获取供货商列表 (Get Supplier List)
- **Path:** `/channels/ec/supplier/relation/get_supplier_list`
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
  | suppliers[] | array[object] | Supplier list with supplier_id, supplier_name, status, etc. |
- **Notes:** Returns list of associated suppliers. Status values: 1=pending, 2=active, 3=rejected.

### 申请关联供货商 (Apply to Associate with Supplier)
- **Path:** `/channels/ec/supplier/relation/invite_supplier`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | supplier_appid | string | Yes | Supplier's appid |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
- **Notes:** Sends an invitation to the supplier. The supplier must accept the invitation to establish the relationship.

## Auto-Distribution Settings (自动分配设置)

### 获取分配方式 (Get Distribution Method)
- **Path:** `/channels/ec/supplier/relation/get_distribute`
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
  | distribute_type | number | Distribution type: 0=manual, 1=all to one supplier, 2=by product |
  | default_supplier_id | string | Default supplier ID (when type=1) |
- **Notes:** Returns the current auto-distribution configuration for the shop.

### 设置全店订单手动分配 (Set Manual Distribution)
- **Path:** `/channels/ec/supplier/relation/set_manually_distribute`
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
- **Notes:** Applies to new orders only. Existing orders are not affected.

### 设置全店订单自动分配 (Set Auto Distribution - All to One)
- **Path:** `/channels/ec/supplier/relation/set_all_distribution`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | supplier_id | string | Yes | Supplier ID to assign all new orders to |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
- **Notes:** Auto-assigns all new orders to the specified supplier.

### 设置按商品自动分配 (Set Auto Distribution - By Product)
- **Path:** `/channels/ec/supplier/relation/set_product_distribute`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | product_distribute_list[] | array[object] | Yes | Product-supplier mapping list |
  | product_distribute_list[].product_id | number | Yes | Product ID |
  | product_distribute_list[].supplier_id | string | Yes | Supplier ID for this product |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
- **Notes:** Auto-assigns orders by product_id to the specified supplier. Each product can be mapped to one supplier.

### 获取商品对应的自动分配供货商 (Get Product Default Supplier)
- **Path:** `/channels/ec/supplier/relation/get_product_default_distribute`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | product_id | number | Yes | Product ID |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | supplier_id | string | Default supplier ID for this product |

### 获取按商品自动分配的商品列表 (Get Auto-Distribution Product List)
- **Path:** `/channels/ec/supplier/relation/get_product_list`
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
  | product_distribute_list[] | array[object] | Product-supplier mapping list |

## Drop Ship Order Management (代发单管理)

### 分配订单代发 (Assign Drop Ship Order)
- **Path:** `/channels/ec/order/dropship/assign`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | order_id | string | Yes | Order ID |
  | product_infos[] | array[object] | Yes | Product info list for assignment |
  | product_infos[].product_id | number | Yes | Product ID |
  | product_infos[].sku_id | number | Yes | SKU ID |
  | supplier_id | string | Yes | Supplier ID to assign to |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
- **Notes:** Manually assigns specific order items to a supplier for drop shipping.

### 取消分配代发单 (Cancel Drop Ship Assignment)
- **Path:** `/channels/ec/order/dropship/cancel`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | order_id | string | Yes | Order ID |
  | product_infos[] | array[object] | Yes | Product info list to cancel |
  | product_infos[].product_id | number | Yes | Product ID |
  | product_infos[].sku_id | number | Yes | SKU ID |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
- **Notes:** Cancels the drop ship assignment for specified order items.

### 查询代发单详情 (Get Drop Ship Order Detail)
- **Path:** `/channels/ec/order/dropship/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | order_id | string | Yes | Order ID |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | dropship_order | object | Drop ship order detail including supplier_id, status, product info, etc. |

### 拉取代发单列表 (Get Drop Ship Order List)
- **Path:** `/channels/ec/order/dropship/list`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | page_index | number | No | Page index, default 1 |
  | page_size | number | No | Page size, default 10 |
  | status | number | No | Filter by drop ship status |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | total_num | number | Total count |
  | dropship_orders[] | array[object] | Drop ship order list |

### 搜索代发单 (Search Drop Ship Orders)
- **Path:** `/channels/ec/order/dropship/search`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | keyword | string | No | Search keyword (order ID, product name, etc.) |
  | start_time | number | No | Start time for search range |
  | end_time | number | No | End time for search range |
  | status | number | No | Filter by status |
  | page_index | number | No | Page index, default 1 |
  | page_size | number | No | Page size, default 10 |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | total_num | number | Total count |
  | dropship_orders[] | array[object] | Matching drop ship orders |
- **Notes:** Supports searching by order ID, product name, time range, and status.
