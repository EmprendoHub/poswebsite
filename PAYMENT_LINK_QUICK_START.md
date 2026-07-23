# Quick Start: Payment Link Token System

## For Sales Team

### How to Generate a Payment Link:

1. Go to **Admin → Products → Edit Product** (quote-required product like PSA)
2. Scroll to bottom of page
3. Click the **"Generar Enlace de Pago"** (Generate Payment Link) button
4. A green button appears next to "Actualizar Producto"
5. Click it and wait for confirmation
6. Link automatically copies to clipboard
7. Share the link with your customer

**Example generated link:**

```
https://yourdomain.com/producto/507f1f77bcf86cd799439011?token=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0
```

### Token Validity:

- ⏰ Valid for exactly **48 hours**
- 🔐 Works only for the specific product
- 👤 Linked to the user who generated it
- ✅ Can be used once

---

## For Customers

### How to Use a Payment Link:

1. Click the link sent by the sales team
2. Product details page loads automatically
3. If link is valid:
   - ✅ **"Agregar a Carrito"** (Add to Cart) button appears
   - Click to add product directly to cart
   - Proceed to checkout
4. If link expired or invalid:
   - 💬 **"Obtener Cotización"** (Get Quote) button appears
   - Click to contact via WhatsApp instead

---

## System Behavior

### Valid Token:

```
User clicks link with token
       ↓
Token verified in database
       ↓
Token not expired (< 48 hours)
       ↓
Token not yet used
       ↓
✅ "Add to Cart" button shows
       ↓
Product added directly to cart
```

### Invalid/Expired Token:

```
User clicks link with token
       ↓
Token missing OR expired OR already used
       ↓
❌ Token verification fails
       ↓
💬 "Get Quote" (WhatsApp) button shows
       ↓
User contacts via WhatsApp
```

### Normal Product (No Token):

```
User visits product page (no token in URL)
       ↓
No token verification needed
       ↓
✅ "Add to Cart" button shows immediately
       ↓
Product added directly to cart
```

---

## API Reference

### Generate Token

```bash
POST /api/auth-token/generate
Content-Type: application/json

{
  "productId": "507f1f77bcf86cd799439011",
  "variationId": "607f1f77bcf86cd799439012"
}
```

**Response (Success):**

```json
{
  "success": true,
  "token": "a1b2c3d4e5f6...",
  "paymentLink": "https://domain.com/producto/507f...?token=a1b2...",
  "expiresAt": "2024-07-25T15:30:00Z"
}
```

### Verify Token

```bash
GET /api/auth-token/verify?token=a1b2c3d4e5f6...
```

**Response (Valid):**

```json
{
  "valid": true,
  "productId": "507f1f77bcf86cd799439011",
  "variationId": "607f1f77bcf86cd799439012",
  "expiresAt": "2024-07-25T15:30:00Z"
}
```

**Response (Invalid):**

```json
{
  "valid": false,
  "error": "Token not found" | "Token has expired" | "Token has already been used"
}
```

---

## Troubleshooting

### Link doesn't show "Add to Cart"

- ❌ Token has expired (> 48 hours old)
- ❌ Token was already used
- ❌ Wrong product ID in link
- ✅ Solution: Generate a new link

### "Add to Cart" button disappears after clicking

- ✅ This is normal - token is now marked as used
- ✅ Product successfully added to cart
- ✅ Proceed to checkout

### Can't generate link

- ❌ Product is not quote-required (PSA, Beckett, etc.)
- ❌ User not logged in to admin
- ❌ Product hasn't been saved yet
- ✅ Save product first, then try again

### "Obtener Cotización" shows instead of "Add to Cart"

- Check token in URL (should be present)
- Check token hasn't expired (within 48 hours)
- Check token hasn't been used already
- Generate a fresh link and try again

---

## Database Info

### AuthToken Collection Fields:

- `userId` - Who created the token
- `token` - The unique token string
- `productId` - Product being purchased
- `variationId` - Product variation
- `expiresAt` - When token expires
- `used` - Has token been used?
- `usedAt` - When was it first used?
- `createdAt` - When was token created?

### Indexes:

- Unique on `token` (prevents duplicates)
- TTL on `expiresAt` (auto-delete expired)
- Regular on `userId` (find user's tokens)

---

## 48-Hour Window Explained

Token is valid from creation until exactly 48 hours have passed:

```
Generated: July 23, 2024 at 3:00 PM
Expires:   July 25, 2024 at 3:00 PM

Valid:     July 23 3:01 PM - July 25 2:59 PM ✅
Expired:   July 25 3:00 PM onwards ❌
```

---

## Security Notes

✅ **Safe to share:** Links can be sent via email, WhatsApp, etc.
✅ **Time-limited:** Only works for 48 hours
✅ **Single-use:** Can't be exploited for multiple purchases
✅ **User-tracked:** We know who generated each link
✅ **Unique:** Each link is completely random and unique

❌ **Don't:** Share with unlimited people expecting all to use the same link
❌ **Don't:** Reuse expired links
❌ **Don't:** Try to manually craft tokens (cryptographically signed)

---

## Support

For issues with the system:

1. Check the error message displayed
2. Verify token hasn't expired (48 hours)
3. Generate a fresh link
4. Try in incognito/private mode (clear cache)
5. Contact development team if problems persist
