-- db/migrations/002_atomic_invoice_function.sql
-- Atomic Invoice Creation with Inventory Deduction
-- This function ensures ACID compliance for billing operations.

CREATE OR REPLACE FUNCTION create_invoice_and_deduct_stock(
    p_organization_id UUID,
    p_branch_id UUID,
    p_customer_id UUID,
    p_items JSONB, -- Array of {product_id, quantity, unit_price, discount, gst_rate}
    p_totals JSONB, -- {grand_total, amount_paid, balance_due, payment_method, payment_details}
    p_created_by_user_id UUID
) RETURNS TABLE (invoice_id UUID, invoice_number VARCHAR) AS $$
DECLARE
    v_invoice_number VARCHAR;
    v_invoice_id UUID;
    v_item_record JSONB;
    v_product_id UUID;
    v_quantity NUMERIC;
    v_current_stock NUMERIC;
    v_invoice_snapshot JSONB := '[]'::jsonb;
    v_invoice_items_data JSONB := '[]'::jsonb;
BEGIN
    -- 1. Generate Invoice Number (e.g., INV-YYYYMMDD-XXXX)
    -- In production, use a sequence or atomic counter table
    v_invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

    -- 2. Create Invoice Record (Status: ISSUED)
    INSERT INTO invoices (organization_id, branch_id, customer_id, invoice_number, invoice_date, total_grand_amount, amount_paid, balance_due, payment_method, invoice_snapshot, created_by_user_id)
    VALUES (p_organization_id, p_branch_id, p_customer_id, v_invoice_number, NOW(),
            (p_totals->>'grand_total')::NUMERIC, (p_totals->>'amount_paid')::NUMERIC, (p_totals->>'balance_due')::NUMERIC,
            p_totals->>'payment_method', v_invoice_snapshot, p_created_by_user_id)
    RETURNING id INTO v_invoice_id;

    -- 3. Loop through items, deduct stock, and create invoice_items
    FOR v_item_record IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item_record->>'product_id')::UUID;
        v_quantity := (v_item_record->>'quantity')::NUMERIC;

        -- 3a. Lock row and check stock (SELECT FOR UPDATE)
        SELECT current_stock INTO v_current_stock
        FROM branch_products
        WHERE branch_id = p_branch_id AND product_id = v_product_id
        FOR UPDATE;

        IF v_current_stock < v_quantity THEN
            RAISE EXCEPTION 'Insufficient stock for product % (Available: %, Required: %)', v_product_id, v_current_stock, v_quantity;
        END IF;

        -- 3b. Deduct Stock
        UPDATE branch_products
        SET current_stock = current_stock - v_quantity
        WHERE branch_id = p_branch_id AND product_id = v_product_id;

        -- 3c. Log Stock Movement
        INSERT INTO stock_movements (branch_id, product_id, quantity_change, movement_type, source_ref_id, recorded_by_user_id, recorded_at)
        VALUES (p_branch_id, v_product_id, -v_quantity, 'SALE', v_invoice_id, p_created_by_user_id, NOW());

        -- 3d. Build Invoice Item Snapshot
        v_invoice_items_data := v_invoice_items_data || jsonb_build_object(
            'invoice_id', v_invoice_id,
            'product_id', v_product_id,
            'quantity', v_quantity,
            'unit_price_snapshot', (v_item_record->>'unit_price')::NUMERIC,
            'discount_applied', (v_item_record->>'discount')::NUMERIC,
            'gst_rate_snapshot', (v_item_record->>'gst_rate')::NUMERIC,
            'taxable_amount', ( (v_item_record->>'quantity')::NUMERIC * (v_item_record->>'unit_price')::NUMERIC ) - (v_item_record->>'discount')::NUMERIC,
            'line_total', ( (v_item_record->>'quantity')::NUMERIC * (v_item_record->>'unit_price')::NUMERIC ) - (v_item_record->>'discount')::NUMERIC -- Simplified
        );
    END LOOP;

    -- 4. Insert Invoice Items
    INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price_snapshot, discount_applied, gst_rate_snapshot, taxable_amount, line_total)
    SELECT
        (elem->>'invoice_id')::UUID,
        (elem->>'product_id')::UUID,
        (elem->>'quantity')::NUMERIC,
        (elem->>'unit_price_snapshot')::NUMERIC,
        (elem->>'discount_applied')::NUMERIC,
        (elem->>'gst_rate_snapshot')::NUMERIC,
        (elem->>'taxable_amount')::NUMERIC,
        (elem->>'line_total')::NUMERIC
    FROM jsonb_array_elements(v_invoice_items_data) AS elem;

    -- 5. Record Payments
    IF (p_totals->>'amount_paid')::NUMERIC > 0 THEN
        INSERT INTO payments (organization_id, invoice_id, payment_date, amount, payment_method, transaction_ref)
        VALUES (p_organization_id, v_invoice_id, NOW(), (p_totals->>'amount_paid')::NUMERIC, p_totals->>'payment_method', p_totals->>'transaction_ref');
    END IF;

    -- 6. Update Invoice Snapshot with final items (for PDF generation)
    UPDATE invoices SET invoice_snapshot = v_invoice_items_data WHERE id = v_invoice_id;

    RETURN QUERY SELECT v_invoice_id, v_invoice_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to the service role / authenticated users as needed
GRANT EXECUTE ON FUNCTION create_invoice_and_deduct_stock TO supabase_admin, authenticated;