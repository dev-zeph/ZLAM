-- Additional enhancements for simplified property-tenant relationship
-- Run this after database-enhancements.sql

-- Add yearly_rent_amount to tenants table (rent is paid annually)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS yearly_rent_amount DECIMAL(10,2);

-- Add property_id to tenants for direct relationship (optional, can still use units)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id);

-- Update existing tenants to have property_id based on their unit
UPDATE tenants 
SET property_id = (
  SELECT u.property_id 
  FROM units u 
  WHERE u.id = tenants.unit_id
) 
WHERE property_id IS NULL AND unit_id IS NOT NULL;

-- Create updated view for property-tenant relationship
CREATE OR REPLACE VIEW property_tenants_view AS
SELECT 
  t.id as tenant_id,
  t.full_name,
  t.email,
  t.phone_number,
  t.rent_due_date,
  t.rent_amount,
  t.reminder_status,
  COALESCE(t.property_id, u.property_id) as property_id,
  p.name as property_name,
  p.address as property_address,
  u.unit_number,
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
LEFT JOIN units u ON t.unit_id = u.id
LEFT JOIN properties p ON COALESCE(t.property_id, u.property_id) = p.id
WHERE t.reminder_status = 'active' AND p.id IS NOT NULL;

-- Function to add tenant directly to property
CREATE OR REPLACE FUNCTION add_tenant_to_property(
  p_property_id UUID,
  p_full_name TEXT,
  p_email TEXT,
  p_phone_number TEXT DEFAULT NULL,
  p_rent_amount DECIMAL(10,2) DEFAULT NULL,
  p_rent_due_date DATE DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  new_tenant_id UUID;
BEGIN
  INSERT INTO tenants (
    property_id,
    full_name,
    email,
    phone_number,
    rent_amount,
    rent_due_date,
    reminder_status
  ) VALUES (
    p_property_id,
    p_full_name,
    p_email,
    p_phone_number,
    p_rent_amount,
    COALESCE(p_rent_due_date, CURRENT_DATE + INTERVAL '30 days')
  ) RETURNING id INTO new_tenant_id;
  
  RETURN new_tenant_id;
END;
$$ LANGUAGE plpgsql;

-- Update the rent reminders function to work with the new view
CREATE OR REPLACE FUNCTION get_property_tenants_needing_reminders()
RETURNS TABLE (
  tenant_id UUID,
  full_name TEXT,
  email TEXT,
  phone_number TEXT,
  property_name TEXT,
  property_address TEXT,
  rent_amount DECIMAL(10,2),
  rent_due_date DATE,
  days_until_due INTEGER,
  notice_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ptv.tenant_id,
    ptv.full_name,
    ptv.email,
    ptv.phone_number,
    ptv.property_name,
    ptv.property_address,
    ptv.rent_amount,
    ptv.rent_due_date,
    ptv.days_until_due,
    CASE 
      WHEN ptv.days_until_due = 30 THEN '30_day_reminder'
      WHEN ptv.days_until_due = 7 THEN '7_day_urgent'
      WHEN ptv.days_until_due = 1 THEN '1_day_final'
      ELSE NULL
    END as notice_type
  FROM property_tenants_view ptv
  WHERE ptv.days_until_due IN (30, 7, 1)
    AND ptv.reminder_status = 'active';
END;
$$ LANGUAGE plpgsql;