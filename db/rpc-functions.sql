-- ============================================================================
-- ENVIROJIM PLATFORM - RPC FUNCTIONS FOR ATOMIC TRANSACTIONS (V6 SECURED)
-- ============================================================================

-- Function: create_machine_with_document
CREATE OR REPLACE FUNCTION create_machine_with_document(
    p_machine_data JSONB,
    p_document_data JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
    v_machine_id UUID;
    v_document_id UUID;
    v_result JSONB;
BEGIN
    -- 0. SECURITY CHECK
    v_org_id := (p_machine_data->>'organization_id')::UUID;
    IF NOT is_admin(auth.uid()) AND NOT EXISTS (
        SELECT 1 FROM get_auth_org_hierarchy() WHERE org_id = v_org_id
    ) THEN
        RAISE EXCEPTION 'Access Denied: You do not have permission to create machines for this organization.';
    END IF;

    -- 1. Insert machine
    INSERT INTO public.machines (
        organization_id,
        site_id,
        serial_number,
        make,
        model,
        year,
        current_hours,
        engine_make,
        engine_serial,
        assigned_partner_id
    )
    VALUES (
        v_org_id,
        (p_machine_data->>'site_id')::UUID,
        p_machine_data->>'serial_number',
        p_machine_data->>'make',
        p_machine_data->>'model',
        (p_machine_data->>'year')::INTEGER,
        COALESCE((p_machine_data->>'current_hours')::INTEGER, 0),
        p_machine_data->>'engine_make',
        p_machine_data->>'engine_serial',
        (p_machine_data->>'assigned_partner_id')::UUID
    )
    RETURNING id INTO v_machine_id;

    -- 2. Insert document if provided
    IF p_document_data IS NOT NULL THEN
        INSERT INTO public.documents (
            machine_id,
            organization_id,
            title,
            file_url
        )
        VALUES (
            v_machine_id,
            v_org_id,
            p_document_data->>'title',
            p_document_data->>'file_url'
        )
        RETURNING id INTO v_document_id;
    END IF;

    v_result := jsonb_build_object(
        'machine_id', v_machine_id,
        'document_id', v_document_id
    );

    RETURN v_result;
END;
$$;

-- Function: create_part_request_with_items
CREATE OR REPLACE FUNCTION create_part_request_with_items(
    p_request_data JSONB,
    p_items_data JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_request_id UUID;
    v_item JSONB;
    v_machine_id UUID;
    v_org_id UUID;
BEGIN
    -- 0. SECURITY CHECK
    v_machine_id := (p_request_data->>'machine_id')::UUID;
    v_org_id := (p_request_data->>'organization_id')::UUID;

    IF NOT is_admin(auth.uid()) AND NOT EXISTS (
        SELECT 1 FROM public.machines m
        WHERE m.id = v_machine_id
        AND (m.organization_id IN (SELECT org_id FROM get_auth_org_hierarchy()) OR m.assigned_partner_id IN (SELECT org_id FROM get_auth_org_hierarchy()))
    ) THEN
         RAISE EXCEPTION 'Access Denied: You do not have permission to request parts for this machine.';
    END IF;

    -- 1. Insert part request
    INSERT INTO public.part_requests (
        machine_id,
        organization_id,
        requester_user_id,
        status,
        urgency,
        client_po_number
    )
    VALUES (
        v_machine_id,
        v_org_id,
        auth.uid(),
        'PENDING',
        COALESCE((p_request_data->>'urgency')::request_urgency, 'NORMAL'),
        p_request_data->>'client_po_number'
    )
    RETURNING id INTO v_request_id;

    -- 2. Insert items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items_data)
    LOOP
        INSERT INTO public.part_request_items (
            request_id,
            part_catalog_id,
            quantity_requested,
            part_name_snapshot,
            part_number_snapshot
        )
        VALUES (
            v_request_id,
            (v_item->>'part_catalog_id')::UUID,
            (v_item->>'quantity')::INTEGER,
            v_item->>'name',
            v_item->>'part_number'
        );
    END LOOP;

    RETURN v_request_id;
END;
$$;

-- Function: update_part_request_status
CREATE OR REPLACE FUNCTION update_part_request_status(
    p_request_id UUID,
    p_new_status request_status
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_machine_id UUID;
BEGIN
    -- 0. SECURITY CHECK
    SELECT machine_id INTO v_machine_id
    FROM public.part_requests
    WHERE id = p_request_id;

    IF NOT is_admin(auth.uid()) AND NOT EXISTS (
        SELECT 1 FROM public.machines m
        WHERE m.id = v_machine_id
        AND (m.organization_id IN (SELECT org_id FROM get_auth_org_hierarchy()) OR m.assigned_partner_id IN (SELECT org_id FROM get_auth_org_hierarchy()))
    ) THEN
        RAISE EXCEPTION 'Access Denied: You do not have permission to update this request.';
    END IF;

    -- 1. Update status
    UPDATE public.part_requests
    SET status = p_new_status,
        updated_at = NOW()
    WHERE id = p_request_id;
END;
$$;
