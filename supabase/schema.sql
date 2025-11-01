--
-- GOLD-STANDARD SCHEMA for Café Delights
-- Version 2.1: Added create_order transaction function
--

-- STEP 1: Define Custom Types

CREATE TYPE public.order_status AS ENUM (
    'pending',
    'confirmed',
    'out_for_delivery',
    'delivered',
    'cancelled'
);

-- STEP 2: Create Core Tables

CREATE TABLE IF NOT EXISTS public.serviceable_cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.locations (
  id varchar(50) PRIMARY KEY,
  name varchar(255) NOT NULL,
  address text,
  highlights text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.menu_items (
  id bigserial PRIMARY KEY,
  name varchar(255) NOT NULL,
  description text,
  price numeric(10,2) NOT NULL,
  category varchar(100) NOT NULL,
  is_veg boolean DEFAULT true,
  is_available boolean DEFAULT true,
  image_url text,
  location_id varchar(50),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE,
  name VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(255),
  pincode VARCHAR(10),
  landmark TEXT
);

CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'admin'
);

CREATE SEQUENCE IF NOT EXISTS public.order_number_seq
    START WITH 1001
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE IF NOT EXISTS public.orders (
  id bigserial PRIMARY KEY,
  order_number INT UNIQUE NOT NULL DEFAULT nextval('public.order_number_seq'),
  user_id UUID,
  location_id varchar(50),
  total_amount numeric(10,2) NOT NULL,
  delivery_charge numeric(10,2) DEFAULT 0,
  status public.order_status DEFAULT 'pending',
  otp VARCHAR(6),
  created_at timestamp with time zone DEFAULT now(),
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL,
  FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id bigserial PRIMARY KEY,
  order_id bigint NOT NULL,
  menu_item_id bigint NOT NULL,
  quantity int NOT NULL,
  price numeric(10,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE,
  FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE RESTRICT
);

-- STEP 3: Add Indexes for Performance

CREATE INDEX IF NOT EXISTS idx_menu_items_location_id ON public.menu_items(location_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_location_id ON public.orders(location_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id ON public.order_items(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- STEP 4: Seed Initial Data

INSERT INTO public.serviceable_cities (name) VALUES
('Badlapur'),
('Ambernath'),
('Ulhasnagar'),
('Vangani')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.locations (id, name, address, highlights) VALUES
('loc1', 'Rameshwaram Dosa Center', '123 Main Street, Downtown', 'Famous for Traditional Dosas'),
('loc2', 'Vighnaharta Sweet & Snacks Corner', '456 Park Avenue, Midtown', 'Best South Indian Sweets'),
('loc3', 'Vighnaharta Snacks Corner', '789 Oak Street, Uptown', 'Quick Bites & Snacks')
ON CONFLICT (id) DO NOTHING;

-- STEP 5: Set up Row Level Security (RLS)

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.admins WHERE id = user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP POLICY IF EXISTS "Users can view and update their own profile" ON public.profiles;
CREATE POLICY "Users can view and update their own profile" ON public.profiles
    FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles" ON public.profiles
    FOR ALL USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders" ON public.orders
    FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
CREATE POLICY "Users can create their own orders" ON public.orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
CREATE POLICY "Admins can manage all orders" ON public.orders
    FOR ALL USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view items for their own orders" ON public.order_items;
CREATE POLICY "Users can view items for their own orders" ON public.order_items
    FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.orders WHERE id = order_id));
DROP POLICY IF EXISTS "Admins can manage all order items" ON public.order_items;
CREATE POLICY "Admins can manage all order items" ON public.order_items
    FOR ALL USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can see their own admin status" ON public.admins;
CREATE POLICY "Users can see their own admin status" ON public.admins
    FOR SELECT USING (auth.uid() = id);

-- STEP 6: Create Triggers

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET SEARCH_PATH = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- STEP 7: Create Order Processing Function (Transaction)

-- Define a type for the cart items input
CREATE TYPE public.cart_item AS (menu_item_id BIGINT, quantity INT);

CREATE OR REPLACE FUNCTION public.create_order(
    p_user_id UUID,
    p_location_id VARCHAR(50),
    p_delivery_charge NUMERIC,
    p_cart_items public.cart_item[]
)
RETURNS BIGINT -- Returns the new order ID
LANGUAGE plpgsql
AS $$ 
DECLARE
    v_total_amount NUMERIC := 0;
    v_order_id BIGINT;
    v_otp VARCHAR(6);
    cart_item public.cart_item;
    v_item_price NUMERIC;
BEGIN
    -- 1. Calculate total amount from the cart items and their current prices
    FOREACH cart_item IN ARRAY p_cart_items
    LOOP
        SELECT price INTO v_item_price FROM public.menu_items WHERE id = cart_item.menu_item_id;
        v_total_amount := v_total_amount + (v_item_price * cart_item.quantity);
    END LOOP;

    -- Add delivery charge
    v_total_amount := v_total_amount + p_delivery_charge;

    -- 2. Generate a 6-digit OTP
    v_otp := LPAD(FLOOR(random() * 1000000)::text, 6, '0');

    -- 3. Insert the new order into the orders table
    INSERT INTO public.orders (user_id, location_id, total_amount, delivery_charge, otp, status)
    VALUES (p_user_id, p_location_id, v_total_amount, p_delivery_charge, v_otp, 'confirmed')
    RETURNING id INTO v_order_id;

    -- 4. Insert items into the order_items table
    FOREACH cart_item IN ARRAY p_cart_items
    LOOP
        SELECT price INTO v_item_price FROM public.menu_items WHERE id = cart_item.menu_item_id;
        INSERT INTO public.order_items (order_id, menu_item_id, quantity, price)
        VALUES (v_order_id, cart_item.menu_item_id, cart_item.quantity, v_item_price);
    END LOOP;

    -- 5. Return the newly created order ID
    RETURN v_order_id;
END;
$$;


