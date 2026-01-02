# Table Management API Documentation for Mobile App Integration

## Overview

This document provides comprehensive API documentation for integrating table management functionality into mobile applications. The table management system allows restaurants to track table status, assign orders to tables, and manage table operations.

## Base URL

```
http://localhost:4000/api
```

## Authentication

All endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Table Status Types

```typescript
enum TableStatus {
  AVAILABLE = 'AVAILABLE',      // Table is free and ready for customers
  OCCUPIED = 'OCCUPIED',        // Table has an active order
  RESERVED = 'RESERVED',        // Table is reserved for future use
  CLEANING = 'CLEANING',        // Table is being cleaned
  BLOCKED = 'BLOCKED'           // Table is blocked/out of service
}
```

## Data Models

### DiningTable

```typescript
interface DiningTable {
  id: string;                    // UUID
  name: string;                  // Table name (e.g., "T1", "Patio-1")
  capacity: number;              // Number of seats
  area?: string | null;          // Area/section (e.g., "Indoor", "Outdoor")
  status: TableStatus;           // Current table status
  isActive: boolean;             // Whether table is active
  organizationId: string;        // UUID of organization
  createdAt: string;             // ISO 8601 timestamp
  updatedAt: string;             // ISO 8601 timestamp
}
```

### DiningTableWithOrders

```typescript
interface DiningTableWithOrders extends DiningTable {
  activeOrder?: Sale;            // Current active order (if any)
  orderHistory?: Sale[];         // Recent order history (up to 10)
}
```

### Sale (Order)

```typescript
interface Sale {
  id: string;
  date: string;                  // ISO 8601 timestamp
  items: SaleItem[];             // Order items
  totalAmount: string;            // Total amount (decimal as string)
  soldBy: string;                // User ID who created the sale
  paymentType: 'cash' | 'UPI' | 'mixed';
  cashAmount?: string;            // Cash payment amount
  upiAmount?: string;            // UPI payment amount
  isPaid: boolean;               // Whether order is paid
  tableId?: string | null;        // Assigned table ID
  organizationId: string;
  openedAt?: string | null;      // When table order was opened
  closedAt?: string | null;      // When order was closed/paid
  createdAt: string;
}
```

---

## API Endpoints

### 1. List All Tables

Get a list of all tables for the user's organization.

**Endpoint:** `GET /tables`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
[
  {
    "id": "42c49468-3c1c-4984-9043-820b2e4113c1",
    "name": "T1",
    "capacity": 4,
    "area": "Indoor",
    "status": "AVAILABLE",
    "isActive": true,
    "organizationId": "13df4863-961c-45c0-9da7-d0d14379d8fc",
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z"
  }
]
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing token
- `403 Forbidden` - User not assigned to any organization

---

### 2. Get Table Details

Get detailed information about a specific table, including active order and order history.

**Endpoint:** `GET /tables/:id`

**Path Parameters:**
- `id` (string, UUID) - Table ID

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "id": "42c49468-3c1c-4984-9043-820b2e4113c1",
  "name": "T1",
  "capacity": 4,
  "area": "Indoor",
  "status": "OCCUPIED",
  "isActive": true,
  "organizationId": "13df4863-961c-45c0-9da7-d0d14379d8fc",
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-01-15T10:00:00.000Z",
  "activeOrder": {
    "id": "4fb8698f-993a-4519-8c91-762a2f614395",
    "date": "2025-12-15T17:45:40.631Z",
    "items": [
      {
        "id": "3277fc3e-2678-4760-b050-5b04221e57af",
        "productId": "fa762db8-35d9-463c-9d52-d6019518c4c0",
        "quantity": 1,
        "sellingPrice": "8.50",
        "subtotal": "8.50"
      }
    ],
    "totalAmount": "8.50",
    "soldBy": "1f230a52-d156-4e81-a51f-60c04d39417c",
    "paymentType": "cash",
    "cashAmount": "8.50",
    "upiAmount": "0.00",
    "isPaid": false,
    "tableId": "42c49468-3c1c-4984-9043-820b2e4113c1",
    "openedAt": "2025-12-15T17:45:40.655Z",
    "closedAt": null
  },
  "orderHistory": []
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing token
- `404 Not Found` - Table not found or not accessible

---

### 3. Get Active Sale for Table

Get the active (unpaid) order for a specific table.

**Endpoint:** `GET /tables/:id/active-sale`

**Path Parameters:**
- `id` (string, UUID) - Table ID

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "id": "4fb8698f-993a-4519-8c91-762a2f614395",
  "date": "2025-12-15T17:45:40.631Z",
  "items": [
    {
      "id": "3277fc3e-2678-4760-b050-5b04221e57af",
      "productId": "fa762db8-35d9-463c-9d52-d6019518c4c0",
      "quantity": 1,
      "sellingPrice": "8.50",
      "subtotal": "8.50"
    }
  ],
  "totalAmount": "8.50",
  "soldBy": "1f230a52-d156-4e81-a51f-60c04d39417c",
  "paymentType": "cash",
  "cashAmount": "8.50",
  "upiAmount": "0.00",
  "isPaid": false,
  "tableId": "42c49468-3c1c-4984-9043-820b2e4113c1",
  "openedAt": "2025-12-15T17:45:40.655Z",
  "closedAt": null
}
```

**Response:** `200 OK` (null if no active order)
```json
null
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing token
- `404 Not Found` - Table not found or not accessible

---

### 4. Create Table

Create a new table in the organization.

**Endpoint:** `POST /tables`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "T1",
  "capacity": 4,
  "area": "Indoor"
}
```

**Fields:**
- `name` (string, required) - Table name, max 100 characters
- `capacity` (number, required) - Number of seats, minimum 1
- `area` (string, optional) - Area/section name, max 100 characters

**Response:** `201 Created`
```json
{
  "id": "42c49468-3c1c-4984-9043-820b2e4113c1",
  "name": "T1",
  "capacity": 4,
  "area": "Indoor",
  "status": "AVAILABLE",
  "isActive": true,
  "organizationId": "13df4863-961c-45c0-9da7-d0d14379d8fc",
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-01-15T10:00:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid input or duplicate table name
- `401 Unauthorized` - Invalid or missing token
- `403 Forbidden` - Table management not enabled for organization

---

### 5. Update Table

Update table information (name, capacity, area).

**Endpoint:** `PATCH /tables/:id`

**Path Parameters:**
- `id` (string, UUID) - Table ID

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "T1-Updated",
  "capacity": 6,
  "area": "Outdoor"
}
```

**Fields:** (all optional)
- `name` (string) - Table name, max 100 characters
- `capacity` (number) - Number of seats, minimum 1
- `area` (string) - Area/section name, max 100 characters

**Response:** `200 OK`
```json
{
  "id": "42c49468-3c1c-4984-9043-820b2e4113c1",
  "name": "T1-Updated",
  "capacity": 6,
  "area": "Outdoor",
  "status": "AVAILABLE",
  "isActive": true,
  "organizationId": "13df4863-961c-45c0-9da7-d0d14379d8fc",
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-01-15T10:05:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid input or duplicate table name
- `401 Unauthorized` - Invalid or missing token
- `404 Not Found` - Table not found or not accessible

---

### 6. Update Table Status

Update the status of a table.

**Endpoint:** `PATCH /tables/:id/status`

**Path Parameters:**
- `id` (string, UUID) - Table ID

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "CLEANING"
}
```

**Fields:**
- `status` (string, required) - One of: `AVAILABLE`, `OCCUPIED`, `RESERVED`, `CLEANING`, `BLOCKED`

**Validation Rules:**
- Cannot set to `OCCUPIED` without an active order
- Cannot set to `AVAILABLE` if table has active orders

**Response:** `200 OK`
```json
{
  "id": "42c49468-3c1c-4984-9043-820b2e4113c1",
  "name": "T1",
  "capacity": 4,
  "area": "Indoor",
  "status": "CLEANING",
  "isActive": true,
  "organizationId": "13df4863-961c-45c0-9da7-d0d14379d8fc",
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-01-15T10:05:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid status or status change not allowed
- `401 Unauthorized` - Invalid or missing token
- `404 Not Found` - Table not found or not accessible

---

### 7. Delete Table

Soft delete a table (sets `isActive` to false).

**Endpoint:** `DELETE /tables/:id`

**Path Parameters:**
- `id` (string, UUID) - Table ID

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{}
```

**Error Responses:**
- `400 Bad Request` - Table has active orders
- `401 Unauthorized` - Invalid or missing token
- `404 Not Found` - Table not found or not accessible

---

### 8. Assign Table to Sale

Assign a table to an existing sale/order.

**Endpoint:** `POST /tables/sales/:saleId/assign`

**Path Parameters:**
- `saleId` (string, UUID) - Sale/Order ID

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "tableId": "42c49468-3c1c-4984-9043-820b2e4113c1"
}
```

**Fields:**
- `tableId` (string, UUID, required) - Table ID to assign

**Response:** `200 OK`
```json
{
  "sale": {
    "id": "4fb8698f-993a-4519-8c91-762a2f614395",
    "tableId": "42c49468-3c1c-4984-9043-820b2e4113c1",
    "openedAt": "2025-12-15T17:45:40.655Z",
    ...
  },
  "table": {
    "id": "42c49468-3c1c-4984-9043-820b2e4113c1",
    "status": "OCCUPIED",
    ...
  }
}
```

**Error Responses:**
- `400 Bad Request` - Sale is already paid, or table is not available
- `401 Unauthorized` - Invalid or missing token
- `404 Not Found` - Sale or table not found

---

### 9. Switch Table

Move an order from one table to another.

**Endpoint:** `POST /tables/sales/:saleId/switch`

**Path Parameters:**
- `saleId` (string, UUID) - Sale/Order ID

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "toTableId": "42c49468-3c1c-4984-9043-820b2e4113c1"
}
```

**Fields:**
- `toTableId` (string, UUID, required) - Target table ID

**Response:** `200 OK`
```json
{
  "sale": {
    "id": "4fb8698f-993a-4519-8c91-762a2f614395",
    "tableId": "42c49468-3c1c-4984-9043-820b2e4113c1",
    ...
  },
  "fromTable": {
    "id": "old-table-id",
    "status": "AVAILABLE",
    ...
  },
  "toTable": {
    "id": "42c49468-3c1c-4984-9043-820b2e4113c1",
    "status": "OCCUPIED",
    ...
  }
}
```

**Error Responses:**
- `400 Bad Request` - Sale is already paid, or target table is not available
- `401 Unauthorized` - Invalid or missing token
- `404 Not Found` - Sale or table not found

---

### 10. Merge Tables

Merge multiple tables into a target table (moves all active orders).

**Endpoint:** `POST /tables/merge`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "sourceTableIds": [
    "table-id-1",
    "table-id-2"
  ],
  "targetTableId": "target-table-id"
}
```

**Fields:**
- `sourceTableIds` (array of UUIDs, required) - Array of source table IDs to merge
- `targetTableId` (string, UUID, required) - Target table ID

**Response:** `200 OK`
```json
{
  "targetTable": {
    "id": "target-table-id",
    "status": "OCCUPIED",
    ...
  },
  "sourceTables": [
    {
      "id": "table-id-1",
      "status": "BLOCKED",
      ...
    },
    {
      "id": "table-id-2",
      "status": "BLOCKED",
      ...
    }
  ]
}
```

**Error Responses:**
- `400 Bad Request` - Target table is not available
- `401 Unauthorized` - Invalid or missing token
- `403 Forbidden` - Table merging not enabled for organization
- `404 Not Found` - One or more tables not found

---

## Table Flow Workflows

### Workflow 1: Creating an Order with Table Assignment

1. **Create Sale with Table**
   ```
   POST /api/sales
   {
     "date": "2025-12-15T17:45:40.631Z",
     "items": [...],
     "totalAmount": 50.00,
     "soldBy": "user-id",
     "tableId": "table-id",
     "paymentType": "cash"
   }
   ```
   - If `tableId` is provided, table status automatically changes to `OCCUPIED`
   - `openedAt` timestamp is set automatically

2. **Add Items to Active Order**
   ```
   PATCH /api/sales/:saleId/items
   {
     "items": [
       {
         "productId": "product-id",
         "quantity": 2,
         "sellingPrice": 15.99
       }
     ]
   }
   ```
   - Total amount is recalculated automatically
   - Items are added to existing order

3. **Update Payment**
   ```
   PATCH /api/sales/:saleId
   {
     "cashAmount": 50.00,
     "upiAmount": 0.00,
     "isPaid": true
   }
   ```
   - When `isPaid` becomes `true`, `closedAt` is set
   - If auto-free table is enabled, table status changes to `AVAILABLE`

---

### Workflow 2: Assigning Table to Existing Order

1. **Create Sale without Table**
   ```
   POST /api/sales
   {
     "date": "2025-12-15T17:45:40.631Z",
     "items": [...],
     "totalAmount": 50.00,
     "soldBy": "user-id"
     // No tableId
   }
   ```

2. **Assign Table Later**
   ```
   POST /api/tables/sales/:saleId/assign
   {
     "tableId": "table-id"
   }
   ```
   - Table status changes to `OCCUPIED`
   - `openedAt` is set if not already set

---

### Workflow 3: Table Status Management

1. **Manual Status Updates**
   ```
   PATCH /api/tables/:tableId/status
   {
     "status": "CLEANING"
   }
   ```
   - Use for: `RESERVED`, `CLEANING`, `BLOCKED`
   - Cannot set `OCCUPIED` without active order
   - Cannot set `AVAILABLE` with active orders

2. **Automatic Status Changes**
   - `AVAILABLE` → `OCCUPIED`: When order is created/assigned with table
   - `OCCUPIED` → `AVAILABLE`: When order is paid (if auto-free enabled) or manually switched

---

### Workflow 4: Switching Tables

When customers move to a different table:

```
POST /api/tables/sales/:saleId/switch
{
  "toTableId": "new-table-id"
}
```

- Old table becomes `AVAILABLE` (if no other active orders)
- New table becomes `OCCUPIED`
- Order's `tableId` is updated

---

### Workflow 5: Merging Tables

When combining multiple tables:

```
POST /api/tables/merge
{
  "sourceTableIds": ["table-1-id", "table-2-id"],
  "targetTableId": "target-table-id"
}
```

- All active orders from source tables move to target table
- Source tables become `BLOCKED`
- Target table becomes `OCCUPIED` if it has orders

---

## Mobile App Integration Examples

### Example 1: Display Table List with Status

```typescript
// Fetch tables
const response = await fetch('http://localhost:4000/api/tables', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const tables = await response.json();

// Group by status for UI
const tablesByStatus = {
  available: tables.filter(t => t.status === 'AVAILABLE'),
  occupied: tables.filter(t => t.status === 'OCCUPIED'),
  reserved: tables.filter(t => t.status === 'RESERVED'),
  cleaning: tables.filter(t => t.status === 'CLEANING'),
  blocked: tables.filter(t => t.status === 'BLOCKED')
};
```

### Example 2: Create Order and Assign Table

```typescript
// Step 1: Create sale with table
const saleResponse = await fetch('http://localhost:4000/api/sales', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    date: new Date().toISOString(),
    items: [
      {
        productId: 'product-id',
        quantity: 2,
        sellingPrice: 15.99
      }
    ],
    totalAmount: 31.98,
    soldBy: userId,
    tableId: selectedTableId,
    paymentType: 'cash'
  })
});
const sale = await saleResponse.json();

// Step 2: Add more items later
const addItemsResponse = await fetch(
  `http://localhost:4000/api/sales/${sale.id}/items`,
  {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      items: [
        {
          productId: 'another-product-id',
          quantity: 1,
          sellingPrice: 10.00
        }
      ]
    })
  }
);
const updatedSale = await addItemsResponse.json();
```

### Example 3: Get Table Details with Active Order

```typescript
// Get table with active order
const tableResponse = await fetch(
  `http://localhost:4000/api/tables/${tableId}`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);
const tableDetails = await tableResponse.json();

if (tableDetails.activeOrder) {
  console.log('Active Order Total:', tableDetails.activeOrder.totalAmount);
  console.log('Order Items:', tableDetails.activeOrder.items);
}
```

### Example 4: Update Table Status

```typescript
// Mark table as cleaning
const statusResponse = await fetch(
  `http://localhost:4000/api/tables/${tableId}/status`,
  {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      status: 'CLEANING'
    })
  }
);
const updatedTable = await statusResponse.json();
```

### Example 5: Switch Table

```typescript
// Move order to different table
const switchResponse = await fetch(
  `http://localhost:4000/api/tables/sales/${saleId}/switch`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      toTableId: newTableId
    })
  }
);
const result = await switchResponse.json();
```

---

## Error Handling

### Common Error Codes

- `400 Bad Request` - Invalid input, business rule violation
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - User doesn't have permission or feature disabled
- `404 Not Found` - Resource not found or not accessible
- `500 Internal Server Error` - Server error

### Error Response Format

```json
{
  "statusCode": 400,
  "message": "Cannot set table to OCCUPIED without an active order",
  "error": "Bad Request"
}
```

### Best Practices

1. **Always check response status** before parsing JSON
2. **Handle network errors** gracefully
3. **Show user-friendly error messages** based on status codes
4. **Retry failed requests** for network issues (not for 4xx errors)
5. **Validate input** on client side before sending requests

---

## Real-time Updates (Recommended)

For mobile apps, consider implementing:

1. **Polling**: Periodically fetch table list (every 5-10 seconds)
2. **WebSocket**: Real-time updates when table status changes
3. **Push Notifications**: Notify when orders are updated

### Polling Example

```typescript
// Poll table list every 5 seconds
setInterval(async () => {
  const tables = await fetchTables(token);
  updateTableList(tables);
}, 5000);
```

---

## Notes

1. **Table Management Feature**: Must be enabled in organization settings
2. **Auto-free Table**: Can be enabled in settings to automatically free tables when orders are paid
3. **Table Merging**: Must be enabled in settings to use merge functionality
4. **Status Validation**: Table status changes are validated based on business rules
5. **Soft Delete**: Tables are soft-deleted (isActive = false), not permanently removed
6. **Organization Scoping**: All operations are scoped to user's organization(s)

---

## Related APIs

- **Sales API**: `/api/sales` - For creating and managing orders
- **Products API**: `/api/products` - For product information
- **Settings API**: `/api/settings` - For organization settings

---

## Support

For API issues or questions, contact the development team or refer to the main API documentation.

