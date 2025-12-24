'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

interface PDFViewerContentProps {
  fileUrl: string
  fileName: string
}

export default function PDFViewerContent({ fileUrl, fileName }: PDFViewerContentProps) {
  const [useIframe, setUseIframe] = useState(true)
  const [loading, setLoading] = useState(true)
  const [authenticatedUrl, setAuthenticatedUrl] = useState<string>('')
  const supabase = createClient()

  useEffect(() => {
    const getAuthenticatedUrl = async () => {
      try {
        console.log('Original file URL:', fileUrl)
        
        // Extract the file path from the URL
        const urlParts = fileUrl.split('/')
        const bucketIndex = urlParts.findIndex(part => part === 'documents')
        const filePath = urlParts.slice(bucketIndex + 1).join('/')
        
        console.log('Extracted file path:', filePath)
        
        // Get signed URL for private access
        const { data, error } = await supabase.storage
          .from('documents')
          .createSignedUrl(filePath, 3600) // 1 hour expiry
        
        if (error) {
          console.error('Error creating signed URL:', error)
          // Fallback to original URL
          setAuthenticatedUrl(fileUrl)
        } else {
          console.log('Created signed URL:', data.signedUrl)
          setAuthenticatedUrl(data.signedUrl)
        }
      } catch (error) {
        console.error('Error in getAuthenticatedUrl:', error)
        setAuthenticatedUrl(fileUrl)
      }
    }

    if (fileUrl) {
      getAuthenticatedUrl()
    }
  }, [fileUrl, supabase])

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = authenticatedUrl || fileUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleIframeLoad = () => {
    console.log('PDF iframe loaded successfully')
    setLoading(false)
  }

  const handleIframeError = () => {
    console.error('Failed to load PDF in iframe')
    setUseIframe(false)
    setLoading(false)
  }

  if (!authenticatedUrl && loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p>Preparing PDF...</p>
        </div>
      </div>
    )
  }

  if (!useIframe) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-center max-w-md">
          <h3 className="text-lg font-semibold mb-2">PDF Preview Not Available</h3>
          <p className="text-gray-600 mb-4">
            This PDF cannot be previewed in the browser. This might be due to:
          </p>
          <ul className="text-sm text-gray-600 mb-6 text-left">
            <li>• Browser compatibility issues</li>
            <li>• PDF security settings</li>
            <li>• File format restrictions</li>
          </ul>
          <div className="flex gap-2">
            <Button onClick={handleDownload}>
              Download PDF
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.open(authenticatedUrl || fileUrl, '_blank')}
            >
              Open in New Tab
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p>Loading PDF...</p>
          </div>
        </div>
      )}
      
      <iframe
        src={`${authenticatedUrl || fileUrl}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
        className="w-full h-full border-0"
        title={fileName}
        onLoad={handleIframeLoad}
        onError={handleIframeError}
      />
      
      {/* Fallback controls */}
      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur rounded p-2 shadow-lg">
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => window.open(authenticatedUrl || fileUrl, '_blank')}
          >
            Open in Tab
          </Button>
          <Button size="sm" onClick={handleDownload}>
            Download
          </Button>
        </div>
      </div>
    </div>
  )
}