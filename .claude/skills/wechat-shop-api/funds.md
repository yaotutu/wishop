# Fund Settlement (资金结算)

## Fund Account (资金账户)

### 获取账户余额 (Get Account Balance)
- **Path:** `/channels/ec/funds/getbalance`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | (none) | - | - | Pass empty JSON `{}` |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | available_amount | number | Available withdrawable balance (in cents/fen) |
  | pending_amount | number | Pending settlement balance (in cents/fen) |
  | sub_mchid | number | Sub-merchant ID |
- **Error Codes:** Common error codes
- **Notes:** Pass empty JSON `{}`. Balances are in Chinese cents (fen).

### 获取结算账户 (Get Settlement Account)
- **Path:** `/channels/ec/funds/getbankacct`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | (none) | - | - | Pass empty JSON `{}` |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | account_info.bank_account_type | string | Account type: `ACCOUNT_TYPE_BUSINESS` (corporate), `ACCOUNT_TYPE_PRIVATE` (personal) |
  | account_info.account_bank | string | Bank name |
  | account_info.bank_address_code | string | Bank province/city code |
  | account_info.bank_branch_id | string | Bank branch ID (lianhanghao) |
  | account_info.bank_name | string | Full bank name |
  | account_info.account_number | string | Bank account number |
  | account_info.account_name | string | Account holder name |
- **Error Codes:** Common error codes
- **Notes:** Pass empty JSON `{}`. `bank_account_type` enum: `ACCOUNT_TYPE_BUSINESS` = corporate bank account, `ACCOUNT_TYPE_PRIVATE` = business owner personal card.

### 获取资金流水详情 (Get Fund Flow Detail)
- **Path:** `/channels/ec/funds/getfundsflowdetail`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | flow_id | string | Yes | Flow ID, obtained from getfundsflowlist |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | funds_flow | object FundsFlow | Flow details |
  | funds_flow.flow_id | string | Flow ID |
  | funds_flow.funds_type | number | Fund type enum (1=order income, 2=fee, 3=refund, 4=withdraw, 5=withdraw fail refund, 10=alliance commission, 11=platform commission, 12=institution commission, 13=rebate card, 14=express refund advance, 15=express refund recover, 16=shipping insurance, 17=gift order freight refund, 18=service provider commission, 19=platform coupon, 20=make up freight) |
  | funds_flow.flow_type | number | Flow type: 1=income, 2=expense |
  | funds_flow.amount | number | Amount (in cents/fen) |
  | funds_flow.balance | number | Remaining balance (in cents/fen) |
  | funds_flow.related_info_list | Array\<RelatedInfo\> | Related info list |
  | funds_flow.bookkeeping_time | string | Accounting time |
  | funds_flow.remark | string | Remark |
  | funds_flow.related_info_list[].related_type | number | Related type: 1=order, 2=aftersale, 3=withdraw, 4=shipping insurance, 5=service guarantee, 6=gift, 7=group gift order list |
  | funds_flow.related_info_list[].order_id | string | Related order ID |
  | funds_flow.related_info_list[].aftersale_id | string | Related aftersale ID |
  | funds_flow.related_info_list[].withdraw_id | string | Related withdraw ID |
  | funds_flow.related_info_list[].transaction_id | string | Related payment transaction ID |
  | funds_flow.related_info_list[].guarantee_id | string | Related guarantee ID |
  | funds_flow.related_info_list[].present_id | string | Related gift ID |
  | funds_flow.related_info_list[].group_present_sub_order_id_list | string | Group gift related order IDs (comma-separated) |
- **Error Codes:** Common error codes, 10021302 (no data)

### 获取资金流水列表 (Get Fund Flow List)
- **Path:** `/channels/ec/funds/getfundsflowlist`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | page | number | No | Page number, starting from 1 |
  | page_size | number | No | Page size, default 10 |
  | start_time | number | No | Start time (unix timestamp) |
  | end_time | number | No | End time (unix timestamp). Max value depends on current time: before 16:00 max is previous day 00:00, after 16:00 max is current day 00:00 |
  | next_key | string | No | Pagination key from previous page. Required when page * page_size >= 10000 |
  | transaction_id | string | No | Payment transaction ID for filtering |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | flow_ids | Array\<string\> | List of flow IDs |
  | has_more | bool | Whether there is a next page |
  | next_key | string | Pagination key for deep pagination |
- **Error Codes:** Common error codes
- **Notes:** Same-day fund flows are available after 16:00 the next day. Buy-now-pay-later orders generate flows only after user confirmation of receipt.

### 获取提现记录 (Get Withdrawal Detail)
- **Path:** `/channels/ec/funds/getwithdrawdetail`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | withdraw_id | string | Yes | Withdrawal ID, from getwithdrawlist |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | amount | number | Withdrawal amount (in cents/fen) |
  | create_time | number | Creation time (unix timestamp) |
  | update_time | number | Update time (unix timestamp) |
  | reason | string | Failure reason |
  | remark | string | Remark |
  | bank_memo | string | Bank memo |
  | bank_name | string | Bank name |
  | bank_num | string | Bank account number |
  | status | string | Withdrawal status: `CREATE_SUCCESS`, `SUCCESS`, `FAIL`, `REFUND`, `CLOSE`, `INIT` |
- **Error Codes:** Common error codes
- **Notes:** Status enum: `CREATE_SUCCESS`=accepted, `SUCCESS`=withdrawn successfully, `FAIL`=failed, `REFUND`=refunded, `CLOSE`=closed, `INIT`=order created.

### 获取提现记录列表 (Get Withdrawal List)
- **Path:** `/channels/ec/funds/getwithdrawlist`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | page_num | number | Yes | Page number |
  | page_size | number | Yes | Page size |
  | start_time | number | No | Start time (unix timestamp) |
  | end_time | number | No | End time (unix timestamp) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | withdraw_ids | Array\<string\> | List of withdrawal IDs |
  | total_num | number | Total count of withdrawal records |
- **Error Codes:** Common error codes
- **Notes:** Returns withdrawal IDs; use `getwithdrawdetail` to get details for each.

### 修改结算账户 (Update Settlement Account)
- **Path:** `/channels/ec/funds/setbankacct`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | account_info.bank_account_type | string | Yes | Account type: `ACCOUNT_TYPE_BUSINESS` or `ACCOUNT_TYPE_PRIVATE` |
  | account_info.account_bank | string | Yes | Bank name |
  | account_info.bank_address_code | string | Yes | Bank province/city code |
  | account_info.bank_branch_id | string | No | Bank branch lianhanghao |
  | account_info.bank_name | string | No | Full bank name (required if "other bank") |
  | account_info.account_number | string | Yes | Bank account number |
  | account_info.account_bank4show | string | No | Display bank name (defaults to account_bank) |
  | account_info.account_name | string | No | Account holder name. Corporate must match company name, private must match legal representative |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
- **Error Codes:** Common error codes
- **Notes:** Max 5 modifications per day. Account must match shop entity (corporate=company name, personal=legal representative name).

### 商户提现 (Merchant Withdrawal)
- **Path:** `/channels/ec/funds/submitwithdraw`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | amount | number | Yes | Withdrawal amount (in cents/fen) |
  | remark | string | No | Withdrawal remark |
  | bank_memo | string | No | Bank memo |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | qrcode_ticket | string | QR code ticket for scanning confirmation |
  | withdraw_id | string | Withdrawal ID |
- **Error Codes:** Common error codes
- **Notes:** Max 1 withdrawal per day. Returns `qrcode_ticket` which must be scanned by admin for confirmation. Use `qrcode/get` to get the QR code image and `qrcode/check` to check scan status.

### 查询订单流水列表 (Query Order Flow List)
- **Path:** `/channels/ec/funds/listorderflow`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | page_size | number | No | 每页数量 (Page size) |
  | next_key | string | No | 分页key (Pagination key) |
  | start_time | number | No | 起始时间, 秒级时间戳 (Start time, unix seconds) |
  | end_time | number | No | 截止时间, 秒级时间戳 (End time, unix seconds) |
  | order_id | string | No | 订单号 (Order ID filter) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
  | flow_list | object[] | 流水列表 (Flow list) |
  | flow_list[].flow_id | string | 流水ID (Flow ID) |
  | flow_list[].order_id | string | 订单号 (Order ID) |
  | flow_list[].amount | number | 金额, 单位分 (Amount in fen) |
  | flow_list[].type | number | 类型 (Flow type) |
  | flow_list[].create_time | number | 创建时间 (Creation time) |
  | next_key | string | 下一页key (Next page key) |
  | has_more | bool | 是否有下一页 (Has more) |
- **Notes:** Queries order transaction flow list with pagination.

---

## Bank Card (银行卡)

### 根据卡号查银行信息 (Get Bank Info by Card Number)
- **Path:** `/shop/funds/getbankbynum`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | bank_card_number | string | Yes | 银行卡号 (Bank card number) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
  | bank_name | string | 银行名称 (Bank name) |
  | bank_code | string | 银行编码 (Bank code) |
  | card_type | number | 卡类型: 1=借记卡, 2=信用卡 (Card type: 1=debit, 2=credit) |
- **Notes:** Looks up bank information by card number.

---

### 搜索银行列表 (Search Bank List)
- **Path:** `/shop/funds/getbanklist`
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
  | bank_list | object[] | 银行列表 (Bank list) |
  | bank_list[].bank_name | string | 银行名称 (Bank name) |
  | bank_list[].bank_code | string | 银行编码 (Bank code) |
- **Notes:** Returns available bank list for settlement account setup.

---

### 查询城市列表 (Get City List)
- **Path:** `/shop/funds/getcity`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | province_code | string | Yes | 省份编码 (Province code) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
  | city_list | object[] | 城市列表 (City list) |
  | city_list[].city_code | string | 城市编码 (City code) |
  | city_list[].city_name | string | 城市名称 (City name) |
- **Notes:** Queries city list by province code for bank address setup.

---

### 查询大陆银行省份列表 (Get Province List)
- **Path:** `/shop/funds/getprovince`
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
  | province_list | object[] | 省份列表 (Province list) |
  | province_list[].province_code | string | 省份编码 (Province code) |
  | province_list[].province_name | string | 省份名称 (Province name) |
- **Notes:** Returns mainland bank province list.

---

### 查询支行列表 (Get Branch List)
- **Path:** `/shop/funds/getsubbranch`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | bank_code | string | Yes | 银行编码 (Bank code) |
  | city_code | string | Yes | 城市编码 (City code) |
  | offset | number | No | 分页偏移 (Pagination offset) |
  | limit | number | No | 每页数量 (Page size) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | 错误码 (Error code) |
  | errmsg | string | 错误信息 (Error message) |
  | subbranch_list | object[] | 支行列表 (Branch list) |
  | subbranch_list[].subbranch_name | string | 支行名称 (Branch name) |
  | subbranch_list[].subbranch_id | string | 联行号 (Bank branch ID/lianhanghao) |
  | total | number | 总数 (Total count) |
- **Notes:** Queries bank sub-branch list for settlement account configuration.

## Fund QR Code (资金二维码)

### 获取二维码 (Get Fund QR Code)
- **Path:** `/shop/funds/qrcode/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | qrcode_ticket | string | Yes | QR code ticket, obtained from submitwithdraw |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | qrcode_buf | string | QR code image data (base64 encoded binary, needs base64 decode) |
- **Error Codes:** Common error codes, -2 (token too long), 60220 (ticket expired), 60208 (invalid ticket)
- **Notes:** The `qrcode_ticket` comes from the `submitwithdraw` response. The returned image needs base64 decoding.

### 查询扫码状态 (Check QR Scan Status)
- **Path:** `/shop/funds/qrcode/check`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | qrcode_ticket | string | Yes | QR code ticket, from submitwithdraw |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | status | number | Scan status: 0=not scanned, 1=confirmed, 2=cancelled, 3=expired, 4=scanned |
  | self_check_err_code | number | Business error code |
  | self_check_err_msg | string | Business error message |
  | scan_user_type | number | Scanner identity: 0=non-admin, 1=admin, 2=sub-admin |
- **Error Codes:** Common error codes
- **Notes:** Poll this endpoint after generating QR code to check if admin has scanned and confirmed the withdrawal.
