# Enterprise WeChat (企业微信)

### 获取关联账号企微id (Get Enterprise WeChat ID)
- **Path:** `/channels/ec/wecom/get_wecom_id`
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
  | corp_id | string | Enterprise WeChat corp ID |
  | user_id | string | Enterprise WeChat user ID |
- **Notes:** Returns the Enterprise WeChat IDs associated with the current shop account. These IDs are used as query parameters in other WeChat Work APIs.
