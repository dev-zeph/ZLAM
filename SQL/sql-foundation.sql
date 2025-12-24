-- 1. PROPERTIES (The high-level container for plazas)
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- e.g., "Faith Plaza"
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. UNITS (Individual suites/shops)
CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  unit_number TEXT NOT NULL, -- e.g., "Suite 101"
  status TEXT DEFAULT 'occupied', -- occupied, vacant
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TENANTS (For contact info and automated reminders)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT,
  rent_due_date DATE NOT NULL, -- The date staff enters manually
  reminder_status TEXT DEFAULT 'active', -- active, paused
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. DOCUMENTS (General legal vault + Property docs)
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL, -- Path to Supabase Storage
  category TEXT DEFAULT 'general', -- general, lease, litigation, corporate
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL, -- optional link to Faith Plaza
  ai_summary TEXT, -- Where the OpenAI summary is saved
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. NOTIFICATION LOGS (The "Paper Trail" for the law firm)
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  sent_at TIMESTAMPTZ DEFAULT now(),
  notice_type TEXT, -- "30_day_reminder", "7_day_urgent"
  status TEXT -- "delivered", "failed"
);