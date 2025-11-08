# Supabase Email Verification Setup

## Step 1: Supabase Dashboard Settings

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add these URLs:

**Site URL:**
```
https://snackify-five.vercel.app
```

**Redirect URLs (add both):**
```
https://snackify-five.vercel.app/auth/callback
http://localhost:3000/auth/callback
```

## Step 2: Test Email Flow

1. User signs up with email
2. Clicks verification link in email
3. Redirected to `/auth/callback` page
4. Shows "Email Verified!" message
5. Click button to go to login page

## What We Fixed:

✅ **Fix 1:** Changed "Don&apos;t" to "Don't" (proper apostrophe)
✅ **Fix 2:** Added location badge at top + better mobile spacing (pt-28 on mobile)
✅ **Fix 3:** Created `/auth/callback` page for email confirmation

## Push to Deploy:

```bash
cd d:\Cafe_project\cafe_project
git add .
git commit -m "Fix: Don't text, mobile hero spacing, email verification page"
git push origin master
```

Wait 2-3 minutes for Vercel deployment.
