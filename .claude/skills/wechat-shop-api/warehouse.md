# Regional Warehouse (区域仓库)

### 创建区域仓库 (Create Warehouse)
- **Path:** `/channels/ec/warehouse/create`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | out_warehouse_id | string | Yes | External warehouse ID. Max 128 chars. Only [0-9, a-z, A-Z, -_.] allowed. Unique per shop. |
  | name | string | Yes | Warehouse name |
  | intro | string | Yes | Warehouse description |
  | cover_locations | array[object] | No | Coverage areas. Can be added after creation. |
  | cover_locations[].address_id1 | number | Yes | Province address code |
  | cover_locations[].address_id2 | number | No | City address code |
  | cover_locations[].address_id3 | number | No | District address code |
  | cover_locations[].address_id4 | number | No | Street address code |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
- **Notes:** address_id1 is required in cover_locations; others can be 0. Coverage rules: (A,0,0,0)=province only; (A,B,0,0)=city; (A,B,C,0)=district; (A,B,C,D)=street. Error codes: 10020200 (invalid out_warehouse_id), 10020203 (invalid address_id), 10020205 (empty name/intro).

### 查询区域仓库列表 (Get Warehouse List)
- **Path:** `/channels/ec/warehouse/list/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | offset | number | No | Page offset, default 0 |
  | limit | number | No | Page size, default 20, max 200 |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | total_num | number | Total count |
  | warehouses[] | array[object] | Warehouse list |
  | warehouses[].out_warehouse_id | string | External warehouse ID |
  | warehouses[].name | string | Warehouse name |
  | warehouses[].intro | string | Warehouse description |
- **Notes:** Returns sorted by creation time ascending.

### 获取区域仓库 (Get Warehouse)
- **Path:** `/channels/ec/warehouse/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | out_warehouse_id | string | Yes | External warehouse ID |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | data.out_warehouse_id | string | External warehouse ID |
  | data.name | string | Warehouse name |
  | data.intro | string | Warehouse description |
  | data.cover_locations[] | array[object] | Coverage areas |
  | data.cover_locations[].address_id1 | number | Province address code |
  | data.cover_locations[].address_id2 | number | City address code |
  | data.cover_locations[].address_id3 | number | District address code |
  | data.cover_locations[].address_id4 | number | Street address code |
- **Notes:** Error code 10020202 means out_warehouse_id does not exist.

### 修改区域仓库详情 (Update Warehouse Detail)
- **Path:** `/channels/ec/warehouse/detail/update`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | out_warehouse_id | string | Yes | External warehouse ID |
  | name | string | No | New warehouse name |
  | intro | string | No | New warehouse description |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
- **Notes:** Updates the warehouse name and/or description. At least one of name or intro should be provided.

### 批量增加覆盖区域 (Batch Add Coverage Areas)
- **Path:** `/channels/ec/warehouse/coverlocations/add`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | out_warehouse_id | string | Yes | External warehouse ID |
  | cover_locations | array[object] | Yes | Coverage areas to add |
  | cover_locations[].address_id1 | number | Yes | Province address code |
  | cover_locations[].address_id2 | number | No | City address code |
  | cover_locations[].address_id3 | number | No | District address code |
  | cover_locations[].address_id4 | number | No | Street address code |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
- **Notes:** Adds coverage areas to an existing warehouse. Error code 10020203 for invalid address_id.

### 批量删除覆盖区域 (Batch Delete Coverage Areas)
- **Path:** `/channels/ec/warehouse/coverlocations/del`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | out_warehouse_id | string | Yes | External warehouse ID |
  | cover_locations | array[object] | Yes | Coverage areas to remove |
  | cover_locations[].address_id1 | number | Yes | Province address code |
  | cover_locations[].address_id2 | number | No | City address code |
  | cover_locations[].address_id3 | number | No | District address code |
  | cover_locations[].address_id4 | number | No | Street address code |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |

### 获取指定地址下区域仓库的优先级 (Get Warehouse Priority by Address)
- **Path:** `/channels/ec/warehouse/address/prioritysort/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | address_id1 | number | Yes | Province address code |
  | address_id2 | number | No | City address code |
  | address_id3 | number | No | District address code |
  | address_id4 | number | No | Street address code |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | data.priority_list[] | array[object] | Priority-sorted warehouse list |
  | data.priority_list[].out_warehouse_id | string | External warehouse ID |
  | data.priority_list[].priority | number | Priority value (lower = higher priority) |

### 设置指定地址下区域仓库的优先级 (Set Warehouse Priority by Address)
- **Path:** `/channels/ec/warehouse/address/prioritysort/set`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | address_id1 | number | Yes | Province address code |
  | address_id2 | number | No | City address code |
  | address_id3 | number | No | District address code |
  | address_id4 | number | No | Street address code |
  | priority_list | array[object] | Yes | Priority list to set |
  | priority_list[].out_warehouse_id | string | Yes | External warehouse ID |
  | priority_list[].priority | number | Yes | Priority value |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |

### 更新区域仓库存数量 (Update Warehouse Stock)
- **Path:** `/channels/ec/warehouse/stock/update`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | out_warehouse_id | string | Yes | External warehouse ID |
  | sku_infos | array[object] | Yes | SKU stock info list |
  | sku_infos[].product_id | number | Yes | Product ID |
  | sku_infos[].sku_id | number | Yes | SKU ID |
  | sku_infos[].stock_num | number | Yes | New stock quantity |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
- **Notes:** Directly sets the stock quantity for the specified SKU in the warehouse.

### 获取区域仓库存数量 (Get Warehouse Stock)
- **Path:** `/channels/ec/warehouse/stock/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | out_warehouse_id | string | Yes | External warehouse ID |
  | sku_infos | array[object] | Yes | SKU query list |
  | sku_infos[].product_id | number | Yes | Product ID |
  | sku_infos[].sku_id | number | Yes | SKU ID |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | data.sku_infos[] | array[object] | SKU stock info |
  | data.sku_infos[].product_id | number | Product ID |
  | data.sku_infos[].sku_id | number | SKU ID |
  | data.sku_infos[].stock_num | number | Current stock quantity |

### 获取地址行政编码 (Get Address Administrative Code)
- **Path:** `/channels/ec/basics/addresscode/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | address_id | number | No | Parent address code. If empty, returns province-level codes. |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | data.address_codes[] | array[object] | Address code list |
  | data.address_codes[].address_id | number | Address code |
  | data.address_codes[].name | string | Address name |
- **Notes:** Up to 4 levels of address codes. Call without address_id to get provinces, then use returned address_id to drill down to cities, districts, and streets.
