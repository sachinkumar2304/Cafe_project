-- Create the cart_item type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE public.cart_item AS (menu_item_id BIGINT, quantity INT);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create the order processing function
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
