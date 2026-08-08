# Google Analytics Setup Guide

## Installation ✓

Google Analytics is set up using `@next/third-parties` which is the official Next.js package for third-party integrations

## Configuration

### 1. Get Your Google Analytics ID

1. Go to [Google Analytics](https://analytics.google.com/)
2. Create a new property for your website
3. Get your Measurement ID (format: `G-XXXXXXXXXX`)

### 2. Add Environment Variable

Create or update `.env.local`:

```bash
NEXT_PUBLIC_GA_ID=G-YOUR_MEASUREMENT_ID
```

## E-commerce Event Tracking

The app includes pre-built analytics events for tracking e-commerce activities:

### Available Events

```typescript
import {
  trackProductView,
  trackAddToCart,
  trackRemoveFromCart,
  trackViewCart,
  trackBeginCheckout,
  trackPurchase,
  trackSearch,
  trackEvent,
  setUserId,
} from "@/lib/analytics";
```

### Usage Examples

#### 1. Track Product View

```typescript
import { trackProductView } from "@/lib/analytics";

trackProductView({
  id: product._id,
  name: product.title,
  price: product.variations[0].price,
  category: product.category,
  brand: product.brand,
});
```

#### 2. Track Add to Cart

```typescript
import { trackAddToCart } from "@/lib/analytics";

trackAddToCart({
  id: product._id,
  name: product.title,
  price: item.price,
  quantity: 1,
  category: product.category,
});
```

#### 3. Track Cart View

```typescript
import { trackViewCart } from "@/lib/analytics";

trackViewCart(
  cartItems,
  cartTotal,
  "MXN", // currency
);
```

#### 4. Track Purchase (Most Important!)

```typescript
import { trackPurchase } from "@/lib/analytics";

trackPurchase(
  order._id,
  order.orderItems,
  order.paymentInfo.amountPaid,
  order.paymentInfo.taxPaid,
  order.ship_cost || 0,
  "MXN",
);
```

#### 5. Track Search

```typescript
import { trackSearch } from "@/lib/analytics";

trackSearch("laptop", results.length);
```

#### 6. Set User ID (for authenticated users)

```typescript
import { setUserId } from "@/lib/analytics";

if (session?.user) {
  setUserId(session.user._id);
}
```

## Where to Integrate Events

### Product Page

- Add `trackProductView()` when product loads

### Shopping Cart

- Add `trackAddToCart()` when item added
- Add `trackRemoveFromCart()` when item removed
- Add `trackViewCart()` when cart page opens

### Checkout

- Add `trackBeginCheckout()` when checkout starts
- Add `trackPurchase()` after successful payment ✓ **CRITICAL**

### Search

- Add `trackSearch()` in search results

### Authentication

- Add `setUserId()` after successful login

## Key Metrics to Monitor

Once set up, you can track in Google Analytics:

1. **Revenue** - Total sales via `trackPurchase()`
2. **Conversion Rate** - Purchase events / sessions
3. **Cart Abandonment** - Begin checkout vs Purchase
4. **Average Order Value** - From purchase events
5. **Product Performance** - View items → Add to cart → Purchase
6. **User Journey** - Complete customer path

## Testing

To verify GA is working:

1. Open your site in browser
2. Go to Google Analytics → Real-time
3. You should see your session active
4. Trigger events (view product, add to cart, etc.)
5. Events should appear in Real-time report

## Notes

- `NEXT_PUBLIC_GA_ID` is public because GA IDs are meant to be public
- All sensitive data is handled by Google securely
- The library handles automatic page view tracking
- Custom e-commerce events require manual implementation (done via utilities in `/src/lib/analytics.ts`)

## Resources

- [Next.js Google Analytics](https://nextjs.org/docs/app/building-your-application/optimizing/third-party-libraries#google-analytics)
- [Google Analytics Documentation](https://support.google.com/analytics)
- [GA4 Ecommerce Events](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce)
