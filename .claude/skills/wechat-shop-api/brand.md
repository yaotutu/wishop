# Brand Qualification (品牌资质)

### 新增品牌资质 (Add Brand Qualification)
- **Path:** `/shop/ec/brand/add`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | brand | object(Brand) | Yes | Brand detail object |
- **Brand Structure (Brand object):**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | brand_id | string(uint64) | Yes | Brand ID from brand library |
  | ch_name | string | No | Brand Chinese name |
  | en_name | string | No | Brand English name |
  | classification_no | string | Yes | Trademark class number, range 1-45 |
  | trade_mark_symbol | number | Yes | Trademark type: 1=R-mark, 2=TM-mark |
  | register_details.registrant | string | Yes | Trademark registrant (required for R-mark) |
  | register_details.register_no | string | Yes | Trademark registration number (required for R-mark) |
  | register_details.start_time | number | No | Registration validity start time |
  | register_details.end_time | number | No | Registration validity end time |
  | register_details.is_permanent | bool | Yes | Whether permanent validity |
  | register_details.register_certifications | array[string] | Yes | Registration cert file_ids (max 1) |
  | register_details.renew_certifications | array[string] | No | Renewal cert file_ids (max 5) |
  | application_details.acceptance_time | number | Yes | TM application acceptance time |
  | application_details.acceptance_certification | array[string] | No | TM acceptance cert file_id (max 1) |
  | application_details.acceptance_no | string | Yes | TM application number |
  | grant_type | number | No | Authorization type: 1=own brand, 2=authorized brand |
  | grant_details.grant_level | number | No | Authorization level (1-3), required for authorized brand |
  | grant_details.grant_certifications | array[string] | No | Authorization cert file_ids (max 9, old structure) |
  | grant_details.start_time | number | No | Authorization validity start time |
  | grant_details.end_time | number | No | Authorization validity end time |
  | grant_details.is_permanent | bool | No | Whether permanent authorization |
  | grant_details.brand_owner_id_photos | array[string] | No | Brand owner ID photo file_ids (max 2) |
  | grant_details.use_split_grant_info | number | No | >0 to use tiered authorization structure |
  | grant_details.grant_info_lv1.grant_certifications | array[string] | No | Level 1 authorization certs |
  | grant_details.grant_info_lv1.start_time | number | No | Level 1 authorization start time |
  | grant_details.grant_info_lv1.end_time | number | No | Level 1 authorization end time |
  | grant_details.grant_info_lv2.grant_certifications | array[string] | No | Level 2 authorization certs |
  | grant_details.grant_info_lv2.start_time | number | No | Level 2 authorization start time |
  | grant_details.grant_info_lv2.end_time | number | No | Level 2 authorization end time |
  | grant_details.grant_info_lv3.grant_certifications | array[string] | No | Level 3 authorization certs |
  | grant_details.grant_info_lv3.start_time | number | No | Level 3 authorization start time |
  | grant_details.grant_info_lv3.end_time | number | No | Level 3 authorization end time |
  | grant_details.contact_info_list | array[object] | No | Contact info list |
  | grant_details.contact_info_list.key | string | No | Contact key |
  | grant_details.contact_info_list.value | string | No | Contact value |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | audit_id | string(uint64) | Audit ID returned on successful submission |
- **Notes:** Each brand can only be added once. Use update API for existing brands. Must first get brand_id from brand library list. All cert files must be uploaded via upload qualification image API first. Error codes: 10020055 (invalid params), 10020050 (no permission), 10020080 (exceeded limit), 10020085 (under review), 10020086 (invalid file_id), 10020610 (brand already exists).

### 获取品牌库列表 (Get Brand Library List)
- **Path:** `/shop/ec/brand/all`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | keyword | string | No | Search keyword for brand name |
  | page_index | number | No | Page index, default 1 |
  | page_size | number | No | Page size, default 20 |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | total_num | number | Total count |
  | brands[] | array[object] | Brand list with brand_id, ch_name, en_name, etc. |
- **Notes:** Returns brands from the WeChat brand library. Use to find brand_id before calling brand/add.

### 撤回品牌资质审核 (Cancel Brand Audit)
- **Path:** `/shop/ec/brand/audit/cancel`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | brand_id | string(uint64) | Yes | Brand ID |
  | audit_id | string(uint64) | No | Audit ID to cancel |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
- **Notes:** Only brands in "under review" (status=1) can be withdrawn. After withdrawal, the brand can be resubmitted via update API. Error codes: 10020055, 10020050, 10020081 (brand not found), 10020085 (not under review).

### 删除品牌资质 (Delete Brand Qualification)
- **Path:** `/channels/ec/brand/delete`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | brand_id | string(uint64) | Yes | Brand ID to delete |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
- **Notes:** Deleting a brand will delist all products associated with that brand. Error codes: 10020055 (invalid params), 10020050 (no permission), 10020081 (brand not found).

### 获取品牌资质申请详情 (Get Brand Application Detail)
- **Path:** `/channels/ec/brand/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | brand_id | string(uint64) | Yes | Brand ID |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | brand | object(Brand) | Full brand qualification info (same structure as add API, plus status, create_time, update_time, audit_result) |
  | brand.status | number | Status: 1=under review, 2=review failed, 3=active, 4=withdrawn, 5=expiring soon, 6=expired |
  | brand.create_time | number | Creation time |
  | brand.update_time | number | Last update time |
  | brand.audit_result.audit_id | number | Audit ID |
  | brand.audit_result.reject_reason | string | Rejection reason (only for failed audits) |
- **Notes:** Returned file_ids need to be maintained by developers themselves. Error codes: 10020055, 10020050, 10020081.

### 获取品牌资质申请列表 (Get Brand Application List)
- **Path:** `/channels/ec/brand/list/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | page_index | number | No | Page index, default 1 |
  | page_size | number | No | Page size, default 20 |
  | status | number | No | Filter by status |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | total_num | number | Total count |
  | brands[] | array[object] | Brand application list |

### 更新品牌资质 (Update Brand Qualification)
- **Path:** `/channels/ec/brand/update`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | brand | object(Brand) | Yes | Updated brand detail (same structure as add API) |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | audit_id | string(uint64) | Audit ID returned on successful submission |
- **Notes:** Triggers review submission. Brands under review (status=1) must be withdrawn first via audit/cancel API before updating. Error codes same as add API.

### 获取生效中的品牌资质列表 (Get Active Brand List)
- **Path:** `/channels/ec/brand/valid/list/get`
- **Method:** POST
- **Request Parameters:**
  | Parameter | Type | Required | Description |
  |-----------|------|----------|-------------|
  | page_index | number | No | Page index, default 1 |
  | page_size | number | No | Page size, default 20 |
- **Response Parameters:**
  | Parameter | Type | Description |
  |-----------|------|-------------|
  | errcode | number | Error code |
  | errmsg | string | Error message |
  | total_num | number | Total count |
  | brands[] | array[object] | List of active (status=3) brand qualifications |
- **Notes:** Returns only brands with active/effective status. These are the brands that can be used for product listing.
