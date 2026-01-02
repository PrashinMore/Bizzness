# Loyalty Rewards Program - Technical Implementation Guide

## 1. Overview

The Loyalty Rewards Program allows customers to earn points on purchases and redeem them for discounts. This module integrates seamlessly with the CRM and Sales systems.

**Key Features:**
- Points earning (1 point per ₹100 spent)
- Tier-based system (Silver, Gold, Platinum)
- Point redemption for discounts
- Transaction history tracking
- Configurable redemption rates

---

## 2. Core Concepts

### 2.1 Point Earning Rules

- **Earning Rate**: 1 point per ₹100 spent (rounded down)
- **Formula**: `earnedPoints = Math.floor(billAmount / 100)`
- **When**: Points are awarded automatically after successful payment
- **Tier Updates**: Automatic based on total points

### 2.2 Tier System

| Tier | Points Range | Benefits |
|------|--------------|----------|
| **SILVER** | 0 - 499 | Standard earning rate |
| **GOLD** | 500 - 999 | Standard earning rate |
| **PLATINUM** | 1000+ | Standard earning rate |

*Note: Tier benefits can be extended in future (e.g., bonus points for higher tiers)*

### 2.3 Point Redemption Rules

- **Redemption Rate**: 1 point = ₹1 discount (configurable)
- **Minimum Redemption**: 10 points (configurable)
- **Maximum Redemption**: Up to 50% of bill amount (configurable)
- **When**: During checkout, before payment

### 2.4 Redemption Calculation

```
redeemableAmount = min(
  pointsToRedeem * redemptionRate,
  billAmount * maxRedemptionPercentage,
  billAmount
)
```

Example:
- Bill: ₹500
- Points available: 200
- Redemption rate: 1 point = ₹1
- Max redemption: 50% of bill = ₹250
- Customer redeems 200 points → Discount: ₹200 (within 50% limit)

---

## 3. Database Schema

### 3.1 LoyaltyAccount (Existing)

```ts
@Entity({ name: 'loyalty_accounts' })
export class LoyaltyAccount {
  id: string;                    // UUID
  customerId: string;            // UUID (unique)
  points: number;               // Current balance
  tier: 'SILVER' | 'GOLD' | 'PLATINUM';
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.2 LoyaltyTransaction (New)

```ts
@Entity({ name: 'loyalty_transactions' })
export class LoyaltyTransaction {
  id: string;                    // UUID
  loyaltyAccountId: string;      // FK to LoyaltyAccount
  customerId: string;            // FK to Customer
  organizationId: string;        // FK to Organization
  saleId?: string;               // FK to Sale (if related to purchase)
  type: 'EARNED' | 'REDEEMED' | 'ADJUSTED';
  points: number;                // Positive for earned, negative for redeemed
  billAmount?: number;           // Bill amount (for earned transactions)
  discountAmount?: number;       // Discount applied (for redeemed transactions)
  pointsBefore: number;          // Points balance before transaction
  pointsAfter: number;           // Points balance after transaction
  description?: string;          // Optional description
  createdAt: Date;
}
```

**Indexes:**
- `idx_loyalty_trans_customer` on `(customerId, createdAt DESC)`
- `idx_loyalty_trans_account` on `(loyaltyAccountId, createdAt DESC)`
- `idx_loyalty_trans_sale` on `(saleId)` (where saleId IS NOT NULL)

---

## 4. Backend Implementation

### 4.1 Loyalty Service Methods

#### 4.1.1 Redeem Points

```ts
async redeemPoints(
  customerId: string,
  pointsToRedeem: number,
  billAmount: number,
  organizationId: string,
): Promise<{
  discountAmount: number;
  pointsUsed: number;
  remainingPoints: number;
  loyaltyAccount: LoyaltyAccount;
}>
```

**Business Logic:**
1. Validate loyalty program is enabled
2. Get loyalty account
3. Validate sufficient points
4. Calculate discount (respecting max redemption %)
5. Create transaction record
6. Update loyalty account
7. Return redemption details

#### 4.1.2 Get Transaction History

```ts
async getTransactionHistory(
  customerId: string,
  organizationIds: string[],
  limit?: number,
  offset?: number,
): Promise<LoyaltyTransaction[]>
```

#### 4.1.3 Get Redemption Preview

```ts
async getRedemptionPreview(
  customerId: string,
  billAmount: number,
  organizationId: string,
): Promise<{
  availablePoints: number;
  maxRedeemablePoints: number;
  maxDiscountAmount: number;
  redemptionRate: number;
  minRedemptionPoints: number;
}>
```

### 4.2 API Endpoints

#### 4.2.1 Redeem Points

```http
POST /crm/loyalty/redeem
Authorization: Bearer <token>
Content-Type: application/json

{
  "customerId": "uuid",
  "pointsToRedeem": 100,
  "billAmount": 500
}
```

**Response:**
```json
{
  "discountAmount": 100,
  "pointsUsed": 100,
  "remainingPoints": 50,
  "loyaltyAccount": {
    "id": "uuid",
    "points": 50,
    "tier": "GOLD"
  }
}
```

#### 4.2.2 Get Redemption Preview

```http
GET /crm/loyalty/redeem-preview?customerId=uuid&billAmount=500
Authorization: Bearer <token>
```

**Response:**
```json
{
  "availablePoints": 150,
  "maxRedeemablePoints": 125,
  "maxDiscountAmount": 125,
  "redemptionRate": 1,
  "minRedemptionPoints": 10
}
```

#### 4.2.3 Get Transaction History

```http
GET /crm/loyalty/transactions/:customerId?limit=20&offset=0
Authorization: Bearer <token>
```

**Response:**
```json
{
  "transactions": [
    {
      "id": "uuid",
      "type": "EARNED",
      "points": 5,
      "billAmount": 500,
      "pointsBefore": 145,
      "pointsAfter": 150,
      "createdAt": "2024-01-15T10:30:00Z"
    },
    {
      "id": "uuid",
      "type": "REDEEMED",
      "points": -100,
      "discountAmount": 100,
      "pointsBefore": 150,
      "pointsAfter": 50,
      "createdAt": "2024-01-14T15:20:00Z"
    }
  ],
  "total": 25
}
```

### 4.3 Sales Integration

Update `CreateSaleDto` to include:

```ts
@IsNumber()
@IsOptional()
@Min(0)
loyaltyPointsRedeemed?: number;

@IsNumber()
@IsOptional()
@Min(0)
loyaltyDiscountAmount?: number;
```

**Sales Service Flow:**
1. If `loyaltyPointsRedeemed` > 0:
   - Validate redemption (call loyalty service)
   - Apply discount to `totalAmount`
   - Create loyalty transaction
2. After payment:
   - Award points on net amount (after discount)
   - Create earned transaction

**Important**: Points are earned on the **net bill amount** (after discount).

---

## 5. Frontend Implementation

### 5.1 Web Frontend (Next.js)

#### 5.1.1 Checkout/Menu Page

**Location**: `webFe/src/app/menu/page.tsx`

**Features:**
- Show customer's available points
- Redemption input/selector
- Preview discount amount
- Apply redemption before checkout

**UI Flow:**
```
1. Select customer (existing flow)
2. Show loyalty points badge
3. If points >= minRedemption:
   - Show "Redeem Points" toggle/button
   - Input field for points to redeem
   - Show preview: "You'll save ₹X"
   - Show remaining points after redemption
4. Apply redemption
5. Update cart total
6. Proceed to checkout
```

#### 5.1.2 Customer Profile Page

**Location**: `webFe/src/app/crm/customers/[id]/page.tsx`

**Features:**
- Display current points and tier
- Transaction history table
- Redemption history

### 5.2 Mobile App (React Native)

#### 5.2.1 Cart Screen

**Location**: `business-app/src/screens/CartScreen.tsx`

**Features:**
- Loyalty points display
- Redemption toggle/input
- Discount preview
- Apply to cart total

**UI Flow:**
```
1. Customer selected (existing)
2. Show points badge
3. Toggle "Use Points" switch
4. If enabled:
   - Show points input (with max limit)
   - Show discount preview
   - Show remaining points
5. Update cart total
6. Proceed to payment
```

#### 5.2.2 Customer Profile Screen

**Location**: `business-app/src/screens/CustomerProfileScreen.tsx`

**Features:**
- Points and tier display
- Transaction history list
- Filter by type (Earned/Redeemed)

---

## 6. User Flows

### 6.1 Earning Points Flow

```
1. Customer makes purchase
2. Sale created with customerId
3. Payment completed
4. System calculates: earnedPoints = floor(billAmount / 100)
5. Create EARNED transaction
6. Update LoyaltyAccount:
   - points += earnedPoints
   - Update tier if threshold crossed
7. Display points earned notification
```

### 6.2 Redemption Flow

```
1. Customer selected at checkout
2. System fetches loyalty account
3. If points >= minRedemption:
   - Show redemption option
4. User enters points to redeem
5. System validates:
   - Sufficient points
   - Within max redemption limit
6. Calculate discount
7. Apply discount to bill
8. Create REDEEMED transaction
9. Update LoyaltyAccount
10. Proceed with payment
11. Award points on net amount (after discount)
```

### 6.3 Transaction History Flow

```
1. User opens customer profile
2. Navigate to "Loyalty" tab
3. Fetch transaction history
4. Display:
   - Date
   - Type (Earned/Redeemed)
   - Points change
   - Related sale (if applicable)
   - Balance after transaction
```

---

## 7. Configuration & Settings

### 7.1 Organization Settings

Add to `OrganizationSettings`:

```ts
loyaltyRedemptionRate: number;        // Default: 1 (1 point = ₹1)
loyaltyMinRedemptionPoints: number;   // Default: 10
loyaltyMaxRedemptionPercentage: number; // Default: 50 (50% of bill)
```

### 7.2 Settings UI

**Location**: `webFe/src/app/settings/page.tsx`

Add fields:
- Redemption Rate (points per ₹1)
- Minimum Redemption Points
- Maximum Redemption Percentage

---

## 8. Error Handling

### 8.1 Common Errors

| Error | HTTP Code | Message |
|-------|-----------|---------|
| Loyalty program disabled | 403 | Loyalty program is not enabled |
| Insufficient points | 400 | Not enough points to redeem |
| Below minimum | 400 | Minimum redemption is {min} points |
| Exceeds max | 400 | Maximum redemption is {max} points or {percentage}% of bill |
| Customer not found | 404 | Customer not found |
| Invalid customer | 400 | Customer does not have a loyalty account |

### 8.2 Validation Rules

- `pointsToRedeem` must be >= `minRedemptionPoints`
- `pointsToRedeem` must be <= available points
- Discount must not exceed `maxRedemptionPercentage` of bill
- `pointsToRedeem` must be a positive integer

---

## 9. Testing Scenarios

### 9.1 Earning Points

- ✅ Points earned on ₹100 purchase = 1 point
- ✅ Points earned on ₹199 purchase = 1 point (floor)
- ✅ Points earned on ₹500 purchase = 5 points
- ✅ Tier upgrade from Silver to Gold at 500 points
- ✅ Tier upgrade from Gold to Platinum at 1000 points

### 9.2 Redemption

- ✅ Redeem 100 points on ₹500 bill → ₹100 discount
- ✅ Redeem 300 points on ₹500 bill → ₹250 discount (50% max)
- ✅ Cannot redeem more than available points
- ✅ Cannot redeem below minimum (10 points)
- ✅ Points earned on net amount after redemption

### 9.3 Edge Cases

- ✅ Redeem all points (balance = 0)
- ✅ Redemption on ₹0 bill (should fail)
- ✅ Multiple redemptions in same transaction (should fail)
- ✅ Redemption after payment (should fail)

---

## 10. Implementation Checklist

### Backend
- [ ] Create `LoyaltyTransaction` entity
- [ ] Add migration for `loyalty_transactions` table
- [ ] Add redemption methods to `CrmService`
- [ ] Add redemption endpoints to `CrmController`
- [ ] Update `CreateSaleDto` with redemption fields
- [ ] Update `SalesService` to handle redemption
- [ ] Add redemption settings to `OrganizationSettings`
- [ ] Add transaction history endpoint

### Web Frontend
- [ ] Add redemption UI to menu/checkout page
- [ ] Add redemption preview API call
- [ ] Update cart total calculation
- [ ] Add transaction history to customer profile
- [ ] Add redemption settings to settings page

### Mobile App
- [ ] Add redemption UI to CartScreen
- [ ] Add redemption preview API call
- [ ] Update cart total calculation
- [ ] Add transaction history to CustomerProfileScreen
- [ ] Update API client with redemption endpoints

---

## 11. Future Enhancements

- **Bonus Points**: Tier-based bonus earning rates
- **Expiry**: Points expiry after X days
- **Referral Rewards**: Points for referring customers
- **Birthday Bonus**: Extra points on birthday
- **Promotional Multipliers**: 2x points events
- **Point Transfers**: Transfer points between customers
- **Reward Catalog**: Exchange points for specific items

---

## 12. Notes

- Points are always integers (no decimals)
- Redemption happens before payment
- Points are earned on net amount (after discount)
- All transactions are immutable (for audit trail)
- Tier is calculated based on total points (not after redemption)

