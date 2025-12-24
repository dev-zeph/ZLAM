-- Update rent_amount to yearly_rent_amount to clarify that rents are yearly
-- This script updates the existing database structure

-- 1. Check if rent_amount column exists and rename it, or create yearly_rent_amount if it doesn't exist
DO $$
BEGIN
  -- Check if rent_amount column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenants' 
    AND column_name = 'rent_amount'
  ) THEN
    -- Rename existing rent_amount column
    ALTER TABLE tenants RENAME COLUMN rent_amount TO yearly_rent_amount;
    RAISE NOTICE 'Renamed existing rent_amount column to yearly_rent_amount';
  ELSE
    -- Create yearly_rent_amount column if rent_amount doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tenants' 
      AND column_name = 'yearly_rent_amount'
    ) THEN
      ALTER TABLE tenants ADD COLUMN yearly_rent_amount DECIMAL(10,2);
      RAISE NOTICE 'Created new yearly_rent_amount column';
    ELSE
      RAISE NOTICE 'yearly_rent_amount column already exists';
    END IF;
  END IF;

  -- Check if property_id column exists in tenants table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenants' 
    AND column_name = 'property_id'
  ) THEN
    ALTER TABLE tenants ADD COLUMN property_id UUID REFERENCES properties(id);
    RAISE NOTICE 'Created new property_id column in tenants table';
  ELSE
    RAISE NOTICE 'property_id column already exists in tenants table';
  END IF;
END $$;

-- 2. Update the comment on the column to clarify it's yearly
COMMENT ON COLUMN tenants.yearly_rent_amount IS 'Annual rent amount (paid yearly, not monthly)';

-- 3. Populate property_id for existing tenants based on their unit
UPDATE tenants 
SET property_id = (
  SELECT u.property_id 
  FROM units u 
  WHERE u.id = tenants.unit_id
) 
WHERE property_id IS NULL AND unit_id IS NOT NULL;

-- 4. Update the property_tenants_view to use the new column name
CREATE OR REPLACE VIEW property_tenants_view AS
SELECT 
  t.id as tenant_id,
  t.full_name,
  t.email,
  t.phone_number,
  t.yearly_rent_amount,
  t.rent_due_date,
  t.reminder_status,
  COALESCE(u.id, NULL) as unit_id,
  COALESCE(u.unit_number, 'Direct Tenant') as unit_number,
  COALESCE(u.status, 'occupied') as unit_status,
  COALESCE(t.property_id, u.property_id) as property_id,
  p.name as property_name,
  p.address as property_address,
  -- Calculate days until yearly rent is due
  (t.rent_due_date - CURRENT_DATE) as days_until_due,
  -- Status indicator for UI (adjusted for yearly cycle)
  CASE 
    WHEN (t.rent_due_date - CURRENT_DATE) <= 0 THEN 'overdue'
    WHEN (t.rent_due_date - CURRENT_DATE) <= 30 THEN 'due_very_soon'  -- 30 days for yearly rent
    WHEN (t.rent_due_date - CURRENT_DATE) <= 90 THEN 'due_soon'       -- 90 days for yearly rent
    ELSE 'normal'
  END as payment_status
FROM tenants t
LEFT JOIN units u ON t.unit_id = u.id
LEFT JOIN properties p ON COALESCE(t.property_id, u.property_id) = p.id
WHERE t.reminder_status = 'active';

-- 5. Update the reminder function for yearly rent cycle
CREATE OR REPLACE FUNCTION get_tenants_needing_yearly_reminders()
RETURNS TABLE (
  tenant_id UUID,
  full_name TEXT,
  email TEXT,
  phone_number TEXT,
  unit_number TEXT,
  property_name TEXT,
  property_address TEXT,
  yearly_rent_amount DECIMAL(10,2),
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
    ptv.unit_number,
    ptv.property_name,
    ptv.property_address,
    ptv.yearly_rent_amount,
    ptv.rent_due_date,
    ptv.days_until_due,
    CASE 
      WHEN ptv.days_until_due = 90 THEN '90_day_yearly_reminder'   -- 3 months before
      WHEN ptv.days_until_due = 30 THEN '30_day_yearly_reminder'   -- 1 month before  
      WHEN ptv.days_until_due = 7 THEN '7_day_yearly_urgent'       -- 1 week before
      ELSE NULL
    END as notice_type
  FROM property_tenants_view ptv
  WHERE ptv.days_until_due IN (90, 30, 7)
    AND ptv.reminder_status = 'active';
END;
$$ LANGUAGE plpgsql;

-- 6. Add index on yearly_rent_amount for performance
CREATE INDEX IF NOT EXISTS idx_tenants_yearly_rent_amount ON tenants(yearly_rent_amount);

-- Completion message
DO $$ 
BEGIN 
  RAISE NOTICE 'Successfully updated rent_amount to yearly_rent_amount!';
  RAISE NOTICE 'Updated reminder schedule for yearly rent cycle (90, 30, 7 days before due date)';
END $$;