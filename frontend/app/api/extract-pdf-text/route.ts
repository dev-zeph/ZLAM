import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface ExtractTextRequest {
  document: {
    id: string
    file_name: string
    file_url: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ExtractTextRequest = await request.json()
    const { document } = body

    // Get document content from Supabase storage
    const supabase = await createClient()
    let extractedText = ''

    try {
      // Extract file path from the URL
      // URL format: https://xxx.supabase.co/storage/v1/object/public/documents/category/filename
      const urlParts = document.file_url.split('/')
      const bucketIndex = urlParts.findIndex((part: string) => part === 'documents')
      
      if (bucketIndex === -1) {
        console.error('Invalid URL format:', document.file_url)
        throw new Error('Invalid document URL format - cannot find documents bucket path')
      }
      
      const filePath = urlParts.slice(bucketIndex + 1).join('/')
      console.log('Extracting text from PDF at path:', filePath)
      console.log('Full URL:', document.file_url)

      // First, let's try to verify the file exists using the public URL
      try {
        const publicResponse = await fetch(document.file_url)
        if (!publicResponse.ok) {
          throw new Error(`Public URL not accessible: ${publicResponse.status} ${publicResponse.statusText}`)
        }
        console.log('Public URL is accessible')
      } catch (urlError) {
        console.error('Public URL access failed:', urlError)
      }

      // Try to download the file using Supabase storage API
      const { data: fileData, error: fileError } = await supabase.storage
        .from('documents')
        .download(filePath)

      if (fileError) {
        console.error('Supabase storage error:', fileError)
        
        // If direct download fails, try to access via public URL
        try {
          const response = await fetch(document.file_url)
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
          
          const fileSize = response.headers.get('content-length') || 'unknown'
          console.log(`Successfully accessed PDF via public URL, size: ${fileSize} bytes`)
          
          extractedText = `PDF file "${document.file_name}" successfully accessed via public URL.

File size: ${fileSize === 'unknown' ? 'Unknown' : Math.round(parseInt(fileSize) / 1024)} KB

The PDF is accessible and ready for viewing. To extract text content for analysis:

1. Open the PDF in the viewer panel
2. Select and copy the text you want to analyze
3. Paste it in the "PDF Content Analysis" text area
4. Click "Analyze PDF Content"

For comprehensive analysis, copy sections containing:
• Names of all parties (landlords, tenants, witnesses)
• Key dates (lease start/end, notice periods, deadlines)  
• Financial terms (rent amounts, deposits, fees)
• Important clauses and conditions
• Contact information and addresses

This manual method ensures the AI gets accurate, complete information for detailed document analysis.`

        } catch (fetchError) {
          throw new Error(`Cannot access file via storage API or public URL. Storage error: ${fileError.message}, URL error: ${fetchError}`)
        }
      } else if (fileData) {
        // Successfully downloaded via Supabase storage
        const fileSize = fileData.size
        console.log(`PDF file downloaded successfully, size: ${fileSize} bytes`)
        
        // Check if it's a PDF file
        const isPdf = document.file_name.toLowerCase().endsWith('.pdf')
        
        if (isPdf) {
          extractedText = `PDF file "${document.file_name}" successfully downloaded from storage.

File size: ${Math.round(fileSize / 1024)} KB

The PDF is ready for viewing and text extraction. To analyze the document content:

1. View the PDF in the panel on the right
2. Select and copy relevant text sections
3. Paste into the analysis text area
4. Click "Analyze PDF Content" for detailed AI analysis

Focus on copying sections with:
• Party names and contact information
• Important dates and deadlines
• Financial terms and amounts
• Key clauses and conditions
• Obligations and responsibilities

Manual text selection ensures the most accurate analysis results.`

        } else if (document.file_name.toLowerCase().endsWith('.txt') || 
                   document.file_name.toLowerCase().endsWith('.md')) {
          // For text files, extract the content directly
          extractedText = await fileData.text()
          console.log('Successfully extracted text content, length:', extractedText.length)
        } else {
          extractedText = `File "${document.file_name}" downloaded successfully but text extraction is not supported for this file type.

Supported formats for automatic text extraction:
- .txt files  
- .md files

For PDF files, please use the manual copy-paste method for best results.`
        }
      }

    } catch (error) {
      console.error('Error accessing file:', error)
      extractedText = `Could not access file "${document.file_name}" from storage.

Error details: ${error instanceof Error ? error.message : 'Unknown error'}

Troubleshooting steps:
1. Verify the file exists in Supabase storage
2. Check storage bucket permissions
3. Ensure the file URL is correct: ${document.file_url}
4. Try refreshing the page

Alternative: Use manual text extraction by copying content directly from the PDF viewer and pasting it into the analysis text area.`
    }

    return NextResponse.json({ 
      text: extractedText,
      success: true
    })

  } catch (error) {
    console.error('Error in extract PDF text API:', error)
    return NextResponse.json(
      { 
        error: 'Failed to extract PDF text',
        text: 'An unexpected error occurred while trying to extract text from the PDF. Please try the manual copy-paste method.',
        success: false
      },
      { status: 500 }
    )
  }
}