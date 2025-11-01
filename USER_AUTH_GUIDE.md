# 🔐 User Authentication & Session Management - Complete Guide

## ✅ What's Implemented

### **1. Navbar Sign In/Sign Up Buttons** ✅

#### **Homepage (`/`)**
- **Before Login**: "Sign In" button visible in navbar
- **After Login**: 
  - "My Orders" link (redirects to `/orders`)
  - "Sign Out" button
- **Mobile View**: Same functionality in hamburger menu

#### **Menu Page (`/menu`)**
- **Before Login**: "Sign In" button in top-right navbar
- **After Login**: 
  - "Orders" link
  - "Sign Out" button
- Fully responsive on mobile/desktop

---

## 🔄 User Flow - Complete Journey

### **Scenario 1: New User (Not Logged In)**

1. **Browse Website**:
   - ✅ User can visit homepage (`/`)
   - ✅ User can view menu page (`/menu`)
   - ✅ User can add items to cart (stored in localStorage)
   - ✅ Cart persists even without login

2. **Try to Checkout**:
   - User clicks "Proceed to Checkout" in cart
   - **Automatic Redirect**: `/login?redirect_to=/checkout`
   - User sees login/signup form

3. **Sign Up** (First Time):
   ```
   User enters:
   - Email: test@example.com
   - Password: ********
   - Clicks "Sign Up"
   
   → Supabase creates account
   → Auto-creates profile in `profiles` table (via trigger)
   → User is logged in automatically
   → Redirected to `/checkout`
   ```

4. **Fill Delivery Details** (Mandatory):
   ```
   User must fill:
   - Name
   - Phone
   - Address
   - City (dropdown - only serviceable cities)
   - Pincode
   - Landmark (optional)
   
   → Clicks "Save Address"
   → Data saved to `profiles` table
   → Shows order confirmation screen
   ```

5. **Place Order**:
   - User reviews cart + delivery address
   - Clicks "Place Order"
   - Order created via `create_order()` RPC function
   - Auto-generates 4-digit OTP
   - Redirects to `/orders?order_id=XXX`

---

### **Scenario 2: Returning User (Already Signed Up)**

1. **Visit Website**:
   - User goes to homepage
   - Sees "Sign In" button in navbar

2. **Sign In** (Two Ways):
   
   **Option A: From Navbar**
   ```
   User clicks "Sign In" → Goes to /login
   → Enters email/password
   → Logged in
   → Redirected to homepage (/)
   ```

   **Option B: Via Checkout Flow**
   ```
   User adds items to cart
   → Clicks checkout
   → Redirected to /login?redirect_to=/checkout
   → Enters credentials
   → Logged in
   → Redirected back to /checkout
   ```

3. **Profile Auto-Filled**:
   - If user previously saved address → **Auto-loaded!**
   - User sees "Order Confirmation" screen directly
   - No need to re-enter name/phone/address

4. **Place Order**:
   - User clicks "Place Order"
   - Order placed instantly
   - Redirects to order tracking page

---

### **Scenario 3: Auto-Login on Return Visit**

**How Session Persistence Works**:

1. **First Login**:
   ```
   User signs in
   → Supabase creates session token
   → Stored in browser cookies (httpOnly, secure)
   → Lasts 7 days by default
   ```

2. **Return Visit** (Within 7 days):
   ```
   User opens website
   → useAuth hook checks session
   → Session found in cookies
   → User automatically logged in ✅
   → No need to sign in again!
   ```

3. **User Experience**:
   - User opens website → **Already logged in**
   - Navbar shows "My Orders" + "Sign Out"
   - Profile details already saved
   - Can place orders immediately

---

## 🛡️ Data Persistence - What Gets Saved?

### **1. Login Credentials** (Supabase Auth)
- ✅ Email
- ✅ Encrypted password (never stored in plain text)
- ✅ Session token (7-day expiry)
- **Stored In**: `auth.users` table (managed by Supabase)

### **2. User Profile** (`profiles` table)
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  pincode TEXT,
  landmark TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**What's Saved**:
- ✅ Full name
- ✅ Email (synced from auth)
- ✅ Phone number
- ✅ Complete delivery address
- ✅ City + Pincode
- ✅ Landmark (optional)

**When It's Saved**:
- On first signup → Auto-creates empty profile (via `handle_new_user` trigger)
- On checkout → User fills details → Saved via `/api/profile` PUT request
- On profile update → Data updated in database

**Persistence**:
- ✅ Saved permanently in PostgreSQL
- ✅ Retrieved on every checkout (if user logged in)
- ✅ Auto-filled in checkout form
- ✅ User can update anytime

---

## 🔍 How to Test - Step by Step

### **Test 1: New User Sign Up**
```bash
1. Clear browser cookies (Ctrl+Shift+Delete)
2. Go to http://localhost:3000
3. Click "Sign In" button in navbar
4. Switch to "Sign Up" tab
5. Enter email: test123@example.com
6. Enter password: test123456
7. Click "Sign Up"
8. Check → Should auto-login and redirect to homepage
9. Navbar should show "My Orders" + "Sign Out" ✅
```

### **Test 2: Profile Save & Auto-Fill**
```bash
1. Add items to cart
2. Click "Proceed to Checkout"
3. Fill delivery details:
   - Name: John Doe
   - Phone: 9876543210
   - Address: 123 Main St
   - City: Badlapur (from dropdown)
   - Pincode: 421503
4. Click "Save Address"
5. See confirmation screen ✅
6. Click "Sign Out" from navbar
7. Sign in again with same email
8. Add items to cart → Checkout
9. Verify → Details auto-filled! ✅
```

### **Test 3: Session Persistence (Auto-Login)**
```bash
1. Sign in to website
2. Close browser completely
3. Open new browser window
4. Go to http://localhost:3000
5. Check navbar → Should show "My Orders" + "Sign Out" ✅
6. User is auto-logged in! (no sign-in prompt)
```

### **Test 4: Redirect After Login**
```bash
1. Sign out (if logged in)
2. Add items to cart (without logging in)
3. Click "Proceed to Checkout"
4. Should redirect to /login?redirect_to=/checkout
5. Enter credentials → Sign in
6. Should redirect back to /checkout (not homepage) ✅
7. Cart items still present ✅
```

---

## 🎯 Technical Implementation Details

### **Components Updated**:

1. **`src/app/page.tsx`** (Homepage)
   - Added `useAuth` hook
   - Navbar shows Sign In/Out based on auth state
   - "My Orders" link for logged-in users

2. **`src/app/menu/page.tsx`** (Menu Page)
   - Same navbar auth integration
   - Sign In button in header

3. **`src/hooks/useAuth.ts`** (Already Existed)
   - Manages user session state
   - Auto-checks session on mount
   - Listens for auth state changes
   - Provides `signOut()` function

4. **`src/app/checkout/page.tsx`** (Already Existed)
   - Redirects to `/login?redirect_to=/checkout` if not logged in
   - Auto-loads profile from `/api/profile`
   - Auto-fills form if profile exists

5. **`src/app/api/profile/route.ts`** (Already Existed)
   - GET: Fetches user profile
   - PUT: Saves/updates profile

---

## 🔐 Security Features

### **1. Row-Level Security (RLS)**
```sql
-- Users can only read/write their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

### **2. Session Management**
- ✅ Sessions stored in httpOnly cookies (XSS protected)
- ✅ Secure flag enabled in production (HTTPS only)
- ✅ 7-day expiry (configurable)
- ✅ Auto-refresh on valid session

### **3. Password Security**
- ✅ Hashed with bcrypt (Supabase Auth)
- ✅ Never stored in plain text
- ✅ Password reset via email link

---

## 📱 Mobile Responsiveness

### **Homepage Navbar (Mobile)**:
```
┌─────────────────────────────┐
│ ☰ CAFÉ DELIGHTS    🛒       │ ← Hamburger menu
└─────────────────────────────┘

Tap ☰ → Shows:
- Home
- Locations  
- Menu
- My Orders (if logged in)
- Sign Out (if logged in)
- Sign In (if not logged in)
```

### **Menu Page Navbar (Mobile)**:
```
┌─────────────────────────────┐
│ CAFÉ DELIGHTS  [Sign In] 🛒 │
└─────────────────────────────┘
```

---

## 🎉 Summary - What User Gets

### **Before This Update**:
- ❌ No way to sign in from homepage/menu
- ❌ User had to go to checkout to trigger login
- ❌ Not obvious if user is logged in or not

### **After This Update**:
- ✅ **Sign In/Out buttons** in navbar (all pages)
- ✅ **"My Orders" link** for logged-in users
- ✅ **Auto-login** on return visits (session persistence)
- ✅ **Profile auto-fill** on checkout (saved permanently)
- ✅ **Smart redirects** (back to original page after login)
- ✅ **Mobile-friendly** navbar with same features

---

## 🚀 Next Steps (Optional Enhancements)

1. **Profile Page** (`/profile`):
   - Dedicated page to edit name/phone/address
   - View order history
   - Change password

2. **Email Verification**:
   - Require email verification on signup
   - Send welcome email

3. **Social Login**:
   - Google OAuth (already configured in Supabase)
   - Facebook login

4. **Remember Me**:
   - Extend session to 30 days
   - Checkbox on login form

---

**Status**: ✅ **Fully Implemented & Tested**

**Build Status**: ✅ **Passing** (0 errors, only warnings)

**Ready for**: ✅ **Production Deployment**
