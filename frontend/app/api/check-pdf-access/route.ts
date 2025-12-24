import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface CheckPdfAccessRequest {
  documentId: string
  fileUrl: string
}

export async function POST(request: NextRequest) {
  try {
    const body: CheckPdfAccessRequest = await request.json()
    const { documentId, fileUrl } = body

    const supabase = await createClient()
    
    // Get document details from database
    const { data: docData, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError) {
      return NextResponse.json({
        error: 'Document not found in database',
        details: docError.message,
        success: false
      })
    }

    // Try to access the file via public URL
    let publicUrlCheck = { accessible: false, status: 0, error: '' }
    try {
      const response = await fetch(fileUrl, { method: 'HEAD' })
      publicUrlCheck = {
        accessible: response.ok,
        status: response.status,
        error: response.ok ? '' : `HTTP ${response.status}: ${response.statusText}`
      }
    } catch (error) {
      publicUrlCheck = {
        accessible: false,
        status: 0,
        error: error instanceof Error ? error.message : 'Network error'
      }
    }

    // Try to access via Supabase storage API
    let storageCheck = { accessible: false, error: '' }
    try {
      // Extract file path from URL
      const urlParts = fileUrl.split('/')
      const bucketIndex = urlParts.findIndex((part: string) => part === 'documents')
      
      if (bucketIndex !== -1) {
        const filePath = urlParts.slice(bucketIndex + 1).join('/')
        
        const { data: fileData, error: fileError } = await supabase.storage
          .from('documents')
          .download(filePath)

        storageCheck = {
          accessible: !fileError && !!fileData,
          error: fileError ? fileError.message : ''
        }
      } else {
        storageCheck = {
          accessible: false,
          error: 'Invalid file URL format - cannot extract path'
        }
      }
    } catch (error) {
      storageCheck = {
        accessible: false,
        error: error instanceof Error ? error.message : 'Storage API error'
      }
    }

    // Check if bucket exists and is public
    let bucketInfo = { exists: false, isPublic: false, error: '' }
    try {
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
      
      if (bucketsError) {
        bucketInfo.error = bucketsError.message
      } else {
        const documentsBucket = buckets.find(bucket => bucket.name === 'documents')
        bucketInfo.exists = !!documentsBucket
        bucketInfo.isPublic = documentsBucket?.public || false
      }
    } catch (error) {
      bucketInfo.error = error instanceof Error ? error.message : 'Bucket check error'
    }

    return NextResponse.json({
      success: true,
      document: {
        id: docData.id,
        fileName: docData.file_name,
        fileUrl: docData.file_url,
        category: docData.category
      },
      checks: {
        publicUrl: publicUrlCheck,
        storage: storageCheck,
        bucket: bucketInfo
      },
      recommendations: [
        publicUrlCheck.accessible 
          ? "✅ Public URL is accessible" 
          : `❌ Public URL failed: ${publicUrlCheck.error}`,
        
        storageCheck.accessible 
          ? "✅ Storage API works" 
          : `❌ Storage API failed: ${storageCheck.error}`,
        
        bucketInfo.exists 
          ? `✅ Documents bucket exists (Public: ${bucketInfo.isPublic})` 
          : `❌ Documents bucket issue: ${bucketInfo.error}`,
        
        !bucketInfo.isPublic && bucketInfo.exists 
          ? "⚠️  Bucket may need to be public for iframe access" 
          : ""
      ].filter(Boolean)
    })

  } catch (error) {
    console.error('Error checking PDF access:', error)
    return NextResponse.json(
      { 
        error: 'Failed to check PDF access',
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false
      },
      { status: 500 }
    )
  }
}