# Payment Link Authentication Token System

## Overview

This system allows generating secure payment links for quoted products (PSA, Beckett, CGC, etc.). When a customer receives a payment link with a valid token, they can directly add the product to their cart instead of having to contact via WhatsApp.

## Components Created

### 1. AuthToken Database Model

**File:** `/src/backend/models/AuthToken.ts`

Stores authentication tokens with the following fields:

- `userId`: Reference to the user who generated the link
- `token`: Unique 32-byte hexadecimal token
- `productId`: Reference to the product
- `variationId`: Reference to the product variation
- `expiresAt`: Expiration timestamp (48 hours from creation)
- `used`: Boolean flag to track if token has been used
- `usedAt`: Timestamp when token was first verified
- `createdAt`: Token creation timestamp

**Features:**

- Automatic TTL index (tokens auto-delete after expiration)
- Each token is unique and limited to one product variation
- Tokens expire after exactly 48 hours

### 2. Token Generation API

**File:** `/src/app/api/auth-token/generate/route.ts`

**Endpoint:** `POST /api/auth-token/generate`

**Request Body:**

```json
{
  "productId": "string",
  "variationId": "string"
}
```

**Response:**

```json
{
  "success": true,
  "token": "hex_string",
  "paymentLink": "https://baseurl/producto/{productId}?token={token}",
  "expiresAt": "ISO_8601_timestamp"
}
```

**Features:**

- Requires authenticated user (via NextAuth session)
- Generates cryptographically secure token
- Creates payment link with token in query parameter
- Logs token generation for auditing

### 3. Token Verification API

**File:** `/src/app/api/auth-token/verify/route.ts`

**Endpoints:**

- `GET /api/auth-token/verify?token={token}` - Quick verification without marking as used
- `POST /api/auth-token/verify` - Full verification that marks token as used

**Response:**

```json
{
  "valid": true,
  "productId": "string",
  "variationId": "string",
  "expiresAt": "ISO_8601_timestamp"
}
```

**Features:**

- Checks token existence in database
- Verifies expiration (48-hour window)
- Prevents token reuse (checks `used` flag)
- GET endpoint allows preview without consuming token
- POST endpoint marks token as used after verification

## UI Changes

### EditVariationProduct Component

**File:** `/src/app/(manager)/admin/productos/_components/EditVariationProduct.tsx`

**New Features:**

- Added `generatingLink` state to track link generation status
- Added `handleGeneratePaymentLink()` function
- Added "Generar Enlace de Pago" (Generate Payment Link) button
- Button only shows for quote-required brands (PSA, Beckett, CGC, AGS, Icons, GMA, SGC, BGS)
- Button triggers link generation and copies to clipboard
- Shows alert with generated link and expiration time

**Button Behavior:**

- Green button next to "Actualizar Producto"
- Shows loading spinner while generating
- Displays confirmation with link validity period
- Automatically copies link to clipboard

### ProductDetailsComponent

**File:** `/src/app/(home)/producto/_components/ProductDetailsComponent.tsx`

**New Features:**

- Added `useSearchParams()` hook to read URL parameters
- Added `tokenValid` and `tokenChecking` states
- Added `useEffect` to verify token on component mount
- Modified button display logic:
  - Shows "Agregar a Carrito" (Add to Cart) if:
    - Product doesn't require quote, OR
    - Product requires quote AND token is valid
  - Shows "Obtener Cotización" (WhatsApp) if:
    - Product requires quote AND no valid token AND verification complete

**Token Verification Flow:**

1. Component mounts
2. Check URL for `token` parameter
3. If token exists, call `/api/auth-token/verify?token={token}`
4. If token is valid and not expired:
   - Set `tokenValid = true`
   - Show Add to Cart button
5. If token is invalid/expired/doesn't exist:
   - Set `tokenValid = false`
   - Show WhatsApp button

## Complete User Flow

### For Sales Team (EditVariationProduct):

1. Edit a quoted product (e.g., PSA card)
2. Click "Generar Enlace de Pago" button
3. Secure token is generated (expires in 48 hours)
4. Payment link is copied to clipboard
5. Link is shared with customer via email, WhatsApp, etc.

### For Customer (ProductDetailsComponent):

1. Receive payment link with token: `https://domain/producto/xxx?token=yyy`
2. Click link to view product details
3. Product page verifies token in background
4. If token valid:
   - "Agregar a Carrito" button appears
   - Customer can add product directly to cart
5. If token invalid/expired:
   - "Obtener Cotización" button shows
   - Customer must contact via WhatsApp

## Security Features

### Token Security:

- **Cryptographic Randomness:** 32-byte (256-bit) random tokens
- **Uniqueness:** Database unique constraint on token field
- **Time-Limited:** 48-hour expiration with TTL index
- **Single Use:** Token marked as used after verification (via POST)
- **User Bound:** Token created by specific user, audit trail available

### Verification Security:

- Tokens verified against database (prevents tampering)
- Expiration checked at verification time
- Used flag prevents replay attacks
- GET requests don't consume token (preview-safe)
- POST requests consume token (checkout-safe)

## Database Indexes

```
- `userId` (indexed) - Find all tokens for a user
- `token` (unique) - Prevent duplicate tokens
- `expiresAt` (TTL, 0 seconds) - Auto-delete expired tokens
```

## Configuration

### Token Expiration

Currently set to **48 hours**. To change:

```typescript
// In generate/route.ts
const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // Change here
```

### Quote-Required Brands

Currently includes: PSA, Beckett, CGC, AGS, Icons, GMA, SGC, BGS

To add more brands, update array in:

- `ProductDetailsComponent.tsx`
- `EditVariationProduct.tsx`

## Error Handling

### Generate Token Errors:

- 401: User not authenticated
- 400: Missing productId or variationId
- 404: User not found
- 500: Database error

### Verify Token Errors:

- 400: Token parameter missing
- 404: Token not found
- 410: Token expired (Gone status)
- 403: Token already used
- 500: Database error

## Testing Checklist

- [ ] Generate token for quote-required product
- [ ] Verify link copies to clipboard
- [ ] Check token expires after 48 hours
- [ ] Verify token on product page shows Add to Cart
- [ ] Test expired token shows WhatsApp button
- [ ] Test already-used token shows WhatsApp button
- [ ] Test normal products still show Add to Cart directly
- [ ] Test token validity in database

## Logging

Console logging enabled with emojis for debugging:

- 🔗 `[Generate Link]` - Token generation operations
- 🔐 `[ProductDetails]` - Token verification operations
- ✅ `[Generate Link]` - Successful operations
- ⚠️ `[Verify Token]` - Token issues/warnings
- ❌ `[Generate Link]` - Errors

## Future Enhancements

Potential improvements:

1. Add rate limiting on token generation (prevent spam)
2. Add token management UI to view/revoke tokens
3. Send token via email automatically
4. Track token usage analytics
5. Add webhook on token use
6. Support different expiration durations per product
7. Add regenerate token functionality
8. Add token history/audit log UI
