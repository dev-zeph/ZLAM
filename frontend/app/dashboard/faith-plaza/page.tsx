import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import FaithPlazaManager from '@/components/faith-plaza/FaithPlazaManager'

export default async function FaithPlazaPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <DashboardLayout>
      <FaithPlazaManager />
    </DashboardLayout>
  )
}