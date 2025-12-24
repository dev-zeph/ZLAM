export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      properties: {
        Row: {
          id: string
          name: string
          address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string | null
          created_at?: string
        }
      }
      units: {
        Row: {
          id: string
          property_id: string | null
          unit_number: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          property_id?: string | null
          unit_number: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          property_id?: string | null
          unit_number?: string
          status?: string
          created_at?: string
        }
      }
      tenants: {
        Row: {
          id: string
          unit_id: string | null
          property_id: string | null
          full_name: string
          email: string
          phone_number: string | null
          rent_due_date: string
          yearly_rent_amount: number | null
          reminder_status: string
          created_at: string
        }
        Insert: {
          id?: string
          unit_id?: string | null
          property_id?: string | null
          full_name: string
          email: string
          phone_number?: string | null
          rent_due_date: string
          yearly_rent_amount?: number | null
          reminder_status?: string
          created_at?: string
        }
        Update: {
          id?: string
          unit_id?: string | null
          property_id?: string | null
          full_name?: string
          email?: string
          phone_number?: string | null
          rent_due_date?: string
          yearly_rent_amount?: number | null
          reminder_status?: string
          created_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          file_name: string
          file_url: string
          category: string
          unit_id: string | null
          ai_summary: string | null
          uploaded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          file_name: string
          file_url: string
          category?: string
          unit_id?: string | null
          ai_summary?: string | null
          uploaded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          file_name?: string
          file_url?: string
          category?: string
          unit_id?: string | null
          ai_summary?: string | null
          uploaded_by?: string | null
          created_at?: string
        }
      }
      notification_logs: {
        Row: {
          id: string
          tenant_id: string | null
          sent_at: string
          notice_type: string | null
          status: string | null
        }
        Insert: {
          id?: string
          tenant_id?: string | null
          sent_at?: string
          notice_type?: string | null
          status?: string | null
        }
        Update: {
          id?: string
          tenant_id?: string | null
          sent_at?: string
          notice_type?: string | null
          status?: string | null
        }
      }
    }
    Views: {
      tenant_units_view: {
        Row: {
          tenant_id: string
          full_name: string
          email: string
          phone_number: string | null
          rent_due_date: string
          reminder_status: string
          unit_id: string
          unit_number: string
          unit_status: string
          property_id: string
          property_name: string
          property_address: string | null
          days_until_due: number
          payment_status: string
        }
      }
      property_tenants_view: {
        Row: {
          tenant_id: string
          full_name: string
          email: string
          phone_number: string | null
          rent_due_date: string
          yearly_rent_amount: number | null
          reminder_status: string
          property_id: string
          property_name: string
          property_address: string | null
          unit_number: string | null
          days_until_due: number
          payment_status: string
        }
      }
      documents_view: {
        Row: {
          id: string
          file_name: string
          file_url: string
          category: string
          unit_id: string | null
          ai_summary: string | null
          uploaded_by: string | null
          created_at: string
          unit_number: string | null
          property_name: string | null
          file_extension: string
          summary_length: string
        }
      }
    }
    Functions: {
      get_tenants_needing_reminders: {
        Args: Record<PropertyKey, never>
        Returns: {
          tenant_id: string
          full_name: string
          email: string
          phone_number: string | null
          unit_number: string
          property_name: string
          property_address: string | null
          rent_due_date: string
          days_until_due: number
          notice_type: string | null
        }[]
      }
      log_notification: {
        Args: {
          p_tenant_id: string
          p_notice_type: string
          p_status?: string
        }
        Returns: string
      }
      update_document_summary: {
        Args: {
          p_document_id: string
          p_summary: string
        }
        Returns: boolean
      }
    }
  }
}

// Helper types for common use cases
export type Property = Database['public']['Tables']['properties']['Row']
export type Unit = Database['public']['Tables']['units']['Row']
export type Tenant = Database['public']['Tables']['tenants']['Row']
export type Document = Database['public']['Tables']['documents']['Row']
export type NotificationLog = Database['public']['Tables']['notification_logs']['Row']

export type TenantUnitView = Database['public']['Views']['tenant_units_view']['Row']
export type PropertyTenantsView = Database['public']['Views']['property_tenants_view']['Row']
export type DocumentView = Database['public']['Views']['documents_view']['Row']

export type PropertyInsert = Database['public']['Tables']['properties']['Insert']
export type UnitInsert = Database['public']['Tables']['units']['Insert']
export type TenantInsert = Database['public']['Tables']['tenants']['Insert']
export type DocumentInsert = Database['public']['Tables']['documents']['Insert']

export type PropertyUpdate = Database['public']['Tables']['properties']['Update']
export type UnitUpdate = Database['public']['Tables']['units']['Update']
export type TenantUpdate = Database['public']['Tables']['tenants']['Update']
export type DocumentUpdate = Database['public']['Tables']['documents']['Update']