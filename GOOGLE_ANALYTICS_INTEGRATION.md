# Google Analytics Integration - Complete Summary

## Overview

Google Analytics event tracking has been successfully integrated across all major e-commerce flows in the Super Collectibles MX application using the `@next/third-parties` package with Next.js GoogleAnalytics component.

## Implementation Status ✅

### 1. **Product Viewing** ✅

**File:** `src/app/(home)/producto/_components/ProductDetailsComponent.tsx`

**What happens:**

- `trackProductView()` is called when user lands on a product page
- Tracks: product ID, title, price, category, brand

**Code:**

```typescript
useEffect(() => {
  if (product && product._id) {
    trackProductView({
      id: product._id,
      name: product.title,
      price: product.variations?.[0]?.price || 0,
      category: product.category || "Sin categoría",
      brand: product.brand || "Sin marca",
    });
  }
}, [product._id]);
```

**GA Event:** `view_item`

---

### 2. **Adding to Cart** ✅

**Files:**

- `src/app/(home)/producto/_components/ProductDetailsComponent.tsx` (line ~155)
- `src/app/(home)/producto/_components/ProductCard.tsx` (line ~41)
- `src/app/(home)/perfil/_components/FavoritesComp.tsx` (line ~28)

**What happens:**

- `trackAddToCart()` is called whenever user clicks "Add to Cart"
- Tracks: product ID, name, price, category, quantity (always 1)
- Works from: Product detail page, product grid, favorites list

**Code Example:**

```typescript
trackAddToCart({
  id: product._id,
  name: product.title,
  price: variation.price || 0,
  category: product.category || "Sin categoría",
  quantity: 1,
});
dispatch(addToCart(v));
```

**GA Event:** `add_to_cart`

---

### 3. **Beginning Checkout** ✅

**File:** `src/app/(home)/carrito/_components/PaymentForm.tsx`

**What happens:**

- `trackBeginCheckout()` is called when user initiates checkout (clicks pay button)
- Tracks: all cart items with details, total value, currency
- Occurs BEFORE payment processing

**Code:**

```typescript
trackBeginCheckout({
  items: productsData.map((item: any) => ({
    id: item.product || item._id,
    name: item.title,
    price: item.price || 0,
    quantity: item.quantity,
  })),
  value: totalPrice,
  currency: "MXN",
});
```

**GA Event:** `begin_checkout`

---

### 4. **Purchase Completion** ✅ (CRITICAL)

**File:** `src/app/api/orders/webhook/route.ts`

**What happens:**

- `trackPurchase()` is called by Stripe webhook after successful payment
- Tracks: order ID, all items with details, total value, tax, shipping, currency, user ID
- Occurs AFTER payment confirmation from Stripe

**Code:**

```typescript
trackPurchase({
  id: currentOrder._id.toString(),
  name: `Order ${currentOrder.orderId}`,
  items: currentOrder.orderItems.map((item: any) => ({
    id: item.product || item._id,
    name: item.title,
    price: item.price,
    quantity: item.quantity,
    category: item.category || "Sin categoría",
  })),
  value: totalOrderAmount,
  tax: 0,
  shipping: currentOrder.ship_cost || 0,
  currency: "MXN",
  userId: currentOrder.user?.toString() || undefined,
});
```

**GA Event:** `purchase`

---

### 5. **User Identification** ✅

**Files:**

- `src/components/layouts/LoginComponent.tsx` (login page)
- `src/components/layouts/RegisterComponent.tsx` (registration page)

**What happens:**

- `setUserId()` is called when user successfully authenticates
- Tracks user across devices and sessions
- Called in useEffect that watches session status

**Code:**

```typescript
useEffect(() => {
  if (session?.status === "authenticated") {
    if (session?.data?.user?._id) {
      setUserId(session.data.user._id);
    }
    router.replace("/");
  }
}, [session, router]);
```

**GA Event:** Sets `user_id` property

---

## Analytics Utility Functions

All tracking functions are exported from: `src/lib/analytics.ts`

### Available Functions:

1. **`trackProductView(product)`** - Track product page view
2. **`trackAddToCart(product)`** - Track item added to cart
3. **`trackRemoveFromCart(product)`** - Track item removed from cart
4. **`trackViewCart(items)`** - Track cart page view
5. **`trackBeginCheckout(params)`** - Track checkout initiation
6. **`trackPurchase(order)`** - Track successful purchase
7. **`trackSearch(query)`** - Track search queries
8. **`setUserId(userId)`** - Set user ID for cross-device tracking
9. **`trackEvent(name, params)`** - Generic custom event tracker

---

## Configuration

### Environment Variable

Required in `.env.local`:

```
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

### Setup in Layout

File: `src/app/(home)/layout.tsx`

```typescript
import { GoogleAnalytics } from "@next/third-parties/google";

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID!} />
    </>
  );
}
```

---

## Event Flow Summary

```
User Journey → Google Analytics Events
────────────────────────────────────────

1. User visits product page
   → view_item (product ID, title, price, category)

2. User clicks "Add to Cart"
   → add_to_cart (product ID, name, price, quantity)

3. User opens cart
   → (optional) view_cart event

4. User clicks "Checkout"
   → begin_checkout (all items, total value)

5. User completes payment (Stripe confirms)
   → purchase (order ID, items, value, tax, shipping, user ID)

6. User logs in or registers
   → user_id property set (for cross-device tracking)
```

---

## Important Notes

1. **Event Priority:**
   - `purchase` is the MOST important event - tracks actual revenue
   - Should never fail silently; wrapped in try-catch in webhook

2. **User Tracking:**
   - Users are identified via `setUserId()` after login/signup
   - Enables cross-device and cross-session tracking
   - Critical for understanding customer journeys

3. **Currency:**
   - All monetary values tracked in MXN (Mexican Pesos)
   - Consistent across all events

4. **Data Consistency:**
   - Product IDs must be consistent (uses `_id` from MongoDB)
   - Prices are in correct format (no currency symbols)
   - Categories fallback to "Sin categoría" if missing

---

## Testing

### To verify tracking is working:

1. Open Google Analytics in real-time reports
2. Perform actions (view product, add to cart, etc.)
3. Check Real-Time Events section for:
   - `view_item`
   - `add_to_cart`
   - `begin_checkout`
   - `purchase`
   - `user_id` parameter

### Check Console:

Google Analytics events are logged to browser console for debugging:

```javascript
window.gtag?.('event', 'view_item', {...})
```

---

## Future Enhancements

- [ ] Track cart abandonment (begin_checkout → no purchase)
- [ ] Track product search queries (view_search_results)
- [ ] Track promotional impressions
- [ ] Track product reviews/ratings
- [ ] Track newsletter signups
- [ ] Track affiliate conversions
- [ ] Custom audience creation (for remarketing)
- [ ] Enhanced e-commerce reporting

---

## Integration Checklist

- [x] Environment variable configured (NEXT_PUBLIC_GA_ID)
- [x] GoogleAnalytics component added to layout
- [x] Product view tracking implemented
- [x] Add to cart tracking implemented (3 locations)
- [x] Checkout tracking implemented
- [x] Purchase tracking implemented (webhook)
- [x] User identification tracking implemented (login + signup)
- [x] Error handling for analytics failures
- [x] Documentation completed

**Status:** ✅ FULLY INTEGRATED AND ACTIVE

---

## Support

For issues or questions about analytics:

1. Check `/src/lib/analytics.ts` for available functions
2. Review this documentation
3. Check Google Analytics Real-Time reports
4. Check browser console for event logs
