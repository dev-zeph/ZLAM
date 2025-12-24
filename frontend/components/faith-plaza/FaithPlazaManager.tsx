'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Building2, 
  Users, 
  Plus, 
  Edit, 
  Mail,
  Calendar,
  Phone,
  MapPin,
  AlertCircle
} from 'lucide-react'
import type { TenantUnitView, TenantInsert, TenantUpdate } from '@/lib/types/database'

export default function FaithPlazaManager() {
  const [tenants, setTenants] = useState<TenantUnitView[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTenant, setSelectedTenant] = useState<TenantUnitView | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    fetchTenants()
  }, [])

  const fetchTenants = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('tenant_units_view')
        .select('*')
        .order('days_until_due', { ascending: true })

      if (error) throw error
      setTenants(data || [])
    } catch (error) {
      console.error('Error fetching tenants:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTenantUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    
    if (!selectedTenant) return

    const formData = new FormData(event.currentTarget)
    const updateData: TenantUpdate = {
      full_name: formData.get('full_name') as string,
      email: formData.get('email') as string,
      phone_number: formData.get('phone_number') as string,
      rent_due_date: formData.get('rent_due_date') as string,
      reminder_status: formData.get('reminder_status') as string,
    }

    try {
      const { error } = await supabase
        .from('tenants')
        .update(updateData)
        .eq('id', selectedTenant.tenant_id)

      if (error) throw error

      alert('Tenant information updated successfully!')
      setEditDialogOpen(false)
      fetchTenants()
    } catch (error) {
      console.error('Error updating tenant:', error)
      alert('Error updating tenant information')
    }
  }

  const handleSendReminder = async (tenant: TenantUnitView) => {
    try {
      const response = await fetch('/api/send-rent-notice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: tenant.tenant_id,
          noticeType: 'manual_reminder'
        })
      })

      const result = await response.json()

      if (response.ok) {
        alert(`Rent reminder sent successfully to ${tenant.email}!`)
      } else {
        throw new Error(result.error || 'Failed to send reminder')
      }
    } catch (error) {
      console.error('Error sending reminder:', error)
      alert(`Error sending reminder: ${error instanceof Error ? error.message : 'Unknown error'}`)
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

  const getPaymentStatusText = (status: string, daysUntilDue: number) => {
    if (daysUntilDue < 0) return 'Overdue'
    if (daysUntilDue <= 7) return 'Urgent'
    if (daysUntilDue <= 30) return 'Due Soon'
    return 'Normal'
  }

  const stats = {
    totalTenants: tenants.length,
    overduePayments: tenants.filter(t => t.days_until_due < 0).length,
    upcomingPayments: tenants.filter(t => t.days_until_due >= 0 && t.days_until_due <= 30).length,
    activeUnits: tenants.filter(t => t.unit_status === 'occupied').length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Faith Plaza Management</h1>
          <p className="text-gray-500">Property management and tenant communications</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTenants}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Units</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUnits}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Payments</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overduePayments}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due in 30 Days</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingPayments}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tenants Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tenants & Rent Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading tenants...</div>
          ) : tenants.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No tenants found in the system.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Rent Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant) => (
                  <TableRow key={tenant.tenant_id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium">{tenant.full_name}</p>
                          <p className="text-sm text-gray-500">{tenant.property_name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{tenant.unit_number}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3" />
                          {tenant.email}
                        </div>
                        {tenant.phone_number && (
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Phone className="h-3 w-3" />
                            {tenant.phone_number}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {new Date(tenant.rent_due_date).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-500">
                          {tenant.days_until_due >= 0 
                            ? `${tenant.days_until_due} days left`
                            : `${Math.abs(tenant.days_until_due)} days overdue`
                          }
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPaymentStatusColor(tenant.payment_status)}>
                        {getPaymentStatusText(tenant.payment_status, tenant.days_until_due)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedTenant(tenant)
                            setSheetOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendReminder(tenant)}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Tenant Details Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {selectedTenant?.full_name} - {selectedTenant?.unit_number}
            </SheetTitle>
          </SheetHeader>
          
          {selectedTenant && (
            <div className="mt-6 space-y-6">
              {/* Tenant Info */}
              <div className="space-y-4">
                <h3 className="font-semibold">Tenant Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    {selectedTenant.email}
                  </div>
                  {selectedTenant.phone_number && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      {selectedTenant.phone_number}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    {selectedTenant.property_address}
                  </div>
                </div>
              </div>

              {/* Payment Status */}
              <div className="space-y-4">
                <h3 className="font-semibold">Payment Status</h3>
                <div className="p-4 border rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Next Rent Due</span>
                    <Badge variant={getPaymentStatusColor(selectedTenant.payment_status)}>
                      {getPaymentStatusText(selectedTenant.payment_status, selectedTenant.days_until_due)}
                    </Badge>
                  </div>
                  <p className="font-semibold">{new Date(selectedTenant.rent_due_date).toLocaleDateString()}</p>
                  <p className="text-sm text-gray-500">
                    {selectedTenant.days_until_due >= 0 
                      ? `${selectedTenant.days_until_due} days remaining`
                      : `${Math.abs(selectedTenant.days_until_due)} days overdue`
                    }
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <Button 
                  className="w-full" 
                  onClick={() => setEditDialogOpen(true)}
                >
                  Edit Tenant Information
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => handleSendReminder(selectedTenant)}
                >
                  Send Rent Reminder
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tenant Information</DialogTitle>
          </DialogHeader>
          
          {selectedTenant && (
            <form onSubmit={handleTenantUpdate} className="space-y-4">
              <div>
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  defaultValue={selectedTenant.full_name}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={selectedTenant.email}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="phone_number">Phone Number</Label>
                <Input
                  id="phone_number"
                  name="phone_number"
                  type="tel"
                  defaultValue={selectedTenant.phone_number || ''}
                />
              </div>
              
              <div>
                <Label htmlFor="rent_due_date">Rent Due Date</Label>
                <Input
                  id="rent_due_date"
                  name="rent_due_date"
                  type="date"
                  defaultValue={selectedTenant.rent_due_date}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="reminder_status">Reminder Status</Label>
                <select
                  id="reminder_status"
                  name="reminder_status"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  defaultValue={selectedTenant.reminder_status}
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                </select>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  Update Tenant
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}