# 🔑 Razorpay Live Keys Setup Guide for Client

> **Important:** This guide is for when the client gets GST approval and is ready to go live with real payments.

---

## 📋 WhatsApp Message Template (Send to Client)

```
Hi [Client Name],

Good news! Your cafe website is ready for live payments. 🎉

To start accepting real payments, I need you to get **Live Razorpay Keys** by following these simple steps:

### Step 1: Login to Razorpay
1. Go to: https://dashboard.razorpay.com
2. Login with your Razorpay account
3. **Switch to LIVE MODE** (top-right toggle)

### Step 2: Complete KYC (if not done)
If Razorpay asks for verification, provide:
- Business name & type (Proprietorship/Partnership/Pvt Ltd)
- PAN card
- GST number (when approved)
- Bank account details (Account number, IFSC, cancelled cheque)
- Business address proof

### Step 3: Generate Live Keys
1. Go to: Settings → API Keys
2. Click **"Generate Live Key"**
3. You'll get 2 keys:
   - **Key ID** (starts with rzp_live_xxx)
   - **Key Secret** (keep this SECRET!)

### Step 4: Send Me Keys Securely
Please send me these 2 keys via WhatsApp (or email):

**RAZORPAY_KEY_ID:** rzp_live_xxxxx
**RAZORPAY_KEY_SECRET:** xxxxx (KEEP SECRET!)

⚠️ **IMPORTANT:** 
- Never share Key Secret publicly
- Send only to me directly
- I will replace test keys with these

### Step 5: Webhook Setup (I'll handle this)
Once you send keys, I'll set up the webhook URL in your Razorpay dashboard for automatic payment verification.

**Timeline:** KYC approval usually takes 24-72 hours.

Let me know once you complete this! 🚀

Thanks,
[Your Name]
```

---

## 🛠️ Developer Instructions (After Receiving Live Keys)

### Step 1: Update Environment Variables

Replace test keys in `.env.local`:

```bash
# OLD (Test Mode)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_1DP5mmOlF5G5ag
RAZORPAY_KEY_SECRET=thisissecretkey

# NEW (Live Mode - from client)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
```

### Step 2: Update Vercel Environment Variables (if deployed)

1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Update these variables:
   - `NEXT_PUBLIC_RAZORPAY_KEY_ID` = `rzp_live_xxxxx`
   - `RAZORPAY_KEY_SECRET` = `xxxxx`
3. Click **"Redeploy"** to apply changes

### Step 3: Setup Webhook in Razorpay Dashboard

1. Login to Razorpay Dashboard (Live Mode)
2. Go to: **Settings** → **Webhooks**
3. Click **"+ Add Webhook URL"**
4. Enter:
   - **Webhook URL:** `https://yourdomain.com/api/payments/webhook`
     - Replace `yourdomain.com` with actual production URL
   - **Secret:** (Razorpay will generate - copy this!)
   - **Events:** Select these:
     - ✅ `payment.captured`
     - ✅ `payment.failed`
     - ✅ `order.paid`
5. Click **"Create Webhook"**

### Step 4: Add Webhook Secret to Environment

Add the webhook secret to `.env.local`:

```bash
RAZORPAY_WEBHOOK_SECRET=whsec_xxxxx
```

Also add to Vercel environment variables and redeploy.

### Step 5: Test with Real Payment

1. Place a small test order (₹10)
2. Use **real credit/debit card** (test cards won't work in live mode!)
3. Verify payment appears in Razorpay Dashboard
4. Check order status updated to "Confirmed" in database
5. Verify webhook received (check Razorpay webhook logs)

---

## 🧪 Test Card Details (Test Mode Only)

For testing in **Test Mode** (before going live):

```
Card Number: 4111 1111 1111 1111
CVV: Any 3 digits (e.g., 123)
Expiry: Any future date (e.g., 12/25)
```

**Note:** Test cards will ONLY work with `rzp_test_` keys!

---

## 🔒 Security Checklist

Before going live, ensure:

- ✅ `.env.local` NOT committed to git
- ✅ `.gitignore` includes `.env.local`
- ✅ `RAZORPAY_KEY_SECRET` only in server environment
- ✅ Webhook signature verification enabled (already in code)
- ✅ HTTPS enabled on production domain
- ✅ Test payment successful with live keys

---

## 📞 Support

If client faces issues:

1. **KYC Rejected:** Ask client to check Razorpay email for reason
2. **Live Keys Not Generated:** KYC must be approved first
3. **Webhook Not Working:** Check Razorpay webhook logs for errors
4. **Payment Failed:** Check Razorpay dashboard → Payments → Failed

---

## 🎯 Post-Live Checklist

After going live:

- [ ] Test payment with real card successful
- [ ] Order created in database
- [ ] Webhook received and verified
- [ ] Email notification sent (if implemented)
- [ ] Admin can see payment ID in orders
- [ ] Client can see transaction in Razorpay dashboard
- [ ] Settlement schedule configured (auto-transfer to bank)

---

**Last Updated:** November 8, 2025
