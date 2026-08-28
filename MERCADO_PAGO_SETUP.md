# Mercado Pago Integration Guide

## Overview

You've successfully added Mercado Pago as an additional payment method to your e-commerce platform. This guide will walk you through the setup process and configuration.

## What Was Created

### 1. **API Endpoints**

#### `/api/mercadopago` (POST)

Creates a Mercado Pago payment preference and returns the checkout URL.

**Request Body:**

```json
{
  "items": [...],
  "email": "customer@example.com",
  "user": {...},
  "fulfillmentType": "shipping" | "pickup",
  "shipping": {...},
  "shippingMethod": {...},
  "affiliateInfo": "..."
}
```

**Response:**

```json
{
  "id": "order_id",
  "init_point": "https://www.mercadopago.com.mx/checkout/v1/...",
  "preferenceId": "mp_preference_id"
}
```

#### `/api/mercadopago/webhook` (POST/GET)

Receives payment status notifications from Mercado Pago. This updates order status automatically when payments are:

- ✅ Approved
- ⏳ Pending
- ❌ Rejected/Cancelled
- 💰 Refunded

### 2. **Frontend Integration**

The payment form now has two payment buttons:

- "Pagar con Stripe" (existing)
- "Pagar con Mercado Pago" (new)

Both buttons support:

- Shipping and Pickup fulfillment types
- Discount tracking
- Affiliate tracking
- Real-time inventory validation

---

## Setup Instructions

### Step 1: Get Your Mercado Pago Credentials

1. Go to [Mercado Pago Developers Dashboard](https://www.mercadopago.com/developers)
2. Log in or create an account
3. Create an application:
   - Click "Create an app"
   - Name it: "Super Collectibles - Mexico"
   - Select "Checkout Pro" or "Web Tokenize Checkout"
4. You'll get two important tokens:
   - **Client ID**: Used in frontend (starts with large number)
   - **Access Token**: Used in backend API (starts with `APP_`)

### Step 2: Add Environment Variables

Add these to your `.env.local` file:

```bash
# Mercado Pago Credentials
MERCADO_PAGO_ACCESS_TOKEN=APP_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_MERCADO_PAGO_CLIENT_ID=1234567890123456
```

**Where to find them:**

1. Go to [Credentials Page](https://www.mercadopago.com/developers/panel/credentials)
2. Ensure you're in the correct country (México)
3. Production tab shows live credentials
4. Test tab shows sandbox credentials (for testing)

### Step 3: Configure Webhook URL

Webhooks allow Mercado Pago to notify your server about payment status changes.

1. Go to [Webhooks Configuration](https://www.mercadopago.com/developers/panel/webhooks)
2. Click "Add new webhook"
3. Set these values:

   **URL:**

   ```
   https://www.supercollectibles.com.mx/api/mercadopago/webhook
   ```

   **Events to Subscribe (check these boxes):**
   - ✅ `payment.created`
   - ✅ `payment.updated`

4. Click "Save webhook"
5. Mercado Pago will show you a webhook ID - save this
6. Test the webhook by clicking the test button

**Note for Development:**

- For localhost testing, you'll need to use a tunneling service like [ngrok](https://ngrok.com/)
- Run: `ngrok http 3000`
- Use the ngrok URL in webhook configuration (e.g., `https://xyz.ngrok.io/api/mercadopago/webhook`)

### Step 4: Test in Sandbox Mode

1. Use sandbox credentials from the Test tab in credentials
2. Add to `.env.local`:

   ```bash
   MERCADO_PAGO_ACCESS_TOKEN=APP_TEST_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

3. Make a test payment:
   - Use test card: **4111 1111 1111 1111**
   - Expiry: Any future date
   - CVV: Any 3 digits

4. Payment should be approved and order updated automatically

### Step 5: Deploy to Production

1. Swap `.env` variables to production credentials:

   ```bash
   MERCADO_PAGO_ACCESS_TOKEN=APP_PROD_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   NEXT_PUBLIC_MERCADO_PAGO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxx
   ```

2. Update webhook URL to production domain (already set to `www.supercollectibles.com.mx`)

3. Verify webhook is working:
   - Mercado Pago Dashboard → Webhooks → Test button
   - Should show successful delivery

---

## Payment Flow

```
User clicks "Pagar con Mercado Pago"
        ↓
Frontend calls /api/mercadopago
        ↓
Backend validates stock & creates order
        ↓
Backend creates Mercado Pago preference
        ↓
User redirected to Mercado Pago checkout
        ↓
User completes payment
        ↓
Mercado Pago sends webhook notification
        ↓
Backend updates order status
        ↓
Email confirmation sent to user
        ↓
User redirected to success page
```

---

## Order Status Mapping

| Mercado Pago Status | Order Status | Payment Status |
| ------------------- | ------------ | -------------- |
| `approved`          | `confirmed`  | `success`      |
| `pending`           | `pending`    | `pending`      |
| `rejected`          | `cancelled`  | `failed`       |
| `cancelled`         | `cancelled`  | `cancelled`    |
| `refunded`          | `refunded`   | `refunded`     |

---

## Testing Checklist

- [ ] Environment variables configured
- [ ] Webhook URL added to Mercado Pago dashboard
- [ ] Sandbox test payment successful
- [ ] Order created in database with correct status
- [ ] Webhook notification received and processed
- [ ] Confirmation email sent
- [ ] Customer redirected to success page
- [ ] Production credentials swapped
- [ ] Live payment tested with actual card

---

## Troubleshooting

### Payment fails with "Invalid preference"

- ✅ Check `MERCADO_PAGO_ACCESS_TOKEN` is correct and active
- ✅ Verify all items have positive prices
- ✅ Check inventory is available

### Webhook not received

- ✅ Verify webhook URL in Mercado Pago dashboard
- ✅ Check server logs for incoming requests
- ✅ Test webhook manually from Mercado Pago dashboard
- ✅ Ensure URL is accessible from internet (not localhost)

### Order not updating after payment

- ✅ Check database logs for payment record creation
- ✅ Verify webhook signature validation passing
- ✅ Check Order model has `paymentInfo` field with status

### Test card keeps being declined

- ✅ Use VISA test card: `4111 1111 1111 1111`
- ✅ Expiry: Any future date (e.g., 12/25)
- ✅ CVV: Any 3 digits (e.g., 123)

---

## File Locations

- **Payment API:** `/src/app/api/mercadopago/route.ts`
- **Webhook Handler:** `/src/app/api/mercadopago/webhook/route.ts`
- **Payment Form UI:** `/src/app/(home)/carrito/_components/PaymentForm.tsx`
- **GTM Tracking:** `/src/lib/gtm.ts` (already integrated)

---

## Security Notes

1. **Never commit credentials** - Use `.env.local` which is gitignored
2. **Webhook validation** - Verify X-Signature header for production
3. **HTTPS only** - Mercado Pago requires HTTPS for production
4. **Rate limiting** - Implement rate limiting on `/api/mercadopago` endpoints

---

## Next Steps

1. ✅ Get Access Token from Mercado Pago
2. ✅ Add to `.env.local`
3. ✅ Configure webhook URL
4. ✅ Test in sandbox
5. ✅ Deploy and test production

For questions, visit [Mercado Pago Documentation](https://www.mercadopago.com.mx/developers/es/docs)
