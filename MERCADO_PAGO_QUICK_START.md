# Mercado Pago Integration - Quick Reference

## 🚀 What Was Added

**Payment Methods:**

- Added Mercado Pago as a second payment option alongside Stripe
- Both methods available on checkout page

**APIs Created:**

- `/api/mercadopago` - Handles payment preference creation
- `/api/mercadopago/webhook` - Handles payment status notifications

**UI Updated:**

- Payment form now shows two buttons:
  - "Pagar con Stripe"
  - "Pagar con Mercado Pago"

---

## 🔑 Where to Get Tokens

### Access Token (for server)

1. Visit: https://www.mercadopago.com/developers/panel/credentials
2. Select Country: **Mexico**
3. Select Tab: **Production** (for live) or **Test** (for sandbox)
4. Copy: **Access Token** (starts with `APP_`)

### Client ID (for frontend)

1. Same URL as above
2. Copy: **Public Key** / **Client ID**

**⚠️ Important:** Keep Access Token SECRET - never share or commit to git

---

## ⚙️ Environment Variables

Add to `.env.local`:

```bash
MERCADO_PAGO_ACCESS_TOKEN=APP_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_MERCADO_PAGO_CLIENT_ID=1234567890123456
```

**For Sandbox Testing:**

```bash
MERCADO_PAGO_ACCESS_TOKEN=APP_TEST_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 🔗 Webhook Configuration

**URL to add:**

```
https://www.supercollectibles.com.mx/api/mercadopago/webhook
```

**Steps:**

1. Go to: https://www.mercadopago.com/developers/panel/webhooks
2. Click "Add new webhook"
3. Paste URL above
4. Subscribe to events:
   - ✅ `payment.created`
   - ✅ `payment.updated`
5. Save and test

**Result:** When customer pays, Mercado Pago automatically notifies your server, which updates order status.

---

## 🧪 Testing

**Test Card (Sandbox only):**

- Number: `4111 1111 1111 1111`
- Expiry: Any future date
- CVV: Any 3 digits

**Test Payment Flow:**

1. Add items to cart
2. Go to checkout
3. Click "Pagar con Mercado Pago"
4. Use test card above
5. Payment should succeed
6. Order status updates automatically via webhook

---

## 📊 Payment Status Updates

Your system automatically handles:
| Status | Action |
|--------|--------|
| Approved | Order confirmed, email sent |
| Pending | Waiting for payment |
| Rejected | Order cancelled |
| Refunded | Refund processed |

---

## 📁 File Locations

Where to find the code:

- `/src/app/api/mercadopago/route.ts` - Main payment API
- `/src/app/api/mercadopago/webhook/route.ts` - Webhook handler
- `/src/app/(home)/carrito/_components/PaymentForm.tsx` - UI buttons
- `MERCADO_PAGO_SETUP.md` - Complete setup guide

---

## ✅ Deployment Checklist

- [ ] Get Access Token from Mercado Pago dashboard
- [ ] Add to `.env.local`
- [ ] Test with sandbox credentials
- [ ] Configure webhook URL
- [ ] Test webhook with Mercado Pago dashboard
- [ ] Swap to production credentials
- [ ] Deploy to production
- [ ] Test live payment
- [ ] Verify order status updates

---

## 🆘 Quick Troubleshooting

| Problem                    | Solution                                          |
| -------------------------- | ------------------------------------------------- |
| "Invalid preference" error | Check Access Token is correct and active          |
| Webhook not firing         | Verify webhook URL is accessible and in dashboard |
| Orders not updating        | Check server logs, verify webhook received        |
| Test card declined         | Use `4111 1111 1111 1111` in sandbox mode only    |

---

## 📚 More Help

- Official Docs: https://www.mercadopago.com.mx/developers/es/docs
- Dashboard: https://www.mercadopago.com/developers/panel
- Webhooks Help: https://www.mercadopago.com/developers/en/guides/webhooks/get-started
