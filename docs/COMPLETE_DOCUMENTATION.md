# Snackify - Complete Documentation

## Table of Contents
1. [Project Setup](#project-setup)
2. [User Authentication Guide](#user-authentication)
3. [Email Verification Setup](#email-verification)
4. [Production Deployment](#production-deployment)
5. [Database Schema](#database-schema)
6. [SQL Maintenance Scripts](#sql-maintenance-scripts)

---

## Project Setup

This is a [Next.js](https://nextjs.org) project for Snackify - a fresh South Indian food delivery platform.

### Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Tech Stack
- **Frontend:** Next.js 15.5.6, React 19, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Payments:** Razorpay (COD + Online)
- **Storage:** Supabase Storage (Menu Images)

---

## User Authentication

### Setup Steps

1. **Supabase Configuration**
   - Create account at [supabase.com](https://supabase.com)
   - Create new project
   - Get Project URL and anon key from Settings → API

2. **Environment Variables**
   Add to `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

3. **Authentication Flow**
   - Sign Up: Email + Password + Referral Code (optional)
   - Email Verification: Required before login
   - Sign In: Email + Password
   - Password Reset: Email link sent

4. **Admin Access**
   - Admin users added manually in `admins` table
   - Admin panel: `/admin`
   - Only accessible to verified admin users

---

## Email Verification

### Supabase Dashboard Settings

1. Go to **Authentication** → **URL Configuration**

2. Add these URLs:

   **Site URL:**
   ```
   https://snackify-five.vercel.app
   ```

   **Redirect URLs:**
   ```
   https://snackify-five.vercel.app/auth/callback
   http://localhost:3000/auth/callback
   ```

3. **Email Flow:**
   - User signs up → Verification email sent
   - User clicks link → Redirected to `/auth/callback`
   - Shows "Email Verified!" message
   - User can now sign in

---

## Production Deployment

### Vercel Deployment Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin master
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with GitHub
   - Import `Cafe_project` repository

3. **Environment Variables**
   Add in Vercel Settings → Environment Variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   ```

4. **Deploy**
   - Click Deploy
   - Wait 2-3 minutes
   - Get live URL

5. **Post-Deployment**
   - Update Supabase redirect URLs
   - Test authentication flow
   - Test order placement

### Live Keys Setup (Optional - For Production Payments)

When client gets Razorpay live keys:

1. **Razorpay Dashboard**
   - Get Live Key ID and Secret
   - Add webhook URL: `https://your-domain.com/api/payments/webhook`
   - Get webhook secret

2. **Update Environment Variables**
   ```
   NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxx
   RAZORPAY_KEY_SECRET=live_secret_xxxxx
   RAZORPAY_WEBHOOK_SECRET=whsec_xxxxx
   ```

3. **Test Live Payments**
   - Use real card for testing
   - Verify webhook events
   - Check order status updates

---

## Database Schema

### Main Tables

**1. profiles**
- User information
- Loyalty points
- Referral codes
- Delivery addresses

**2. orders**
- Order tracking
- Payment details
- Status management
- OTP verification

**3. menu_items**
- Food items
- Pricing
- Categories
- Availability

**4. locations**
- Shop/kitchen locations
- Service areas
- Contact details

**5. loyalty_transactions**
- Points earned/redeemed
- Transaction history
- Order linking

### Key Files
- `supabase/schema.sql` - Main database schema
- `supabase/loyalty-schema.sql` - Loyalty system schema

---

## SQL Maintenance Scripts

All diagnostic and fix scripts are in `docs/sql-scripts/` folder:

### Common Scripts

**1. Check Order Status**
```sql
-- See: docs/sql-scripts/check-cancelled-orders.sql
SELECT order_number, status, is_cancelled 
FROM orders 
WHERE order_number IN (1013, 1014, 1018);
```

**2. Fix RLS Policies**
```sql
-- See: docs/sql-scripts/fix-rls-policies.sql
CREATE POLICY "Users can update own orders" 
ON orders FOR UPDATE TO authenticated
USING (auth.uid() = user_id);
```

**3. Generate Referral Codes**
```sql
-- See: docs/sql-scripts/generate-referral-codes.sql
UPDATE profiles
SET referral_code = 'USER' || SUBSTRING(REPLACE(id::text, '-', ''), 1, 6)
WHERE referral_code IS NULL;
```

**4. Verify Loyalty Points**
```sql
-- See: docs/sql-scripts/verify-loyalty-system.sql
SELECT loyalty_points, 
       COALESCE(SUM(lt.points), 0) as transaction_total
FROM profiles p
LEFT JOIN loyalty_transactions lt ON lt.user_id = p.id
WHERE p.email = 'user@example.com';
```

---

## Features

### For Customers
- ✅ Browse menu by location
- ✅ Add items to cart
- ✅ Loyalty points system (10 points per order)
- ✅ Referral system (25 points for both users)
- ✅ Order tracking with OTP
- ✅ Order cancellation (5-min window, COD only)
- ✅ Profile management
- ✅ Email verification

### For Admins
- ✅ Menu management (Add/Edit/Delete items)
- ✅ Image upload for menu items
- ✅ Order management
- ✅ Status updates
- ✅ Real-time order list
- ✅ Location management

---

## Support

For issues or questions:
- Email: support@snackify.com
- Developer: sachinkumar2304

---

## License

Private - All rights reserved

---

**Last Updated:** November 8, 2025
