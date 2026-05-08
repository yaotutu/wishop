# Government Subsidy Management (国补管理)

## Invoice Management (发票管理)

### 获取国补订单开票信息 (Get Subsidy Order Invoice Info)
- **Path:** `/channels/ec/subsidy/query_invoicing_info`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | order_id | string | Yes | Order ID that used government subsidy |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | invoicing_info | object | Invoice info including order_id, invoice_status, invoice_no, invoice_amount, invoice_time, etc. |
  | invoicing_info.invoice_status | number | Invoice status: 0=not invoiced, 1=invoiced, 2=failed |
  | invoicing_info.invoice_no | string | Invoice number |
  | invoicing_info.invoice_amount | number | Invoice amount in cents |
  | invoicing_info.invoice_time | number | Invoice issuance time |
- **Notes:** Must be an order that used government subsidy. Error code indicates if the order is not a subsidy order.

### 上传国补订单发票信息 (Upload Subsidy Order Invoice Info)
- **Path:** `/channels/ec/subsidy/upload_invoice_info`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | order_id | string | Yes | Order ID |
  | invoice_no | string | Yes | Invoice number |
  | invoice_code | string | No | Invoice code |
  | invoice_amount | number | Yes | Invoice amount in cents |
  | invoice_time | number | Yes | Invoice issuance time (unix timestamp) |
  | invoice_type | number | No | Invoice type |
  | buyer_name | string | No | Buyer name on invoice |
  | buyer_tax_no | string | No | Buyer tax number |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
- **Notes:** Must be an order that used government subsidy. Uploads the invoice details for audit compliance.

### 上传国补订单发票文件 (Upload Subsidy Order Invoice File)
- **Path:** `/channels/ec/subsidy/upload_invoice_file`
- **Method:** POST
- **Request Parameters:** (multipart/form-data)
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | order_id | string | Yes | Order ID |
  | invoice_file | file | Yes | Invoice file (image or PDF) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | file_id | string | Uploaded file ID |
- **Notes:** Use this to prevent invoice file expiration causing audit failure. Uploads the actual invoice file for the subsidy order. Supported formats: JPG, PNG, PDF. Max file size: 5MB.
