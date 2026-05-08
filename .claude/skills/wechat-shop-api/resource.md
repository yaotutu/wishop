# Resource Management (资源管理)

## Upload & Media

### 上传图片 (Upload Image)
- **Path:** `/shop/ec/basics/img/upload`
- **Method:** POST (multipart/form-data)
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | access_token | String | Yes | 接口调用凭证 (Access token, passed as query param) |
  | media | File | Yes | 图片文件 (Image file, supports PNG/JPEG/JPG/GIF/BMP) |
  | resp_type | Number | No | 返回类型 0=返回 media_id 1=返回 temp_url (Response type: 0=media_id, 1=temp_url) |
  | width | Number | No | 图片宽度 (Image width, for resp_type=1) |
  | height | Number | No | 图片高度 (Image height, for resp_type=1) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
  | media_id | String | 图片资源 ID (Image media ID for use in other APIs) |
  | temp_url | String | 临时图片 URL (Temporary image URL, when resp_type=1) |
- **Notes:** Maximum image file size: 10MB. Supported formats: PNG, JPEG, JPG, GIF, BMP. The media_id can be used in product, aftersale, and other APIs.

---

### 通过mediaid获取数据 (Get Media by ID)
- **Path:** `/channels/ec/basics/media/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | access_token | String | Yes | 接口调用凭证 (Access token, passed as query param) |
  | media_id | String | Yes | 多媒体资源 ID (Media resource ID) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | (binary data) | File | 返回多媒体文件二进制数据 (Returns media binary data) |
  | errcode | Number | 错误码（仅在出错时返回）|
  | errmsg | String | 错误信息（仅在出错时返回）|
- **Notes:** Returns media binary data directly. Use to retrieve images uploaded via img/upload or qualification/upload.

---

### 上传资质图片 (Upload Qualification Image)
- **Path:** `/shop/ec/basics/qualification/upload`
- **Method:** POST (multipart/form-data)
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | access_token | String | Yes | 接口调用凭证 (Access token, passed as query param) |
  | media | File | Yes | 资质图片文件 (Qualification image file) |
  | media_type | Number | No | 文件类型 (File type, for internal categorization) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
  | media_id | String | 资质图片资源 ID (Qualification image media ID) |
- **Notes:** Used for uploading business qualification/license images. Maximum file size limits apply.

## Video Upload (3-step process)

### 申请上传视频 (Initiate Video Upload)
- **Path:** `/shop/ec/basics/video/initupload`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | access_token | String | Yes | 接口调用凭证 (Access token, passed as query param) |
  | file_type | Number | Yes | 文件类型 1=视频 (File type, must be 1 for video) |
  | file_size | Number | Yes | 视频文件大小（字节）(Video file size in bytes) |
  | file_name | String | Yes | 视频文件名，例如 `video.mp4` (Video file name) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
  | upload_id | String | 上传 ID，用于后续分块上传 (Upload ID for chunked upload) |
  | media_id | String | 视频 media_id (Video media ID) |
  | part_info_list | Array | 分块信息列表 (Part info list with part_id and part_size) |
- **Notes:** Step 1 of 3-step video upload. Returns upload_id and media_id immediately. Maximum video size: 50MB.

---

### 上传视频数据分块 (Upload Video Chunk)
- **Path:** `/shop/ec/basics/video/uploadpart`
- **Method:** POST (multipart/form-data)
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | access_token | String | Yes | 接口调用凭证 (Access token, passed as query param) |
  | upload_id | String | Yes | 上传 ID，来自 initupload (Upload ID from initupload) |
  | part_id | Number | Yes | 分块序号，从 1 开始 (Part ID, 1-indexed) |
  | data | File | Yes | 分块数据 (Chunk binary data) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
- **Notes:** Step 2 of 3-step video upload. Chunk size should be 1MB-2MB. Upload each part sequentially.

---

### 完成视频上传 (Finish Video Upload)
- **Path:** `/shop/ec/basics/video/finishupload`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | access_token | String | Yes | 接口调用凭证 (Access token, passed as query param) |
  | upload_id | String | Yes | 上传 ID (Upload ID) |
  | part_id_list | Array\<Number\> | Yes | 已上传的分块序号列表 (List of uploaded part IDs) |
  | media_id | String | Yes | 视频 media_id (Video media ID from initupload) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
- **Notes:** Step 3 of 3-step video upload. Verifies all chunks are contiguous and complete. After this call, poll getplayinfo until video is ready.

---

### 获取上传后的视频临时URL (Get Video Temporary URL)
- **Path:** `/shop/ec/basics/video/getplayinfo`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | access_token | String | Yes | 接口调用凭证 (Access token, passed as query param) |
  | media_id | String | Yes | 视频 media_id (Video media ID) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | Number | 错误码 (Error code) |
  | errmsg | String | 错误信息 (Error message) |
  | play_url | String | 视频临时播放 URL (Temporary video play URL) |
  | status | Number | 视频状态 0=处理中 1=已完成 (Video status: 0=processing, 1=ready) |
- **Notes:** URL expires but the video submission remains valid. Poll this API after finishupload until status=1. If status=0, retry after a few seconds.
