# Customer Complaint Work Orders (客诉工单)

### 查询工单分类配置 (Get Ticket Category Config)
- **Path:** `/channels/ec/platformkf/getticketclassconfig`
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
  | class_config[] | array[object] | Category configuration list |
  | class_config[].class_id | number | Category ID |
  | class_config[].class_name | string | Category name |
  | class_config[].options[] | array[object] | Handling options for this category |
  | class_config[].options[].option_id | number | Option ID |
  | class_config[].options[].option_name | string | Option name |
- **Notes:** Returns problem categories and corresponding handling options. Use these config values when handling tickets.

### 获取商家工单列表 (Get Merchant Ticket List)
- **Path:** `/channels/ec/platformkf/getmchticketlist`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | page_index | number | No | Page index, default 1 |
  | page_size | number | No | Page size, default 10, max 50 |
  | status | number | No | Filter by status: 0=pending, 1=processing, 2=resolved |
  | class_id | number | No | Filter by category ID |
  | start_time | number | No | Start time filter |
  | end_time | number | No | End time filter |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | total_num | number | Total count |
  | tickets[] | array[object] | Ticket list with ticket_id, order_id, status, class_id, create_time, etc. |
- **Notes:** Paginated. Supports filtering by status, category, and time range.

### 查询工单详情 (Get Ticket Detail)
- **Path:** `/channels/ec/platformkf/getmchticketdetail`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | ticket_id | string | Yes | Ticket ID |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | ticket | object | Ticket detail |
  | ticket.ticket_id | string | Ticket ID |
  | ticket.order_id | string | Associated order ID |
  | ticket.status | number | Ticket status |
  | ticket.class_id | number | Category ID |
  | ticket.class_name | string | Category name |
  | ticket.user_complaint | string | User complaint description |
  | ticket.create_time | number | Creation time |
  | ticket.handle_deadline | number | Handling deadline |
  | ticket.operations[] | array[object] | Operation history |
  | ticket.operations[].operation_type | number | Operation type |
  | ticket.operations[].description | string | Operation description |
  | ticket.operations[].create_time | number | Operation time |

### 商户处理商家工单 (Handle Merchant Ticket)
- **Path:** `/channels/ec/platformkf/operatemchticket`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | ticket_id | string | Yes | Ticket ID |
  | option_id | number | Yes | Selected handling option ID (from category config) |
  | content | string | No | Reply description text |
  | media_list[] | array[object] | No | Evidence media list |
  | media_list[].type | number | No | Media type: 1=image |
  | media_list[].url | string | No | Media URL |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
- **Notes:** Used to respond to customer complaint tickets. The option_id must correspond to a valid handling option from the category configuration. Evidence (images) can be attached to support the response.
