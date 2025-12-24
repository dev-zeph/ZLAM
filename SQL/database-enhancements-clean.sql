-- ZephVault Database Enhancements
-- Run this after the sql-foundation.sql has been executed
-- This file contains RLS policies, storage setup, views, and functions

-- 1. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- 2. RLS POLICIES (Only authenticated firm members can access)
-- Properties policies
CREATE POLICY "Authenticated users can view properties" ON properties
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage properties" ON properties
  FOR ALL USING (auth.role() = 'authenticated');

-- Units policies
CREATE POLICY "Authenticated users can view units" ON units
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage units" ON units
  FOR ALL USING (auth.role() = 'authenticated');

-- Tenants policies
CREATE POLICY "Authenticated users can view tenants" ON tenants
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage tenants" ON tenants
  FOR ALL USING (auth.role() = 'authenticated');

-- Documents policies
CREATE POLICY "Authenticated users can view documents" ON documents
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage documents" ON documents
  FOR ALL USING (auth.role() = 'authenticated');

-- Notification logs policies
CREATE POLICY "Authenticated users can view notification logs" ON notification_logs
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage notification logs" ON notification_logs
  FOR ALL USING (auth.role() = 'authenticated');

-- 3. STORAGE BUCKET SETUP
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- 4. STORAGE POLICIES (Private bucket access for authenticated users only)
CREATE POLICY "Authenticated users can upload documents" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update documents" ON storage.objects
  FOR UPDATE USING (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete documents" ON storage.objects
  FOR DELETE USING (bucket_id = 'documents' AND auth.role() = 'authenticated');

-- 5. USEFUL VIEWS FOR THE FRONTEND
CREATE OR REPLACE VIEW tenant_units_view AS
SELECT 
  t.id as tenant_id,
  t.full_name,
  t.email,
  t.phone_number,
  t.rent_due_date,
  t.reminder_status,
  u.id as unit_id,
  u.unit_number,
  u.status as unit_status,
  p.id as property_id,
  p.name as property_name,
  p.address as property_address,
  -- Calculate days until rent is due
  (t.rent_due_date - CURRENT_DATE) as days_until_due,
  -- Status indicator for UI
  CASE 
    WHEN (t.rent_due_date - CURRENT_DATE) <= 0 THEN 'overdue'
    WHEN (t.rent_due_date - CURRENT_DATE) <= 7 THEN 'urgent'
    WHEN (t.rent_due_date - CURRENT_DATE) <= 30 THEN 'due_soon'
    ELSE 'normal'
  END as payment_status
FROM tenants t
JOIN units u ON t.unit_id = u.id
JOIN properties p ON u.property_id = p.id
WHERE t.reminder_status = 'active';

-- 6. DOCUMENTS VIEW WITH CATEGORIZATION
CREATE OR REPLACE VIEW documents_view AS
SELECT 
  d.*,
  u.unit_number,
  p.name as property_name,
  -- File extension for UI icons
  LOWER(RIGHT(d.file_name, 4)) as file_extension,
  -- Size category for display
  CASE 
    WHEN LENGTH(d.ai_summary) > 500 THEN 'detailed'
    WHEN LENGTH(d.ai_summary) > 100 THEN 'brief'
    WHEN d.ai_summary IS NOT NULL THEN 'short'
    ELSE 'no_summary'
  END as summary_length
FROM documents d
LEFT JOIN units u ON d.unit_id = u.id
LEFT JOIN properties p ON u.property_id = p.id;

-- 7. FUNCTION FOR AUTOMATED RENT REMINDERS
CREATE OR REPLACE FUNCTION get_tenants_needing_reminders()
RETURNS TABLE (
  tenant_id UUID,
  full_name TEXT,
  email TEXT,
  phone_number TEXT,
  unit_number TEXT,
  property_name TEXT,
  property_address TEXT,
  rent_due_date DATE,
  days_until_due INTEGER,
  notice_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tuv.tenant_id,
    tuv.full_name,
    tuv.email,
    tuv.phone_number,
    tuv.unit_number,
    tuv.property_name,
    tuv.property_address,
    tuv.rent_due_date,
    tuv.days_until_due,
    CASE 
      WHEN tuv.days_until_due = 30 THEN '30_day_reminder'
      WHEN tuv.days_until_due = 7 THEN '7_day_urgent'
      WHEN tuv.days_until_due = 1 THEN '1_day_final'
      ELSE NULL
    END as notice_type
  FROM tenant_units_view tuv
  WHERE tuv.days_until_due IN (30, 7, 1)
    AND tuv.reminder_status = 'active';
END;
$$ LANGUAGE plpgsql;

-- 8. FUNCTION TO LOG NOTIFICATIONS
CREATE OR REPLACE FUNCTION log_notification(
  p_tenant_id UUID,
  p_notice_type TEXT,
  p_status TEXT DEFAULT 'sent'
) RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO notification_logs (tenant_id, notice_type, status)
  VALUES (p_tenant_id, p_notice_type, p_status)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- 9. FUNCTION TO UPDATE DOCUMENT AI SUMMARY
CREATE OR REPLACE FUNCTION update_document_summary(
  p_document_id UUID,
  p_summary TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE documents 
  SET ai_summary = p_summary
  WHERE id = p_document_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 10. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_units_property_id ON units(property_id);
CREATE INDEX IF NOT EXISTS idx_units_status ON units(status);
CREATE INDEX IF NOT EXISTS idx_tenants_unit_id ON tenants(unit_id);
CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants(email);
CREATE INDEX IF NOT EXISTS idx_tenants_rent_due_date ON tenants(rent_due_date);
CREATE INDEX IF NOT EXISTS idx_documents_unit_id ON documents(unit_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_tenant_sent ON notification_logs(tenant_id, sent_at);

-- Completion message
DO $$ 
BEGIN 
  RAISE NOTICE 'ZephVault database enhancements applied successfully!';
  RAISE NOTICE 'RLS policies enabled, storage configured, and views created.';
END $$;