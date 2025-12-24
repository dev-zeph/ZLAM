'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  FileText, 
  Building2, 
  Users, 
  AlertCircle,
  TrendingUp
} from 'lucide-react'

interface DashboardStats {
  totalDocuments: number
  totalProperties: number
  totalTenants: number
  upcomingRentDue: number
}

export default function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats>({
    totalDocuments: 0,
    totalProperties: 0,
    totalTenants: 0,
    upcomingRentDue: 0
  })
  const [loading, setLoading] = useState(true)
  const [upcomingTenants, setUpcomingTenants] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // Fetch counts for all entities
      const [documentsResult, propertiesResult, tenantsResult, upcomingResult] = await Promise.all([
        supabase.from('documents').select('*', { count: 'exact', head: true }),
        supabase.from('properties').select('*', { count: 'exact', head: true }),
        supabase.from('tenants').select('*', { count: 'exact', head: true }),
        supabase.from('tenant_units_view').select('*').gte('days_until_due', 0).lte('days_until_due', 30)
      ])

      setStats({
        totalDocuments: documentsResult.count || 0,
        totalProperties: propertiesResult.count || 0,
        totalTenants: tenantsResult.count || 0,
        upcomingRentDue: upcomingResult.data?.length || 0
      })

      setUpcomingTenants(upcomingResult.data?.slice(0, 5) || [])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'overdue': return 'destructive'
      case 'urgent': return 'destructive'
      case 'due_soon': return 'secondary'
      default: return 'default'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Welcome to ZephVault Admin Portal</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Welcome to ZephVault Admin Portal</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">
              Legal documents & files
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Properties</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProperties}</div>
            <p className="text-xs text-muted-foreground">
              Managed properties
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTenants}</div>
            <p className="text-xs text-muted-foreground">
              Current tenants
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rent Due (30 days)</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingRentDue}</div>
            <p className="text-xs text-muted-foreground">
              Upcoming payments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Rent Notices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Upcoming Rent Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingTenants.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No upcoming rent due dates</p>
              ) : (
                upcomingTenants.map((tenant) => (
                  <div key={tenant.tenant_id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{tenant.full_name}</p>
                      <p className="text-sm text-gray-500">{tenant.unit_number} - {tenant.property_name}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={getPaymentStatusColor(tenant.payment_status)}>
                        {tenant.days_until_due} days
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        Due: {new Date(tenant.rent_due_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <a 
                href="/dashboard/documents"
                className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium">Manage Documents</p>
                    <p className="text-sm text-gray-500">Upload, view, and organize legal documents</p>
                  </div>
                </div>
              </a>
              
              <a 
                href="/dashboard/properties"
                className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">Property Management</p>
                    <p className="text-sm text-gray-500">Manage all properties, tenants and rent notifications</p>
                  </div>
                </div>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}