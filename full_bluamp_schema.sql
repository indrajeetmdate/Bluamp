-- ============================================================
-- BLUAMP ENERGIES - COMPLETE PRODUCTION DATABASE SCHEMA, POLICIES & SEED
-- Target Database: Supabase (ofnwuifgzqjmmnsqsoed)
-- ============================================================

-- 1. App Users Table
CREATE TABLE IF NOT EXISTS "app_users" (
  "username" TEXT PRIMARY KEY,
  "password" TEXT,
  "role" TEXT
);

-- 2. Company Profiles Table (Dealers, Clients, Outlets)
CREATE TABLE IF NOT EXISTS "company_profiles" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT,
  "gstNumber" TEXT,
  "shippingAddress" TEXT,
  "email" TEXT,
  "contactPerson" TEXT,
  "phoneNumber" TEXT
);

-- 3. Received Goods (Raw Materials / Cell Batches)
CREATE TABLE IF NOT EXISTS "received_goods" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT,
  "category" TEXT,
  "makeModel" TEXT,
  "supplier" TEXT,
  "quantity" NUMERIC,
  "status" TEXT,
  "damagedCount" NUMERIC,
  "invoiceNumber" TEXT,
  "serials" JSONB,
  "timestamp" NUMERIC,
  "testReportLink" TEXT,
  "gradingConfig" JSONB
);

-- 4. Recipes Table (Product SKUs / BOMs)
CREATE TABLE IF NOT EXISTS "recipes" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT,
  "components" JSONB
);

-- 5. Work In Progress (WIP Assembly Batches)
CREATE TABLE IF NOT EXISTS "wip_items" (
  "id" TEXT PRIMARY KEY,
  "recipeId" TEXT,
  "quantity" NUMERIC,
  "timestamp" NUMERIC,
  "consumedSerials" JSONB
);

-- 6. Finished Goods (Assembled Packs & Inverters)
CREATE TABLE IF NOT EXISTS "finished_goods" (
  "id" TEXT PRIMARY KEY,
  "recipeId" TEXT,
  "quantity" NUMERIC,
  "qualityRemarks" TEXT,
  "deliveredTo" TEXT,
  "unitDeliveries" JSONB,
  "timestamp" NUMERIC,
  "consumedSerials" JSONB,
  "inRepairUnitIds" JSONB,
  "repairedUnitIds" JSONB,
  "dismantledUnitIds" JSONB,
  "unitMetadata" JSONB,
  "unitComponentMap" JSONB,
  "isDTF" BOOLEAN DEFAULT false
);

-- 7. Repair Items Table
CREATE TABLE IF NOT EXISTS "repair_items" (
  "id" TEXT PRIMARY KEY,
  "finishedGoodId" TEXT,
  "recipeId" TEXT,
  "unitId" TEXT,
  "timestamp" NUMERIC
);

-- 8. Test Results Table (Cell Voltage & IR Tests)
CREATE TABLE IF NOT EXISTS "test_results" (
  "id" TEXT PRIMARY KEY,
  "receivedGoodId" TEXT,
  "serialNumber" TEXT,
  "category" TEXT,
  "voltage" NUMERIC,
  "resistance" NUMERIC,
  "capacity" NUMERIC,
  "passed" BOOLEAN,
  "grade" TEXT, 
  "location" TEXT, 
  "timestamp" NUMERIC,
  "testedBy" TEXT
);

-- 9. System Activity Logs
CREATE TABLE IF NOT EXISTS "logs" (
  "id" TEXT PRIMARY KEY,
  "timestamp" NUMERIC,
  "username" TEXT,
  "action" TEXT,
  "details" TEXT
);

-- 10. Invoices Table
CREATE TABLE IF NOT EXISTS "invoices" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "filename" TEXT,
  "document_type" TEXT,
  "source_type" TEXT,
  "issuer_details" JSONB,
  "receiver_details" JSONB,
  "invoice_metadata" JSONB,
  "items" JSONB,
  "totals" JSONB,
  "ocr_confidence_score" NUMERIC,
  "raw_text" TEXT,
  "requires_review" BOOLEAN,
  "uploaded_by" TEXT,
  "timestamp" TEXT
);

-- 11. Invoice Templates Table
CREATE TABLE IF NOT EXISTS "invoice_templates" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "name" TEXT,
  "type" TEXT,
  "config" JSONB,
  "created_at" TIMESTAMPTZ DEFAULT now()
);

-- 12. Price List Table
CREATE TABLE IF NOT EXISTS "price_list" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "model_name" TEXT,
  "hsn_code" TEXT,
  "price_without_gst" NUMERIC,
  "created_at" TIMESTAMPTZ DEFAULT now()
);

-- 13. Operational Expenses Table
CREATE TABLE IF NOT EXISTS "expenses" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "date" TEXT,
  "amount" NUMERIC,
  "category" TEXT,
  "description" TEXT,
  "paid_to" TEXT,
  "payment_mode" TEXT,
  "receipt_url" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now()
);

-- 14. Storage Rooms
CREATE TABLE IF NOT EXISTS "storage_rooms" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT
);

-- 15. Storage Units
CREATE TABLE IF NOT EXISTS "storage_units" (
  "id" TEXT PRIMARY KEY,
  "roomId" TEXT,
  "name" TEXT,
  "type" TEXT,
  "sectionCount" NUMERIC
);

-- 16. Storage Items
CREATE TABLE IF NOT EXISTS "storage_items" (
  "id" TEXT PRIMARY KEY,
  "unitId" TEXT,
  "sectionIndex" NUMERIC,
  "name" TEXT,
  "description" TEXT,
  "quantity" NUMERIC,
  "linkedInventoryId" TEXT,
  "timestamp" NUMERIC
);

-- 17. Employee Tasks Table
CREATE TABLE IF NOT EXISTS "employee_tasks" (
  "id" TEXT PRIMARY KEY,
  "assigned_to" TEXT,
  "title" TEXT,
  "description" TEXT,
  "completed" BOOLEAN DEFAULT false,
  "due_date" TEXT,
  "created_at" BIGINT,
  "created_by" TEXT
);

-- 18. Rack Assignments Table
CREATE TABLE IF NOT EXISTS "rack_assignments" (
  "id" TEXT PRIMARY KEY,
  "itemId" TEXT,
  "itemType" TEXT,
  "rackId" TEXT,
  "shelfId" NUMERIC,
  "quantity" NUMERIC,
  "timestamp" NUMERIC
);

-- 18. Supplies Records Table
CREATE TABLE IF NOT EXISTS "supplies_records" (
  "id" TEXT PRIMARY KEY,
  "item_name" TEXT,
  "direction" TEXT,
  "from_company" TEXT,
  "to_company" TEXT,
  "is_ordered" BOOLEAN,
  "is_received" BOOLEAN,
  "is_shipped" BOOLEAN,
  "timestamp" NUMERIC,
  "created_by" TEXT
);

-- ============================================================
-- SECURITY POLICIES & PERMISSIONS
-- Disable RLS across operational tables to ensure reliable client sync
-- ============================================================
ALTER TABLE "app_users" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "company_profiles" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "received_goods" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "recipes" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "wip_items" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "finished_goods" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "repair_items" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "test_results" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "logs" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "invoices" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "invoice_templates" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "price_list" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "expenses" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "storage_rooms" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "storage_units" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "storage_items" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "employee_tasks" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "rack_assignments" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "supplies_records" DISABLE ROW LEVEL SECURITY;

-- Grant permissions to anon, authenticated, & service_role
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- ============================================================
-- REALISTIC OPERATIONAL SEED DATA
-- ============================================================

-- Seed Primary Admin User
INSERT INTO app_users (username, password, role)
VALUES ('blueampcnergy@gmail.com', 'blueampdc', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Seed Company Profiles (Dealers & Outlets)
INSERT INTO company_profiles (id, name, "gstNumber", "shippingAddress", email, "contactPerson", "phoneNumber")
VALUES 
  ('cp-apex-01', 'Apex Renewable Solutions Pvt Ltd', '27AABCA1234F1Z1', 'Plot 42, Industrial Zone, MIDC Bhosari, Pune, MH - 411026', 'orders@apexrenewables.in', 'Rajesh Sharma', '+91 98220 11223'),
  ('cp-greengrid-02', 'GreenGrid Solar Dealers', '27XYZDE5678K1Z5', 'Shop 12, Energy Complex, Station Road, Nashik, MH - 422001', 'sales@greengridsolar.com', 'Amit Deshmukh', '+91 94230 44556'),
  ('cp-bluamp-headquarters', 'Bluamp Energies Experience Centre', '27BLUAMP9999P1Z9', 'Bluamp Energy Park, Phase II MIDC Chakan, Pune, MH - 410501', 'blueampcnergy@gmail.com', 'Director Operations', '+91 20 6789 0000')
ON CONFLICT (id) DO NOTHING;

-- Seed Raw Materials (Received Goods)
INSERT INTO received_goods (id, name, category, "makeModel", supplier, quantity, status, "damagedCount", "invoiceNumber", serials, timestamp)
VALUES 
  ('rg-catl-280ah', 'CATL 3.2V 280Ah Prismatic LiFePO4 Cells', 'Cell', 'CATL LF280K Grade A', 'Contemporary Amperex Tech (CATL)', 128, 'Done', 0, 'INV-CATL-2026-088', '["CATL-280AH-0001", "CATL-280AH-0002", "CATL-280AH-0003", "CATL-280AH-0004", "CATL-280AH-0005", "CATL-280AH-0006", "CATL-280AH-0007", "CATL-280AH-0008", "CATL-280AH-0009", "CATL-280AH-0010", "CATL-280AH-0011", "CATL-280AH-0012", "CATL-280AH-0013", "CATL-280AH-0014", "CATL-280AH-0015", "CATL-280AH-0016"]'::jsonb, (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT),
  ('rg-eve-100ah', 'EVE 3.2V 100Ah Prismatic LiFePO4 Cells', 'Cell', 'EVE LF100LA', 'EVE Energy Co.', 64, 'Done', 0, 'INV-EVE-2026-042', '["EVE-100AH-0001", "EVE-100AH-0002", "EVE-100AH-0003", "EVE-100AH-0004", "EVE-100AH-0005", "EVE-100AH-0006", "EVE-100AH-0007", "EVE-100AH-0008"]'::jsonb, (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT),
  ('rg-jkbms-16s', 'Smart BMS 16S 48V 200A Bluetooth/CAN', 'BMS', 'JK-BD6A24S20P', 'JK BMS Ltd', 16, 'Done', 0, 'INV-JKBMS-2026-105', '["JKBMS-48V-001", "JKBMS-48V-002", "JKBMS-48V-003", "JKBMS-48V-004"]'::jsonb, (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT),
  ('rg-enc-5kwh', 'Bluamp 5kWh Server Rack Battery Enclosure', 'Enclosure', 'Bluamp SR-5000 Steel Case', 'Precision Sheet Metal Works', 10, 'Done', 0, 'INV-ENC-2026-77', '["ENC-5KWH-001", "ENC-5KWH-002", "ENC-5KWH-003"]'::jsonb, (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT)
ON CONFLICT (id) DO NOTHING;

-- Seed Product SKUs (Recipes)
INSERT INTO recipes (id, name, components)
VALUES 
  ('recipe-bluamp-5kwh-pack', 'Bluamp PowerWall 5.12kWh 48V 100Ah Pack', '[{"masterItemName": "CATL 3.2V 280Ah Prismatic LiFePO4 Cells", "quantityPerUnit": 16}, {"masterItemName": "Smart BMS 16S 48V 200A Bluetooth/CAN", "quantityPerUnit": 1}, {"masterItemName": "Bluamp 5kWh Server Rack Battery Enclosure", "quantityPerUnit": 1}]'::jsonb),
  ('recipe-bluamp-3-5kva-hups', 'Bluamp HUPS 3.5kVA Solar Hybrid Inverter', '[{"masterItemName": "EVE 3.2V 100Ah Prismatic LiFePO4 Cells", "quantityPerUnit": 8}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Seed Finished Goods
INSERT INTO finished_goods (id, "recipeId", quantity, "qualityRemarks", "deliveredTo", timestamp, "isDTF")
VALUES 
  ('fin-bluamp-5kwh-001', 'recipe-bluamp-5kwh-pack', 2, 'All 16S cell voltages balanced within 2mV. High C-rate discharge verified.', 'Apex Renewable Solutions Pvt Ltd', (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT, false),
  ('fin-bluamp-3-5kva-002', 'recipe-bluamp-3-5kva-hups', 5, 'Pure sine wave output tested under 3.5kVA resistive load.', 'GreenGrid Solar Dealers', (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT, false)
ON CONFLICT (id) DO NOTHING;

-- Seed Price List
INSERT INTO price_list (model_name, hsn_code, price_without_gst)
VALUES 
  ('Bluamp PowerWall 5.12kWh 48V 100Ah LiFePO4 Battery Pack', '85076000', 78500.00),
  ('Bluamp HUPS 3.5kVA Solar Hybrid Inverter', '85044090', 32500.00),
  ('Bluamp Compact 2.56kWh 24V 100Ah Battery Pack', '85076000', 42000.00)
ON CONFLICT DO NOTHING;

-- Seed Storage Rooms & Units
INSERT INTO storage_rooms (id, name)
VALUES 
  ('room-cell-lab', 'Cell Grading & QC Testing Lab'),
  ('room-fg-vault', 'Finished Goods Dispatch Warehouse')
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage_units (id, "roomId", name, type, "sectionCount")
VALUES 
  ('unit-rack-a1', 'room-cell-lab', 'Rack A1 (Raw Cells)', 'Rack', 4),
  ('unit-rack-b2', 'room-fg-vault', 'Rack B2 (Finished Battery Packs)', 'Rack', 6)
ON CONFLICT (id) DO NOTHING;

-- Seed Employee Tasks
INSERT INTO employee_tasks (id, assigned_to, title, description, completed, due_date, created_at, created_by)
VALUES 
  ('task-bluamp-01', 'blueampcnergy@gmail.com', '1C Rate Discharge Audit on 5.12kWh PowerWall Packs', 'Execute full 100A discharge test on completed batch #BLU-PW-5120.', false, '2026-07-25', (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT, 'blueampcnergy@gmail.com'),
  ('task-bluamp-02', 'chitale', 'Impedance & Voltage Matching for CATL 280Ah Cells', 'Sort and log IR values for 128 cells in CATL Grade A shipment.', true, '2026-07-24', (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT, 'blueampcnergy@gmail.com')
ON CONFLICT (id) DO NOTHING;
