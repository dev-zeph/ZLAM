import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// You would install and import your email service here
// For example: import { Resend } from 'resend'
// const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { tenantId, noticeType } = await request.json()

    if (!tenantId || !noticeType) {
      return NextResponse.json(
        { error: 'Tenant ID and notice type are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get tenant information
    const { data: tenant, error: tenantError } = await supabase
      .from('tenant_units_view')
      .select('*')
      .eq('tenant_id', tenantId)
      .single()

    if (tenantError || !tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      )
    }

    // Generate email content based on notice type
    const emailContent = generateEmailContent(tenant, noticeType)

    // TODO: Send email using your preferred service (Resend, Postmark, etc.)
    console.log('Email to be sent:', {
      to: tenant.email,
      subject: emailContent.subject,
      html: emailContent.html
    })

    // For now, we'll just simulate sending the email
    const emailSent = true // Replace with actual email sending logic

    if (emailSent) {
      // Log the notification
      const { error: logError } = await supabase
        .rpc('log_notification', {
          p_tenant_id: tenantId,
          p_notice_type: noticeType,
          p_status: 'sent'
        })

      if (logError) {
        console.error('Error logging notification:', logError)
      }

      return NextResponse.json({
        success: true,
        message: 'Rent notice sent successfully'
      })
    } else {
      // Log failed notification
      await supabase
        .rpc('log_notification', {
          p_tenant_id: tenantId,
          p_notice_type: noticeType,
          p_status: 'failed'
        })

      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in send-rent-notice API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function generateEmailContent(tenant: any, noticeType: string) {
  const firmName = process.env.FIRM_NAME || 'AN. Zeph and Associates'
  const firmEmail = process.env.FIRM_EMAIL || 'admin@anzeph.com'
  
  const daysText = noticeType === '30_day_reminder' ? '30 days' 
                 : noticeType === '7_day_urgent' ? '7 days' 
                 : '1 day'

  const subject = `OFFICIAL NOTICE: Rent Renewal for ${tenant.unit_number} - ${tenant.property_name}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #f8f9fa; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .notice-box { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
        .urgent { background: #f8d7da; border-color: #f5c6cb; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${firmName}</h1>
        <p>Legal and Property Management Services</p>
      </div>
      
      <div class="content">
        <p>Dear ${tenant.full_name},</p>
        
        <div class="notice-box ${noticeType === '7_day_urgent' || noticeType === '1_day_final' ? 'urgent' : ''}">
          <h2>RENT RENEWAL NOTICE</h2>
          <p><strong>Property:</strong> ${tenant.property_name}</p>
          <p><strong>Unit:</strong> ${tenant.unit_number}</p>
          <p><strong>Tenant:</strong> ${tenant.full_name}</p>
          <p><strong>Rent Due Date:</strong> ${new Date(tenant.rent_due_date).toLocaleDateString()}</p>
          <p><strong>Days Remaining:</strong> ${daysText}</p>
        </div>
        
        <p>This is an official notice that your rent payment is due in ${daysText}. Please ensure your payment is made on or before the due date to avoid any late fees or complications.</p>
        
        ${noticeType === '7_day_urgent' ? 
          '<p><strong>URGENT:</strong> This is a final reminder. Please contact our office immediately if you have any concerns about your payment.</p>' : 
          noticeType === '1_day_final' ?
          '<p><strong>FINAL NOTICE:</strong> Your rent is due tomorrow. Immediate action is required to avoid late fees.</p>' :
          '<p>We appreciate your continued tenancy and prompt payment.</p>'
        }
        
        <p>If you have any questions or concerns, please do not hesitate to contact our office.</p>
        
        <p>Best regards,<br>
        ${firmName}<br>
        Property Management Department</p>
      </div>
      
      <div class="footer">
        <p>This is an automated message from ${firmName}</p>
        <p>Email: ${firmEmail}</p>
        <p>This notice is sent in accordance with your tenancy agreement.</p>
      </div>
    </body>
    </html>
  `

  return { subject, html }
}