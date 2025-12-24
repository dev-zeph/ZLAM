import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import DocumentVault from '@/components/documents/DocumentVault'

export default async function DocumentsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <DashboardLayout>
      <DocumentVault />
    </DashboardLayout>
  )
}