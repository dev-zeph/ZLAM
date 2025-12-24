'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
  AlertCircle,
  DollarSign,
  ArrowLeft
} from 'lucide-react'
import type { Property, PropertyTenantsView, TenantUpdate } from '@/lib/types/database'

export default function PropertyManager() {
  const [properties, setProperties] = useState<Property[]>([])
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [propertyTenants, setPropertyTenants] = useState<PropertyTenantsView[]>([])
  const [selectedTenant, setSelectedTenant] = useState<PropertyTenantsView | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<'staff' | 'client'>('staff') // Default to staff
  
  // Dialog states
  const [addPropertyDialogOpen, setAddPropertyDialogOpen] = useState(false)
  const [addTenantDialogOpen, setAddTenantDialogOpen] = useState(false)
  const [tenantDetailsSheetOpen, setTenantDetailsSheetOpen] = useState(false)
  
  const supabase = createClient()

  // Check user role on component mount
  useEffect(() => {
    checkUserRole()
  }, [])

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        // Simple role determination - you can enhance this logic
        // For now, treating emails with 'client' in them as clients, others as staff
        if (user.email.includes('client') || user.user_metadata?.role === 'client') {
          setUserRole('client')
        } else {
          setUserRole('staff')
        }
        
        // Debug log to see what role is being set
        console.log('User role set to:', user.email.includes('client') || user.user_metadata?.role === 'client' ? 'client' : 'staff')
        console.log('User email:', user.email)
        console.log('User metadata:', user.user_metadata)
      }
    } catch (error) {
      console.error('Error checking user role:', error)
    }
  }

  useEffect(() => {
    fetchProperties()
  }, [])

  useEffect(() => {
    if (selectedProperty) {
      fetchPropertyTenants(selectedProperty.id)
    }
  }, [selectedProperty])

  const fetchProperties = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('name')

      if (error) throw error
      setProperties(data || [])
    } catch (error) {
      console.error('Error fetching properties:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPropertyTenants = async (propertyId: string) => {
    try {
      console.log('Fetching tenants for property:', propertyId)
      
      // For now, use tenant_units_view until property_tenants_view is created
      const { data, error } = await supabase
        .from('tenant_units_view')
        .select('*')
        .eq('property_id', propertyId)
        .order('days_until_due', { ascending: true })

      console.log('Fetched tenants data:', data)
      console.log('Query error:', error)

      if (error) throw error
      setPropertyTenants(data || [])
    } catch (error) {
      console.error('Error fetching property tenants:', error)
      setPropertyTenants([])
    }
  }

  const handleAddProperty = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    
    const formData = new FormData(event.currentTarget)
    const newProperty = {
      name: formData.get('property_name') as string,
      address: formData.get('address') as string,
    }

    try {
      const { error } = await supabase
        .from('properties')
        .insert([newProperty])

      if (error) throw error

      alert('Property added successfully!')
      setAddPropertyDialogOpen(false)
      fetchProperties()
      
      // Reset form
      ;(event.target as HTMLFormElement).reset()
    } catch (error) {
      console.error('Error adding property:', error)
      alert('Error adding property')
    }
  }

  const handleAddTenant = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    
    if (!selectedProperty) return

    const formData = new FormData(event.currentTarget)
    
    try {
      // First check if there are any units for this property, or create a default one
      const { data: existingUnits, error: unitsError } = await supabase
        .from('units')
        .select('*')
        .eq('property_id', selectedProperty.id)
        .limit(1)

      let unitId: string

      if (existingUnits && existingUnits.length > 0) {
        // Use existing unit
        unitId = existingUnits[0].id
        console.log('Using existing unit:', unitId)
      } else {
        // Create a default unit for this tenant
        const { data: newUnit, error: unitCreateError } = await supabase
          .from('units')
          .insert([{
            property_id: selectedProperty.id,
            unit_number: `Unit-${Date.now()}`, // Temporary unit number
            status: 'occupied'
          }])
          .select()

        if (unitCreateError) throw unitCreateError
        
        unitId = newUnit[0].id
        console.log('Created new unit:', unitId)
      }

      // Now create the tenant with current database structure
      const newTenant: any = {
        unit_id: unitId,
        full_name: formData.get('full_name') as string,
        email: formData.get('email') as string,
        phone_number: formData.get('phone_number') as string || null,
        rent_due_date: formData.get('rent_due_date') as string,
        reminder_status: 'active',
      }

      // Only include yearly_rent_amount if user is staff (field exists in form)
      if (userRole === 'staff') {
        newTenant.yearly_rent_amount = parseFloat(formData.get('yearly_rent_amount') as string) || null
      }

      console.log('Attempting to add tenant:', newTenant)
      console.log('Selected property:', selectedProperty)

      const { data, error } = await supabase
        .from('tenants')
        .insert([newTenant])
        .select()

      if (error) {
        console.error('Database error:', error)
        throw error
      }

      console.log('Tenant added successfully:', data)
      alert('Tenant added successfully!')
      setAddTenantDialogOpen(false)
      fetchPropertyTenants(selectedProperty.id)
      
      // Reset form
      ;(event.target as HTMLFormElement).reset()
    } catch (error) {
      console.error('Error adding tenant:', error)
      
      // Show more detailed error information
      if (error instanceof Error) {
        alert(`Error adding tenant: ${error.message}`)
      } else {
        alert('Error adding tenant. Please check the console for details.')
      }
    }
  }

  const handleUpdateTenant = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    
    if (!selectedTenant) return

    const formData = new FormData(event.currentTarget)
    const updateData: TenantUpdate = {
      full_name: formData.get('full_name') as string,
      email: formData.get('email') as string,
      phone_number: formData.get('phone_number') as string || null,
      rent_due_date: formData.get('rent_due_date') as string,
      reminder_status: formData.get('reminder_status') as string,
    }

    // Only include yearly_rent_amount if user is staff (field exists in form)
    if (userRole === 'staff') {
      updateData.yearly_rent_amount = parseFloat(formData.get('yearly_rent_amount') as string) || null
    }

    try {
      const { error } = await supabase
        .from('tenants')
        .update(updateData)
        .eq('id', selectedTenant.tenant_id)

      if (error) throw error

      alert('Tenant updated successfully!')
      setTenantDetailsSheetOpen(false)
      if (selectedProperty) {
        fetchPropertyTenants(selectedProperty.id)
      }
    } catch (error) {
      console.error('Error updating tenant:', error)
      alert('Error updating tenant')
    }
  }

  const handleSendReminder = async (tenant: PropertyTenantsView) => {
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

  if (selectedProperty) {
    // Property Detail View - showing tenants for selected property
    const stats = {
      totalTenants: propertyTenants.length,
      overduePayments: propertyTenants.filter(t => t.days_until_due < 0).length,
      upcomingPayments: propertyTenants.filter(t => t.days_until_due >= 0 && t.days_until_due <= 30).length,
      totalRentAmount: propertyTenants.reduce((sum, t) => sum + (t.yearly_rent_amount || 0), 0)
    }

    return (
      <div className="space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => setSelectedProperty(null)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Properties
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{selectedProperty.name}</h1>
              <p className="text-gray-500">{selectedProperty.address}</p>
            </div>
          </div>
          
          <Button 
            onClick={() => setAddTenantDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Tenant
          </Button>
        </div>

        {/* Property Stats */}
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

          {/* Only show Annual Rent for staff users */}
          {userRole === 'staff' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Annual Rent</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₦{stats.totalRentAmount.toLocaleString()}</div>
              </CardContent>
            </Card>
          )}

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
            <CardTitle>Tenants ({propertyTenants.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {propertyTenants.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No tenants found for this property. Add your first tenant to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Contact</TableHead>
                    {/* Only show Annual Rent column for staff users */}
                    {userRole === 'staff' && <TableHead>Annual Rent</TableHead>}
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {propertyTenants.map((tenant) => (
                    <TableRow key={tenant.tenant_id}>
                      <TableCell>
                        <div className="font-medium">{tenant.full_name}</div>
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
                      {/* Only show Annual Rent cell for staff users */}
                      {userRole === 'staff' && (
                        <TableCell>
                          <div className="font-medium">
                            {tenant.yearly_rent_amount ? `₦${tenant.yearly_rent_amount.toLocaleString()}` : 'Not set'}
                          </div>
                        </TableCell>
                      )}
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
                              setTenantDetailsSheetOpen(true)
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

        {/* Add Tenant Dialog */}
        <Dialog open={addTenantDialogOpen} onOpenChange={setAddTenantDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Tenant to {selectedProperty.name}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddTenant} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name*</Label>
                  <Input id="full_name" name="full_name" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email*</Label>
                  <Input id="email" name="email" type="email" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone_number">Phone Number</Label>
                  <Input id="phone_number" name="phone_number" type="tel" />
                </div>

                {/* Only show Annual Rent field for staff users */}
                {userRole === 'staff' && (
                  <div className="space-y-2">
                    <Label htmlFor="yearly_rent_amount">Annual Rent (₦)</Label>
                    <Input 
                      id="yearly_rent_amount" 
                      name="yearly_rent_amount" 
                      type="number" 
                      step="0.01"
                      placeholder="e.g., 1200000"
                    />
                  </div>
                )}

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="rent_due_date">Rent Due Date*</Label>
                  <Input id="rent_due_date" name="rent_due_date" type="date" required />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddTenantDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Add Tenant</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Tenant Details Sheet */}
        <Sheet open={tenantDetailsSheetOpen} onOpenChange={setTenantDetailsSheetOpen}>
          <SheetContent className="w-full max-w-2xl">
            <SheetHeader>
              <SheetTitle>Edit Tenant</SheetTitle>
            </SheetHeader>
            {selectedTenant && (
              <form onSubmit={handleUpdateTenant} className="space-y-6 mt-6">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_full_name">Full Name*</Label>
                    <Input
                      id="edit_full_name"
                      name="full_name"
                      defaultValue={selectedTenant.full_name}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit_email">Email*</Label>
                    <Input
                      id="edit_email"
                      name="email"
                      type="email"
                      defaultValue={selectedTenant.email}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit_phone_number">Phone Number</Label>
                    <Input
                      id="edit_phone_number"
                      name="phone_number"
                      type="tel"
                      defaultValue={selectedTenant.phone_number || ''}
                    />
                  </div>

                  {/* Only show Annual Rent field for staff users */}
                  {userRole === 'staff' && (
                    <div className="space-y-2">
                      <Label htmlFor="edit_yearly_rent_amount">Annual Rent (₦)</Label>
                      <Input
                        id="edit_yearly_rent_amount"
                        name="yearly_rent_amount"
                        type="number"
                        step="0.01"
                        defaultValue={selectedTenant.yearly_rent_amount || ''}
                        placeholder="e.g., 1200000"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="edit_rent_due_date">Rent Due Date*</Label>
                    <Input
                      id="edit_rent_due_date"
                      name="rent_due_date"
                      type="date"
                      defaultValue={selectedTenant.rent_due_date}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit_reminder_status">Reminder Status</Label>
                    <select
                      id="edit_reminder_status"
                      name="reminder_status"
                      defaultValue={selectedTenant.reminder_status}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setTenantDetailsSheetOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Update Tenant</Button>
                </div>
              </form>
            )}
          </SheetContent>
        </Sheet>
      </div>
    )
  }

  // Main Properties View - showing all properties as cards
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Property Management</h1>
          <p className="text-gray-500">Manage all properties and tenants</p>
        </div>
        
        <Button 
          onClick={() => setAddPropertyDialogOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Property
        </Button>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{properties.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Click property to view</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Payments</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">-</div>
            <p className="text-xs text-muted-foreground">Click property to view</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due Soon</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Click property to view</p>
          </CardContent>
        </Card>
      </div>

      {/* Properties Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Properties ({properties.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading properties...</div>
          ) : properties.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No properties found. Add your first property to get started.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {properties.map((property) => (
                <Card 
                  key={property.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedProperty(property)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{property.name}</h3>
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <MapPin className="h-3 w-3" />
                            {property.address}
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Tenants:</span>
                          <Badge variant="outline">Click to view</Badge>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Monthly Rent:</span>
                          <span className="font-medium">Click to view</span>
                        </div>
                      </div>
                      
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedProperty(property)
                        }}
                      >
                        Manage Tenants
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Property Dialog */}
      <Dialog open={addPropertyDialogOpen} onOpenChange={setAddPropertyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Property</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddProperty} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="property_name">Property Name*</Label>
              <Input id="property_name" name="property_name" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address*</Label>
              <Input id="address" name="address" required />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddPropertyDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Add Property</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}