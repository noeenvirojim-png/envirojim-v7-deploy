-- Mock Data for Runtime Validation
-- Targets EnviroJim HQ (00000000-0000-0000-0000-000000000001)

-- 1. Site
INSERT INTO public.sites (id, organization_id, name)
VALUES ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'HQ Warehouse')
ON CONFLICT DO NOTHING;

-- 2. Machine
INSERT INTO public.machines (id, organization_id, site_id, serial_number, make, model, year, current_hours)
VALUES ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'SN-VALIDATION-001', 'CAT', '320GC', 2024, 150)
ON CONFLICT DO NOTHING;

-- 3. Ticket
INSERT INTO public.tickets (id, organization_id, machine_id, created_by, title, description, priority, status)
VALUES ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'Validation Ticket', 'Test ticket for runtime audit', 'NORMAL', 'OPEN')
ON CONFLICT DO NOTHING;

-- 4. Part Request
INSERT INTO public.part_requests (id, organization_id, machine_id, requester_user_id, status, urgency)
VALUES ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'PENDING', 'NORMAL')
ON CONFLICT DO NOTHING;
