import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Verify that this request is coming from a trusted source (cron job)
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET
    
    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // Get tenants who need reminders
    const { data: tenantsNeedingReminders, error } = await supabase
      .rpc('get_tenants_needing_reminders')

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    if (!tenantsNeedingReminders || tenantsNeedingReminders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No rent reminders needed today',
        count: 0
      })
    }

    const results = []

    // Send reminder for each tenant
    for (const tenant of tenantsNeedingReminders) {
      try {
        // Call the send-rent-notice API
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-rent-notice`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tenantId: tenant.tenant_id,
            noticeType: tenant.notice_type
          })
        })

        const result = await response.json()
        
        results.push({
          tenant: tenant.full_name,
          unit: tenant.unit_number,
          noticeType: tenant.notice_type,
          success: response.ok,
          message: result.message || result.error
        })

        // Small delay to avoid overwhelming the email service
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (error) {
        console.error(`Error sending reminder to ${tenant.full_name}:`, error)
        results.push({
          tenant: tenant.full_name,
          unit: tenant.unit_number,
          noticeType: tenant.notice_type,
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} rent reminders`,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failureCount
      },
      details: results
    })

  } catch (error) {
    console.error('Error in check-rent-reminders cron job:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint for manual testing
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  
  try {
    // Get tenants who need reminders for testing
    const { data: tenantsNeedingReminders, error } = await supabase
      .rpc('get_tenants_needing_reminders')

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Rent reminder check (test mode)',
      tenantsNeedingReminders: tenantsNeedingReminders || []
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Error checking rent reminders' },
      { status: 500 }
    )
  }
}