# API Documentation

## Base URL
```
Development: http://localhost:3000/api
Production:  https://your-domain.com/api
```

## Authentication

All API routes (except `/api/setup` and `/api/auth/*`) require authentication via Supabase session cookies. The middleware automatically validates the session and extracts the user's organization context.

## Headers
```
Content-Type: application/json
Authorization: Bearer <supabase_access_token>  # For server-to-server calls
```

## Response Format

### Success
```json
{
  "data": {},
  "success": true
}
```

### Error
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "status": 400
}
```

## Endpoints

### 🔐 Authentication

#### Bootstrap Organization (One-time)
```http
POST /api/setup
Content-Type: application/json

{
  "email": "owner@company.com",
  "name": "Business Owner"
}
```
**Response:** `{ success: true, organization_id: "uuid", message: "Bootstrap complete" }`

#### Sign Up
```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@company.com",
  "password": "securepassword"
}
```

#### Login
Handled by Supabase client SDK on frontend.

---

### 👥 Customers

#### List Customers
```http
GET /api/customers?search=&page=1&limit=20
```
**Query Params:**
- `search`: Search by name, phone, email
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response:** `{ data: Customer[], total: number, page: number }`

#### Create Customer
```http
POST /api/customers
Content-Type: application/json

{
  "customer_name": "John Doe",
  "phone_number": "+919876543210",
  "alt_phone_number": "+919876543211",
  "email": "john@example.com",
  "address": "123 Main St, City",
  "gstin": "29ABCDE1234F1Z5"
}
```

#### Get Customer
```http
GET /api/customers/:id
```

#### Update Customer
```http
PUT /api/customers/:id
Content-Type: application/json

{
  "customer_name": "John Doe Updated",
  "phone_number": "+919876543210",
  "email": "john.new@example.com"
}
```

---

### 📦 Products

#### List Products
```http
GET /api/products?search=&category_id=&page=1&limit=20
```

#### Create Product
```http
POST /api/products
Content-Type: application/json

{
  "name": "iPhone 15 Pro",
  "sku": "IP15P-256-BLK",
  "description": "Latest iPhone model",
  "category_id": "uuid",
  "barcodes": [
    { "value": "8901234567890", "type": "EAN13" },
    { "value": "IPHONE15PRO", "type": "CODE128" }
  ]
}
```

---

### 💰 Billing (POS)

#### Create Invoice (Atomic Transaction)
```http
POST /api/billing/create
Content-Type: application/json

{
  "customer_id": "uuid",
  "branch_id": "uuid",
  "items": [
    {
      "product_id": "uuid",
      "quantity": 1,
      "unit_price": 129900.00,
      "discount": 0,
      "gst_rate": 18
    }
  ],
  "paymentDetails": {
    "method": "UPI",
    "amount_paid": 153282.00,
    "transaction_ref": "UPI123456789"
  }
}
```

**Process:**
1. Validates stock availability (row-level lock)
2. Calculates GST (CGST/SGST/IGST) server-side
3. Deducts inventory atomically
4. Creates invoice + invoice_items + stock_movements + payments
5. Returns invoice with PDF URL

**Response:**
```json
{
  "success": true,
  "invoice": {
    "id": "uuid",
    "invoice_number": "INV-20240115-0001",
    "total_grand_amount": 153282.00
  },
  "pdf_url": "/invoice/INV-20240115-0001.pdf"
}
```

---

### 🔧 Services

#### List Service Jobs
```http
GET /api/services?status=&branch_id=&page=1&limit=20
```

#### Create Service Job
```http
POST /api/services
Content-Type: application/json

{
  "customer_id": "uuid",
  "branch_id": "uuid",
  "device_type": "Mobile Phone",
  "company_brand": "Apple",
  "model": "iPhone 14",
  "serial_number": "SN123456789",
  "problem_description": "Screen cracked, touch not working",
  "estimated_cost": 15000.00,
  "assigned_technician_id": "uuid",
  "expected_completion_date": "2024-01-20T10:00:00Z"
}
```

#### Update Service Status
```http
POST /api/services/:id/status
Content-Type: application/json

{
  "next_status": "Diagnosing",
  "notes": "Device received, starting diagnosis"
}
```

**Valid Transitions:**
```
Received → Diagnosing → Waiting for Approval → Waiting for Parts → In Progress → Completed → Delivered
                                              ↘ Cancelled
```

#### Add Consumed Part
```http
POST /api/services/:id/parts
Content-Type: application/json

{
  "product_id": "uuid",
  "quantity_consumed": 1,
  "unit_cost_at_time": 8000.00,
  "selling_price_at_time": 12000.00
}
```
**Note:** Automatically deducts stock from the service job's branch.

---

### 📋 Inventory

#### Current Stock
```http
GET /api/inventory?branch_id=&search=&low_stock_only=false
```

#### Stock Adjustment
```http
POST /api/inventory/adjust
Content-Type: application/json

{
  "branch_id": "uuid",
  "product_id": "uuid",
  "quantity_change": 10,
  "movement_type": "ADJUSTMENT",
  "notes": "Physical count correction"
}
```

---

### 📦 Stock Transfers

#### List Transfers
```http
GET /api/transfers?status=&branch_id=
```

#### Create Transfer
```http
POST /api/transfers
Content-Type: application/json

{
  "source_branch_id": "uuid",
  "destination_branch_id": "uuid",
  "items": [
    { "product_id": "uuid", "quantity": 5 },
    { "product_id": "uuid", "quantity": 10 }
  ],
  "notes": "Monthly stock redistribution"
}
```

#### Dispatch Transfer (Source Branch)
```http
POST /api/transfers/:id/dispatch
```
Deducts stock from source branch.

#### Receive Transfer (Destination Branch)
```http
POST /api/transfers/:id/receive
```
Adds stock to destination branch. Requires `DISPATCHED` status.

---

### 🛒 Purchases

#### List Suppliers
```http
GET /api/suppliers
```

#### Create Supplier
```http
POST /api/suppliers
Content-Type: application/json

{
  "name": "Tech Distributors Ltd",
  "contact_email": "sales@techdist.com",
  "phone": "+919876543210",
  "address": "Industrial Area, City"
}
```

#### List Purchase Receipts
```http
GET /api/purchases?status=&branch_id=
```

#### Create Purchase Receipt
```http
POST /api/purchases
Content-Type: application/json

{
  "supplier_id": "uuid",
  "branch_id": "uuid",
  "receipt_number": "PR-20240115-001",
  "receipt_date": "2024-01-15T10:00:00Z",
  "status": "RECEIVED",
  "items": [
    {
      "product_id": "uuid",
      "quantity": 10,
      "purchase_price": 50000.00,
      "gst_rate": 18
    }
  ]
}
```
**Note:** If status is `RECEIVED`, automatically updates branch inventory.

---

### 📊 Reports

#### Sales Summary
```http
GET /api/reports?type=sales-summary&start_date=2024-01-01&end_date=2024-01-31&branch_id=uuid
```

#### Daily Sales
```http
GET /api/reports?type=daily-sales&start_date=2024-01-01&end_date=2024-01-31
```

#### Payment Methods Breakdown
```http
GET /api/reports?type=payment-methods&start_date=2024-01-01&end_date=2024-01-31
```

#### Inventory Valuation
```http
GET /api/reports?type=inventory-valuation&branch_id=uuid
```

#### Service Reports
```http
GET /api/reports?type=service-summary&start_date=2024-01-01&end_date=2024-01-31
```

---

### 📋 Audit Logs

#### View Audit Logs (Owner/Admin only)
```http
GET /api/audit?limit=100&action=INVOICE_CREATE
```

#### Log Audit Event (Internal)
```http
POST /api/audit
Content-Type: application/json

{
  "action": "CUSTOMER_UPDATE",
  "entityType": "customers",
  "entityId": "uuid",
  "details": { "changed_fields": ["phone_number"], "old_value": "...", "new_value": "..." }
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing session |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Unique constraint violation |
| `INSUFFICIENT_STOCK` | 400 | Stock quantity insufficient |
| `INVALID_TRANSITION` | 400 | Invalid status transition |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `INTERNAL_ERROR` | 500 | Server error |

## Rate Limiting

- Default: 100 requests/minute per IP
- Auth endpoints: 10 requests/minute
- Report endpoints: 20 requests/minute

## Webhooks (Future)

```http
POST /webhooks/invoice-created
POST /webhooks/stock-low
POST /webhooks/service-status-changed
```