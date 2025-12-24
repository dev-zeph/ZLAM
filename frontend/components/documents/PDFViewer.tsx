'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import dynamic from 'next/dynamic'

interface PDFViewerProps {
  isOpen: boolean
  onClose: () => void
  fileUrl: string
  fileName: string
}

// Dynamically import the PDF content to avoid SSR issues
const PDFContent = dynamic(() => import('./PDFViewerContent'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
        <p>Loading PDF Viewer...</p>
      </div>
    </div>
  )
})

export function PDFViewer({ isOpen, onClose, fileUrl, fileName }: PDFViewerProps) {
  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = fileUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold truncate">
              {fileName}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
              >
                Download
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          <PDFContent fileUrl={fileUrl} fileName={fileName} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default PDFViewer