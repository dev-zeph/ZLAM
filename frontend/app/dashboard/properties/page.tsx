import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import PropertyManager from '@/components/properties/PropertyManager'

export default async function PropertiesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <DashboardLayout>
      <PropertyManager />
    </DashboardLayout>
  )
}