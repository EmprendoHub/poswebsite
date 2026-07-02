# Price Tracker Implementation

## Overview

The Price Tracker system logs all price changes for products, providing a complete audit trail of pricing history. This allows tracking of pricing trends, understanding price change patterns, and generating reports.

## Components

### 1. Database Model: `PriceTracker`

Located in: `/src/backend/models/PriceTracker.ts`

**Fields:**

- `productId` - Reference to the Product
- `productTitle` - Product name at time of change
- `price` - The price value
- `label` - Type of change ("precio inicial", "actualización de precio", "ajuste de precio")
- `category` - Product category
- `brand` - Product brand
- `userId` - User ID who made the change
- `userName` - User name who made the change
- `userRole` - User role (manager, supervisor, etc.)
- `authorizedBy` - Role that authorized the change (manager/supervisor)
- `createdAt` - Timestamp
- `updatedAt` - Automatic timestamp

### 2. API Endpoint: `/api/price-tracker`

Located in: `/src/app/api/price-tracker/route.ts`

**POST Request:**
Creates a new price tracking entry.

Request Body:

```json
{
  "productId": "product_id",
  "productTitle": "Product Name",
  "price": 99.99,
  "label": "actualización de precio",
  "category": "Cards",
  "brand": "PSA",
  "userId": "user_id",
  "userName": "John Doe",
  "userRole": "manager",
  "authorizedBy": "manager"
}
```

**GET Request:**
Retrieves price history for a product.

Query Parameters:

- `productId` - The product ID to fetch history for

Response:

```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "productId": "...",
      "productTitle": "...",
      "price": 99.99,
      "label": "actualización de precio",
      "category": "Cards",
      "brand": "PSA",
      "authorizedBy": "manager",
      "createdAt": "2026-06-29T12:00:00Z"
    }
  ]
}
```

### 3. UI Components

#### PriceVerificationModal

Located in: `/src/components/modals/PriceVerificationModal.tsx`

Displays a modal requiring manager/supervisor authorization when a product price is changed.

**Features:**

- Shows current vs new price
- Displays percentage change
- Requires 6-digit manager code
- Shows visual feedback (red for increase, green for decrease)

#### EditVariationProduct Integration

Located in: `/src/app/(manager)/admin/productos/_components/EditVariationProduct.tsx`

**When a price changes:**

1. User enters new price in price field
2. If different from current price, PriceVerificationModal appears
3. User enters manager/supervisor code
4. On authorization, price is updated and tracked

### 4. Utility Functions

Located in: `/src/lib/priceTrackerUtils.ts`

**`logPriceChange(data)`**

- Posts a price change to the tracker
- Returns boolean indicating success

**`getPriceHistory(productId)`**

- Fetches all price changes for a product
- Returns array of price tracking entries

## Usage

### Creating a New Product with Initial Price

When creating a product in `NewVariationOptimized.tsx` (or similar):

```typescript
logPriceChange({
  productId: newProduct._id,
  productTitle: newProduct.title,
  price: newProduct.variations[0].price,
  label: "precio inicial",
  category: category,
  brand: brand,
  authorizedBy: userRole,
});
```

### Updating a Product Price

When editing a product and price changes, the system automatically:

1. Shows the PriceVerificationModal
2. Requires manager/supervisor authorization
3. Logs the change with the authorization level

## Database Indexing

The PriceTracker model has two indexes for performance:

- `productId + createdAt` - Quickly fetch all price changes for a product
- `createdAt` - For generating reports across all price changes

## Future Enhancements

### 1. Price Change Reports

Create a report generator that shows:

- Average price changes per category
- Most frequently changed products
- Price trends over time
- Which users/managers make the most changes

### 2. Alert System

Set up alerts for:

- Price changes above a certain percentage
- Prices that drop below cost
- Unusual price patterns

### 3. Undo Functionality

Add ability to revert a price to a previous value with authorization

### 4. Price History Viewer

Add a UI component to view full price history for a product:

- Timeline of all changes
- Who authorized each change
- Reasons for changes (optional field)

### 5. Batch Price Updates

Allow bulk price updates with automatic tracking:

- Apply percentage increase to category
- Apply seasonal pricing
- Apply promotional pricing

## Security Considerations

1. **Authorization Required**: All price changes must be authorized by a manager or supervisor
2. **Audit Trail**: Complete history of who changed what and when
3. **Role-Based**: Different roles may have different capabilities
4. **Code Verification**: Manager code verification prevents unauthorized changes

## Testing

### Manual Testing Checklist

- [ ] Create new product → price tracked as "precio inicial"
- [ ] Edit product price → verification modal appears
- [ ] Enter wrong code → error message shown
- [ ] Enter correct code → price updated and tracked
- [ ] View price history for product → all changes visible
- [ ] Check database → entries have correct timestamps
- [ ] Test percentage change calculation → accuracy verified

## API Examples

### Log Initial Price

```bash
curl -X POST http://localhost:3000/api/price-tracker \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "507f1f77bcf86cd799439011",
    "productTitle": "PSA 10 Card",
    "price": 500,
    "label": "precio inicial",
    "category": "Cards",
    "brand": "PSA"
  }'
```

### Log Price Update

```bash
curl -X POST http://localhost:3000/api/price-tracker \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "507f1f77bcf86cd799439011",
    "productTitle": "PSA 10 Card",
    "price": 550,
    "label": "actualización de precio",
    "category": "Cards",
    "brand": "PSA",
    "authorizedBy": "manager"
  }'
```

### Get Price History

```bash
curl http://localhost:3000/api/price-tracker?productId=507f1f77bcf86cd799439011
```
