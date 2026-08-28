# Mercado Pago Integration - Getting Started (5 Minutes)

## Step 1: Get Your Credentials (1 minute)

Go to: https://www.mercadopago.com/developers/panel/credentials

**You'll see 2 tabs:**

- **Test** - For sandbox testing (free, fake cards)
- **Production** - For live payments (real money)

### Copy These (for sandbox first):

```bash
Access Token: APP_TEST_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Client ID: 1234567890123456789
```

## Step 2: Add to Your Code (30 seconds)

Open `.env.local` and add:

```bash
MERCADO_PAGO_ACCESS_TOKEN=APP_TEST_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_MERCADO_PAGO_CLIENT_ID=1234567890123456789
```

**Replace the x's with your actual values!**

## Step 3: Configure Webhook (2 minutes)

Go to: https://www.mercadopago.com/developers/panel/webhooks

**Click "Add new webhook"**

Paste this URL:

```
https://www.supercollectibles.com.mx/api/mercadopago/webhook
```

**Check these boxes:**

- ☑ payment.created
- ☑ payment.updated

**Click Save**

You should see a green checkmark. Mercado Pago will test it automatically.

## Step 4: Test It (1 minute)

1. Go to your site: http://localhost:3000
2. Add something to cart
3. Click "Checkout"
4. Click "Pagar con Mercado Pago"
5. Use test card: `4111 1111 1111 1111`
6. Any expiry date (e.g., 12/25)
7. Any 3-digit CVV (e.g., 123)
8. Click "Pay"

**Expected:** You should be redirected to success page and order created in your database.

---

## Common Test Cards

| Card Type  | Number              | Status      |
| ---------- | ------------------- | ----------- |
| Visa       | 4111 1111 1111 1111 | ✅ Approved |
| Mastercard | 5555 5555 5555 4444 | ✅ Approved |
| Visa       | 4000 0000 0000 0002 | ❌ Declined |

**These ONLY work in sandbox mode!**

---

## When You're Ready for Production

1. Go to Credentials dashboard
2. Switch to **Production** tab
3. Copy the Production Access Token (starts with `APP_`)
4. Update your `.env` file
5. Redeploy
6. Test with real card (use $1 MXN)
7. Done!

---

## Useful Links

| Task               | Link                                                     |
| ------------------ | -------------------------------------------------------- |
| Get Access Token   | https://www.mercadopago.com/developers/panel/credentials |
| Configure Webhooks | https://www.mercadopago.com/developers/panel/webhooks    |
| Documentation      | https://www.mercadopago.com.mx/developers/es/docs        |
| Dashboard          | https://www.mercadopago.com/developers/panel             |
| Test Payment       | http://localhost:3000/carrito                            |

---

## If Something Goes Wrong

### "Access Denied" error

→ Check your Access Token is copied correctly (no extra spaces)

### Payment form doesn't load

→ Check `.env.local` has the variables
→ Restart your dev server: `npm run dev`

### Webhook not working

→ Make sure URL is: `https://www.supercollectibles.com.mx/api/mercadopago/webhook`
→ Check "payment.created" and "payment.updated" boxes are checked
→ Click "Send test" button in Mercado Pago - should show "Delivered"

### Test card keeps failing

→ You're probably in Production mode
→ Switch to **Test** tab in Credentials
→ Make sure you have `APP_TEST_` token, not `APP_`

---

## That's It! 🎉

Your site now has Mercado Pago payments working!

Questions? Check:

- `MERCADO_PAGO_SETUP.md` - Detailed setup guide
- `MERCADO_PAGO_QUICK_START.md` - Quick reference
- `MERCADO_PAGO_SUMMARY.md` - Complete overview
