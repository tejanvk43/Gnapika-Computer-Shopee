-- db/migrations/003_stock_functions.sql
-- Helper functions for inventory management

-- Increment branch stock (for purchase receipts, returns)
CREATE OR REPLACE FUNCTION increment_branch_stock(
    p_branch_id UUID,
    p_product_id UUID,
    p_quantity NUMERIC
) RETURNS VOID AS $$
BEGIN
    INSERT INTO branch_products (branch_id, product_id, current_stock)
    VALUES (p_branch_id, p_product_id, p_quantity)
    ON CONFLICT (branch_id, product_id)
    DO UPDATE SET current_stock = branch_products.current_stock + p_quantity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrement branch stock (for sales, transfers out, service consumption)
CREATE OR REPLACE FUNCTION decrement_branch_stock(
    p_branch_id UUID,
    p_product_id UUID,
    p_quantity NUMERIC
) RETURNS BOOLEAN AS $$
DECLARE
    v_current_stock NUMERIC;
BEGIN
    SELECT current_stock INTO v_current_stock
    FROM branch_products
    WHERE branch_id = p_branch_id AND product_id = p_product_id
    FOR UPDATE;

    IF v_current_stock < p_quantity THEN
        RETURN FALSE; -- Insufficient stock
    END IF;

    UPDATE branch_products
    SET current_stock = current_stock - p_quantity
    WHERE branch_id = p_branch_id AND product_id = p_product_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Stock Transfer Function (Atomic)
CREATE OR REPLACE FUNCTION process_stock_transfer(
    p_transfer_id UUID
) RETURNS VOID AS $$
DECLARE
    v_transfer_record RECORD;
    v_item_record RECORD;
    v_source_branch_id UUID;
    v_dest_branch_id UUID;
BEGIN
    -- Get transfer details
    SELECT * INTO v_transfer_record FROM stock_transfers WHERE id = p_transfer_id FOR UPDATE;

    IF v_transfer_record.status != 'DISPATCHED' THEN
        RAISE EXCEPTION 'Transfer not in DISPATCHED state';
    END IF;

    v_source_branch_id := v_transfer_record.source_branch_id;
    v_dest_branch_id := v_transfer_record.destination_branch_id;

    -- Process each item
    FOR v_item_record IN
        SELECT * FROM stock_transfer_items WHERE transfer_id = p_transfer_id
    LOOP
        -- 1. Deduct from source branch
        PERFORM decrement_branch_stock(v_source_branch_id, v_item_record.product_id, v_item_record.quantity);

        -- Log source movement
        INSERT INTO stock_movements (branch_id, product_id, quantity_change, movement_type, source_ref_id, recorded_at)
        VALUES (v_source_branch_id, v_item_record.product_id, -v_item_record.quantity, 'TRANSFER_OUT', p_transfer_id, NOW());

        -- 2. Add to destination branch
        PERFORM increment_branch_stock(v_dest_branch_id, v_item_record.product_id, v_item_record.quantity);

        -- Log destination movement
        INSERT INTO stock_movements (branch_id, product_id, quantity_change, movement_type, source_ref_id, recorded_at)
        VALUES (v_dest_branch_id, v_item_record.product_id, v_item_record.quantity, 'TRANSFER_IN', p_transfer_id, NOW());
    END LOOP;

    -- Update transfer status
    UPDATE stock_transfers SET status = 'RECEIVED' WHERE id = p_transfer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_branch_stock TO supabase_admin, authenticated;
GRANT EXECUTE ON FUNCTION decrement_branch_stock TO supabase_admin, authenticated;
GRANT EXECUTE ON FUNCTION process_stock_transfer TO supabase_admin, authenticated;