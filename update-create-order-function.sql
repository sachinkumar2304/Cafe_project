-- Updated create_order function to handle loyalty points
CREATE OR REPLACE FUNCTION public.create_order(
    p_user_id UUID,
    p_location_id VARCHAR(50),
    p_delivery_charge NUMERIC,
    p_cart_items public.cart_item[],
    p_points_used INT DEFAULT 0,
    p_discount_from_points NUMERIC DEFAULT 0,
    p_payment_method VARCHAR(20) DEFAULT 'cod'
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
    v_user_points INT;
BEGIN
    -- 1. Calculate total amount from the cart items and their current prices
    FOREACH cart_item IN ARRAY p_cart_items
    LOOP
        SELECT price INTO v_item_price FROM public.menu_items WHERE id = cart_item.menu_item_id;
        v_total_amount := v_total_amount + (v_item_price * cart_item.quantity);
    END LOOP;

    -- Add delivery charge
    v_total_amount := v_total_amount + p_delivery_charge;
    
    -- 2. Validate and apply points discount
    IF p_points_used > 0 THEN
        -- Check user has enough points
        SELECT loyalty_points INTO v_user_points FROM public.profiles WHERE id = p_user_id;
        
        IF v_user_points IS NULL OR v_user_points < p_points_used THEN
            RAISE EXCEPTION 'Insufficient loyalty points';
        END IF;
        
        -- Deduct points from user's balance
        UPDATE public.profiles 
        SET loyalty_points = loyalty_points - p_points_used 
        WHERE id = p_user_id;
        
        -- Apply discount to total amount
        v_total_amount := v_total_amount - p_discount_from_points;
        
        -- Ensure total is not negative
        IF v_total_amount < 0 THEN
            v_total_amount := 0;
        END IF;
        
        -- Record the transaction
        INSERT INTO public.loyalty_transactions (user_id, points, transaction_type, description)
        VALUES (p_user_id, -p_points_used, 'redeem', 'Points used for order discount');
    END IF;

    -- 3. Generate a 6-digit OTP
    v_otp := LPAD(FLOOR(random() * 1000000)::text, 6, '0');

    -- 4. Insert the new order into the orders table
    INSERT INTO public.orders (
        user_id, 
        location_id, 
        total_amount, 
        delivery_charge, 
        otp, 
        status,
        points_used,
        discount_from_points,
        payment_method
    )
    VALUES (
        p_user_id, 
        p_location_id, 
        v_total_amount, 
        p_delivery_charge, 
        v_otp, 
        'confirmed',
        p_points_used,
        p_discount_from_points,
        p_payment_method
    )
    RETURNING id INTO v_order_id;

    -- 5. Insert items into the order_items table
    FOREACH cart_item IN ARRAY p_cart_items
    LOOP
        SELECT price INTO v_item_price FROM public.menu_items WHERE id = cart_item.menu_item_id;
        INSERT INTO public.order_items (order_id, menu_item_id, quantity, price)
        VALUES (v_order_id, cart_item.menu_item_id, cart_item.quantity, v_item_price);
    END LOOP;

    -- 6. Return the newly created order ID
    RETURN v_order_id;
END;
$$;
