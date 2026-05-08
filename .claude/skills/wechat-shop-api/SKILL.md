---
name: wechat-shop-api
description: Use when integrating WeChat Store (微信小店) APIs, building e-commerce features on WeChat, debugging shop API calls, or looking up endpoint paths, parameters, or response formats for WeChat小店.
---

# WeChat Store Shop API Reference (微信小店 API)

Complete reference for the WeChat Store Shop server-side REST API.

**Base URL:** `https://api.weixin.qq.com`

## Quick Reference by Module

| Module | Endpoints | Reference File |
|--------|-----------|----------------|
| General / Token | 10 | [general.md](general.md) |
| Resource Upload | 7 | [resource.md](resource.md) |
| Store Management | 4 | [store.md](store.md) |
| Homepage Management | 14 | [homepage.md](homepage.md) |
| Product Management | 41 | [product.md](product.md) |
| Favorites | 1 | [favorites.md](favorites.md) |
| Category Management | 11 | [category.md](category.md) |
| Order Management | 23 | [order.md](order.md) |
| Fund Settlement | 16 | [funds.md](funds.md) |
| Marketing (Coupons) | 7 | [marketing.md](marketing.md) |
| After-Sales | 24 | [aftersale.md](aftersale.md) |
| Customer Service | 2 | [customer-service.md](customer-service.md) |
| Quality Inspection | 5 | [quality.md](quality.md) |
| Logistics & Shipping | 32 | [logistics.md](logistics.md) |
| Regional Warehouse | 11 | [warehouse.md](warehouse.md) |
| Alliance (优选联盟) | 10 | [alliance.md](alliance.md) |
| Brand Qualification | 8 | [brand.md](brand.md) |
| Drop Shipping (代发) | 13 | [dropship.md](dropship.md) |
| Enterprise WeChat | 1 | [enterprise-wecom.md](enterprise-wecom.md) |
| Mini Program Connection | 9 | [miniprogram.md](miniprogram.md) |
| Compass Merchant (罗盘) | 10 | [compass.md](compass.md) |
| Store Members | 4 | [membership.md](membership.md) |
| Mini Program Members | 7 | [membership.md#mini-program-members) |
| Government Subsidy | 3 | [subsidy.md](subsidy.md) |
| Customer Complaints | 4 | [complaints.md](complaints.md) |

## Common Patterns

### Authentication
All endpoints require `access_token` as URL parameter: `?access_token=ACCESS_TOKEN`

### Request Format
```
POST https://api.weixin.qq.com{path}?access_token=ACCESS_TOKEN
Content-Type: application/json

{request body}
```

### Response Format
```json
{
  "errcode": 0,
  "errmsg": "ok",
  ...data fields
}
```

### Error Codes
| Code | Description |
|------|-------------|
| 0 | Success |
| -1 | System error, retry later |
| 40001 | Invalid access_token |
| 42001 | access_token expired |
| 43104 | No permission for this APP |
| 48001 | API unauthorized |

## How to Use

1. Identify the module from the table above
2. Read the corresponding reference file for full endpoint details
3. Each endpoint includes: path, description, required parameters, and notes
