# Google Tag Manager (GTM) Setup Guide

## Overview

Google Tag Manager is now the analytics backbone for Super Collectibles MX. It handles all tracking, cookie management, and consent - without the domain/cookie validation errors.

## Quick Start

### 1. Get Your GTM ID

1. Go to https://tagmanager.google.com
2. Create a container (or use existing)
3. Copy your **GTM ID** (format: `GTM-XXXXXXX`)

### 2. Add to Environment Variables

Update `.env.local`:

```
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
```

### 3. Link Google Analytics to GTM

In Google Tag Manager:

1. Go to **Tags** → Create New Tag
2. Choose **Google Analytics: GA4 Configuration**
3. Select your GA4 property
4. Set trigger to **Initialization - All Pages**
5. Publish the container

### 4. Deploy

```bash
npm run build
npm run start
```

The cookie errors will be resolved - GTM handles domain configuration automatically!

---

## How GTM Tracking Works

All events are sent to the `dataLayer` array. GTM reads from this and forwards to Google Analytics, Facebook Pixel, etc.

### Events Tracked:

- ✅ `view_item` - Product page views
- ✅ `add_to_cart` - Add to cart actions
- ✅ `remove_from_cart` - Remove from cart
- ✅ `view_cart` - Cart page views
- ✅ `begin_checkout` - Checkout initiation
- ✅ `purchase` - Successful orders
- ✅ `login` - User login
- ✅ `sign_up` - User registration
- ✅ `search` - Search queries

### File Locations:

- **GTM Tracking Functions:** `src/lib/gtm.ts`
- **GTM Component:** `src/components/GoogleTagManager.tsx`
- **Layout Setup:** `src/app/(home)/layout.tsx`

---

## Key Advantages Over Direct GA Implementation

| Feature                 | GTM              | Direct GA               |
| ----------------------- | ---------------- | ----------------------- |
| Cookie Domain Errors    | ✅ No            | ❌ Yes (as experienced) |
| Consent Management      | ✅ Built-in      | ❌ Manual               |
| Multiple Tracking Tools | ✅ Easy to add   | ❌ Complex              |
| Server-side Tagging     | ✅ Possible      | ❌ Limited              |
| Debug Without Redeploy  | ✅ Yes           | ❌ No                   |
| Testing Interface       | ✅ Tag Assistant | ❌ None                 |

---

## Common GTM Tasks

### Add New Tracking Event

1. Update `src/lib/gtm.ts` with new function
2. Add to your component:

```typescript
import { trackCustomEvent } from "@/lib/gtm";

trackCustomEvent("event_name", {
  param1: "value",
  param2: 123,
});
```

### Set Up Conversion

1. In GTM: Tags → New Tag
2. Choose Google Analytics: GA4 Event
3. Set event name to match your dataLayer event
4. Add trigger for when event fires
5. Publish

### Debug Events

1. Open your site
2. Perform action (view product, add to cart, etc.)
3. Check browser console for dataLayer logs
4. Open GTM Preview Mode to see real-time events

---

## Consent Management

GTM now handles cookie consent properly. The domain validation errors are gone because GTM manages the cookie domain automatically based on your site.

**No additional configuration needed** - GTM respects the domain where it's deployed.

---

## Troubleshooting

### Events Not Showing

1. Verify GTM ID in `.env.local`
2. Check browser console for errors
3. Ensure GA4 tag is created and published in GTM
4. Use GTM Preview Mode to debug

### Still Getting Cookie Errors

1. Check GTM container is published (not draft)
2. Verify GA4 tag trigger is "All Pages"
3. Clear browser cookies and cache
4. Check Google Analytics property domain settings

### Performance Issues

1. GTM loads asynchronously - should have minimal impact
2. Monitor Core Web Vitals in Google Analytics
3. Use GTM to defer non-critical tracking

---

## Next Steps

1. ✅ Add `NEXT_PUBLIC_GTM_ID` to `.env.local`
2. ✅ Deploy to production
3. In GTM Console:
   - Create GA4 Configuration tag
   - Point to your Google Analytics GA4 property
   - Publish container
4. Monitor real-time events in Google Analytics

**That's it!** You now have enterprise-grade analytics without the cookie headaches.

---

## Reference

- [GTM Official Docs](https://support.google.com/tagmanager)
- [GA4 + GTM Integration](https://support.google.com/analytics/answer/12584313)
- [GTM Data Layer Best Practices](https://support.google.com/tagmanager/answer/6103696)
