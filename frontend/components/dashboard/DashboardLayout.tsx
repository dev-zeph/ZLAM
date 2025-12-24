'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { 
  FileText, 
  Building2, 
  BarChart3, 
  LogOut, 
  Menu, 
  X 
} from 'lucide-react'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
    { name: 'Document Vault', href: '/dashboard/documents', icon: FileText },
    { name: 'Property Management', href: '/dashboard/properties', icon: Building2 },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu button */}
      <div className="md:hidden bg-white shadow-sm border-b p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 fixed md:static inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out`}>
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="p-6">
              <h1 className="text-xl font-bold text-gray-900">ZephVault</h1>
              <p className="text-sm text-gray-500">AN. Zeph & Associates</p>
            </div>

            <Separator />

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>

            <Separator />

            {/* User section */}
            <div className="p-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="w-full flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 md:ml-0">
          <main className="p-6">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}