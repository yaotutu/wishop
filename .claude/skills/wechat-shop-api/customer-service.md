# Merchant Customer Service (商家客服)

### 上传多媒体资源 (Upload Media Resource)
- **Path:** `/channels/ec/commkf/cosupload`
- **Method:** POST (multipart/form-data)
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | access_token | String | Yes | 接口调用凭证 (Access token, passed as query param) |
  | media | File | Yes | 多媒体文件 (Media file: image/video/file) |
  | type | Number | Yes | 文件类型 0=图片 1=视频 2=文件 (File type) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
  | media_id | String | 多媒体资源 ID (Media resource ID for use in sendmsg) |
- **Notes:** Upload images, videos, and files for use in customer service conversations. Maximum file size limits apply per type.

---

### 发送消息 (Send Customer Service Message)
- **Path:** `/channels/ec/commkf/sendmsg`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | access_token | String | Yes | 接口调用凭证 (Access token, passed as query param) |
  | touser | String | Yes | 用户的 openid (User's openid) |
  | msgtype | String | Yes | 消息类型: text/image/video/file/link/order_share/product_share |
  | text | Object | Conditional | 文本消息内容，msgtype=text 时必填 `{"content": "..."}` |
  | image | Object | Conditional | 图片消息，msgtype=image 时必填 `{"media_id": "..."}` |
  | video | Object | Conditional | 视频消息，msgtype=video 时必填 `{"media_id": "..."}` |
  | file | Object | Conditional | 文件消息，msgtype=file 时必填 `{"media_id": "..."}` |
  | order_share | Object | Conditional | 订单分享卡片消息 (Order share card, msgtype=order_share) |
  | product_share | Object | Conditional | 商品分享卡片消息 (Product share card, msgtype=product_share) |
- **Text Message Object:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | content | String | 文本消息内容 (Text content, max 2048 bytes) |
- **Image Message Object:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | media_id | String | 图片资源 ID (Image media ID from cosupload) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
- **Supported Message Types:**
  - `text` - 文本消息 (Text message)
  - `image` - 图片消息 (Image message)
  - `video` - 视频消息 (Video message)
  - `file` - 文件消息 (File message)
  - `order_share` - 订单分享卡片消息 (Order share card message)
  - `product_share` - 商品分享卡片消息 (Product share card message)
- **Notes:** Must call within 48 hours of user's last message to the merchant
