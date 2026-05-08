# Favorites Management (收藏管理)

## Store Favorites (店铺收藏)

### 获取店铺收藏的人数 (Get Store Favorites Count)
- **Path:** `/channels/ec/favorites/count/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | (none) | - | - | 无请求体 (No request body required, only access_token) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
  | total_count | Number | 总收藏人数 (Total favorites count) |
  | channel_list | Array\<Object\> | 各渠道收藏人数 (Favorites count breakdown by channel) |
  | channel_list[].channel | Number | 渠道类型 (Channel type: e.g., live, short video, shop window) |
  | channel_list[].count | Number | 该渠道收藏人数 (Favorites count for this channel) |
- **Notes:** Returns total favorites count and breakdown by channel (e.g., live, short video, shop window)
