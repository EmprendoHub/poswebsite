# Payment Link Token System - Visual Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          PAYMENT LINK SYSTEM                             │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────┐              ┌──────────────────────────────┐
│     ADMIN PANEL          │              │      CUSTOMER SIDE           │
│  (EditVariationProduct)  │              │  (ProductDetailsComponent)   │
├──────────────────────────┤              ├──────────────────────────────┤
│                          │              │                              │
│  Product Details         │              │  Product Page URL:           │
│  ├─ Title                │              │  /producto/xxx?token=yyy     │
│  ├─ Brand (PSA, etc)     │              │                              │
│  ├─ Price                │              │  On Mount:                   │
│  └─ ...                  │              │  ├─ Read token from URL      │
│                          │              │  ├─ Call verify endpoint     │
│  [Generate Payment Link] │─────────────→│  └─ Verify token            │
│       Button             │  HTTP POST   │                              │
│       (Green)            │  /generate   │  Token Valid ✅              │
│                          │              │  └─ Show [Add to Cart]       │
│                          │              │                              │
│  Copy to Clipboard ✓     │              │  Token Invalid ❌            │
│  Alert with Link         │              │  └─ Show [Get Quote]        │
│  Share with Customer     │              │                              │
│                          │              │  Proceeds to Checkout       │
└──────────────────────────┘              └──────────────────────────────┘
           ▲                                           ▲
           │                                           │
           └───────────────────────┬───────────────────┘
                                   │
                   ┌───────────────┴───────────────┐
                   │                               │
            ┌──────▼─────────┐           ┌────────▼──────┐
            │   DATABASE     │           │  API ROUTES   │
            │   (MongoDB)    │           │               │
            ├────────────────┤           ├───────────────┤
            │                │           │               │
            │ AuthToken      │           │ /generate     │
            │ Collection:    │           │ POST          │
            │                │           │ - Auth check  │
            │ ├─ _id         │           │ - Create token│
            │ ├─ userId      │           │ - Build link  │
            │ ├─ token*      │           │ - Set 48h exp │
            │ ├─ productId   │           │               │
            │ ├─ variationId │           │ /verify       │
            │ ├─ expiresAt*  │           │ GET/POST      │
            │ ├─ used        │           │ - Query token │
            │ ├─ usedAt      │           │ - Check exp   │
            │ ├─ createdAt   │           │ - Check used  │
            │ └─ updatedAt   │           │ - Mark used   │
            │                │           │               │
            │ *TTL Index     │           │ Error codes:  │
            │ *Unique const. │           │ 401, 400, 404│
            │                │           │ 410, 403, 500│
            └────────────────┘           └───────────────┘
```

## User Flow Diagram

### Sales Team Generates Link:

```
Admin Login
    ↓
Navigate to Product
    ↓
Edit Product Details
    ↓
Click [Generate Payment Link]
    ↓
    ├─ POST /api/auth-token/generate
    │   ├─ Validate user authenticated
    │   ├─ Generate 32-byte random token
    │   ├─ Create AuthToken document
    │   │   ├─ userId = current user
    │   │   ├─ token = random hex
    │   │   ├─ productId = product._id
    │   │   ├─ variationId = variation._id
    │   │   ├─ expiresAt = now + 48h
    │   │   ├─ used = false
    │   │   └─ timestamps
    │   ├─ Build link: /producto/{productId}?token={token}
    │   └─ Return success + link
    │
    ├─ Copy Link to Clipboard
    │
    ├─ Show Alert:
    │   "Link generated!"
    │   "https://domain.com/producto/xxx?token=yyy"
    │   "Expires: July 25 3:00 PM"
    │   "(Copied to clipboard)"
    │
    └─ Share Link
        ├─ Email
        ├─ WhatsApp
        ├─ SMS
        └─ etc.
```

### Customer Uses Link:

```
Receive Link from Sales
    ↓
Click Link or Copy-Paste URL
    ↓
Browser navigates to:
/producto/xxx?token=yyy
    ↓
ProductDetailsComponent Mounts
    ├─ useSearchParams() reads URL
    ├─ Extracts token from query param
    └─ Calls useEffect
        │
        ├─ GET /api/auth-token/verify?token=yyy
        │   ├─ Query: db.authtokens.findOne({token})
        │   ├─ Check: token exists ✓
        │   ├─ Check: expiresAt > now ✓
        │   ├─ Check: used === false ✓
        │   └─ Return: valid = true
        │
        └─ Set tokenValid = true
            ↓
            Component Re-renders
            ↓
            Show [Add to Cart] Button ✅
            (instead of [Get Quote])
            ↓
            User clicks [Add to Cart]
            ↓
            Product added to cart
            └─ Note: Checkout will be on
               subsequent visit, token
               only marks status, doesn't
               auto-consume here
```

### Invalid Token Flow:

```
Token Clicked/Sent
    ↓
ProductDetailsComponent Mounts
    ├─ GET /api/auth-token/verify?token=yyy
    │
    ├─ Error Possibilities:
    │   ├─ 404: Token not found
    │   │   └─ Never existed
    │   │
    │   ├─ 410: Token expired
    │   │   └─ Created > 48 hours ago
    │   │
    │   ├─ 403: Token already used
    │   │   └─ Customer already added to cart
    │   │
    │   └─ 500: Server error
    │       └─ Database issue
    │
    └─ Set tokenValid = false
        ↓
        Component Re-renders
        ↓
        Show [Get Quote] Button (WhatsApp) 💬
        (instead of [Add to Cart])
        ↓
        User clicks [Get Quote]
        ↓
        Opens WhatsApp conversation
        └─ Manual quote process
```

## Database Schema Diagram

```
┌─────────────────────────────────────────────────────┐
│           AuthToken Collection                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Document Example:                                   │
│ {                                                   │
│   _id: ObjectId("6..."),                            │
│   userId: ObjectId("5..."),         ← Who created  │
│   token: "a1b2c3d4e5f6g7h8...",     ← 32 bytes hex│
│   productId: ObjectId("7..."),      ← Product ref │
│   variationId: ObjectId("8..."),    ← Variation   │
│   expiresAt: 2024-07-25T15:30Z,     ← 48h window │
│   used: false,                       ← Single use │
│   usedAt: null,                      ← When used  │
│   createdAt: 2024-07-23T15:30Z,     ← Created    │
│   updatedAt: 2024-07-23T15:30Z      ← Modified   │
│ }                                                   │
│                                                     │
├─────────────────────────────────────────────────────┤
│ Indexes:                                            │
│                                                     │
│ ✓ Unique: { token: 1 }                              │
│   └─ Prevents duplicate tokens                      │
│                                                     │
│ ✓ TTL: { expiresAt: 1 }                             │
│   └─ Auto-delete documents at expireAt             │
│                                                     │
│ ✓ Regular: { userId: 1 }                            │
│   └─ Fast lookup of user's tokens                   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## State Management Diagram

```
┌──────────────────────────────────────┐
│   EditVariationProduct State         │
├──────────────────────────────────────┤
│                                      │
│ generatingLink: boolean              │
│   ├─ false (default)                 │
│   ├─ true (generating)               │
│   └─ false (done)                    │
│                                      │
│ When click button:                   │
│   1. generatingLink = true           │
│   2. POST /generate                  │
│   3. Get response with link          │
│   4. Copy to clipboard               │
│   5. generatingLink = false          │
│   6. Show success toast              │
│                                      │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ ProductDetailsComponent State        │
├──────────────────────────────────────┤
│                                      │
│ tokenValid: boolean                  │
│   ├─ false (default)                 │
│   └─ true/false (after verification) │
│                                      │
│ tokenChecking: boolean               │
│   ├─ true (verifying)                │
│   └─ false (done checking)           │
│                                      │
│ On mount:                            │
│   1. tokenChecking = true            │
│   2. Read token from URL             │
│   3. If token found:                 │
│   │   GET /verify?token=xxx          │
│   │   tokenValid = response.valid    │
│   4. tokenChecking = false           │
│   5. Render accordingly              │
│                                      │
│ Button Display Logic:                │
│   if (!isQuoteRequired || tokenValid)│
│     show [Add to Cart]               │
│   else if (isQuoteRequired &&        │
│            !tokenValid &&            │
│            !tokenChecking)           │
│     show [Get Quote]                 │
│                                      │
└──────────────────────────────────────┘
```

## Timeline Diagram

```
Token Created                          Token Expires
    │                                      │
    ▼                                      ▼
┌─────────────────────────────────────────────────┐
│         48 HOUR VALIDITY WINDOW                 │
│                                                 │
│  Time: 0h           Time: 24h     Time: 48h     │
│  │                   │             │            │
│  ✓ Valid             ✓ Valid       ✓ Valid      │
│  ├─ Token works      ├─ Token ok   └─ EXPIRES  │
│  ├─ Can use          ├─ Can use    ❌ Invalid  │
│  └─ Not expired      └─ Not exp.   ├─ Expired  │
│                                     └─ Get Quote│
│                                                 │
│  Example:                                       │
│  Generated: July 23, 3:00 PM                    │
│  Expires:   July 25, 3:00 PM                    │
│  ├─ July 23, 3:01 PM ✓                          │
│  ├─ July 24, 3:00 PM ✓                          │
│  ├─ July 25, 2:59 PM ✓                          │
│  └─ July 25, 3:00 PM ❌                         │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Security Features Diagram

```
┌──────────────────────────────────────────┐
│      SECURITY LAYERS                     │
├──────────────────────────────────────────┤
│                                          │
│ Layer 1: Token Generation                │
│ ├─ Cryptographic randomness (32 bytes)   │
│ ├─ nodejs crypto.randomBytes()           │
│ └─ Impossible to guess/brute force       │
│                                          │
│ Layer 2: Uniqueness                      │
│ ├─ Database unique constraint             │
│ ├─ No duplicate tokens possible           │
│ └─ Prevents collision attacks             │
│                                          │
│ Layer 3: Time Limitation                  │
│ ├─ 48 hour hard expiration                │
│ ├─ TTL index auto-deletes                 │
│ └─ Can't use old tokens                   │
│                                          │
│ Layer 4: Single Use                       │
│ ├─ 'used' flag tracks status              │
│ ├─ POST verification marks used           │
│ └─ Replay attacks prevented               │
│                                          │
│ Layer 5: User Binding                     │
│ ├─ Token linked to creator                │
│ ├─ Audit trail available                  │
│ └─ Usage tracked per user                 │
│                                          │
│ Layer 6: Authentication                   │
│ ├─ Token generation requires login        │
│ ├─ Verify endpoint is public              │
│ └─ No sensitive data in URL               │
│                                          │
└──────────────────────────────────────────┘
```

## Button Rendering Logic Diagram

```
                    START
                      │
                      ▼
            Is Quote Required Brand?
                   /        \
                 Yes        No
                  │          │
                  ▼          ▼
          Token in URL?   Show [Add to Cart] ✅
             /      \
           Yes      No
            │        │
            ▼        ▼
     Token Valid?   Checking?
      /       \      /      \
    Yes      No   Yes       No
     │        │    │         │
     ▼        ▼    ▼         ▼
   Verify?  Show  Show       Show
   (wait)  [Quote] spinner  [Quote]
     │
     ├─ Valid ✓
     │  └─ Show [Add to Cart]
     │
     └─ Invalid ❌
        └─ Show [Get Quote]
```

---

**Legend:**

- ✅ = Show/Enabled
- ❌ = Hidden/Disabled
- ▼ = Next step
- → = Process flow
- │ = Connection
- ├/└ = Branches
