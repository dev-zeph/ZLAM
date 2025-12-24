import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface ChatRequest {
  message: string
  document: {
    id: string
    file_name: string
    category: string
    ai_summary?: string
  }
  conversationHistory: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()
    const { message, document, conversationHistory = [] } = body

    // Validate OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    // Get document content from Supabase storage
    const supabase = await createClient()
    let documentContent = ''

    try {
      // Get document details first to extract file path
      const { data: docData, error: docError } = await supabase
        .from('documents_view')
        .select('file_url, file_name, ai_summary')
        .eq('id', document.id)
        .single()

      if (docError) {
        console.warn('Could not fetch document details:', docError)
        throw docError
      }

      console.log('Document data retrieved:', {
        fileName: docData.file_name,
        hasSummary: !!docData.ai_summary,
        summaryLength: docData.ai_summary?.length || 0,
        summaryPreview: docData.ai_summary?.substring(0, 100) + '...' || 'No summary'
      })

      // DEBUG: Log the full analysis content
      if (docData.ai_summary && docData.ai_summary.length > 0) {
        console.log('=== DEBUG: Full AI Summary Content ===')
        console.log(docData.ai_summary)
        console.log('=== END DEBUG ===')
      }

      // Extract file path from the URL
      // URL format: https://xxx.supabase.co/storage/v1/object/public/documents/category/filename
      const urlParts = docData.file_url.split('/')
      const bucketIndex = urlParts.findIndex((part: string) => part === 'documents')
      
      if (bucketIndex === -1) {
        throw new Error('Invalid document URL format')
      }
      
      const filePath = urlParts.slice(bucketIndex + 1).join('/')
      console.log('Extracted file path:', filePath)

      // Check if it's a PDF file
      const isPdf = document.file_name.toLowerCase().endsWith('.pdf')
      
      if (isPdf) {
        console.log('Processing PDF file for AI chat...')
        
        // Check if we have an existing AI summary to work with
        if (docData.ai_summary && docData.ai_summary.trim().length > 0) {
          console.log('Using existing AI summary as document context, length:', docData.ai_summary.length)
          documentContent = `Document: ${document.file_name} (Category: ${document.category})

COMPREHENSIVE DOCUMENT ANALYSIS:
${docData.ai_summary}

Based on this detailed analysis, I can answer specific questions about:
- Names and parties involved
- Key dates and deadlines  
- Financial terms and amounts
- Important clauses and provisions
- Document purpose and content
- Obligations and requirements

Ask me anything about this document!`
        } else {
          console.log('No AI summary available - document needs analysis first')
          documentContent = `Document: ${document.file_name} (Category: ${document.category})

STATUS: This document has not been analyzed yet.

To enable detailed Q&A about the document content, please:
1. Use the "Analyze Document" button in the chat interface
2. Once analyzed, I'll be able to answer specific questions about names, dates, clauses, financial terms, and other document details

I can currently help with:
- General questions about ${document.category} document types
- Legal concepts and terminology
- Guidance on what to look for in documents

Would you like me to analyze the document first, or do you have general questions I can help with?`
        }
      } else {
        // For non-PDF files, use existing summary or metadata
        if (docData.ai_summary) {
          documentContent = `Document Summary: ${docData.ai_summary}`
        } else {
          documentContent = `Document: ${document.file_name} (Category: ${document.category})`
        }
      }
      
    } catch (error) {
      console.warn('Could not extract document content, using fallback:', error)
      // Fallback to existing summary if available, or basic metadata
      if (document.ai_summary) {
        documentContent = `Document Summary: ${document.ai_summary}`
      } else {
        documentContent = `Document: ${document.file_name} (Category: ${document.category})`
      }
    }

    // Build conversation context
    const systemPrompt = `You are an AI assistant specializing in legal document analysis. You're helping a user understand and analyze the document "${document.file_name}" (Category: ${document.category}).

DOCUMENT ANALYSIS CONTENT:
${documentContent}

CRITICAL INSTRUCTIONS:
- You MUST reference and use the specific information from the DOCUMENT ANALYSIS CONTENT above
- When the user asks about "who is involved", extract the actual names and parties from the analysis content
- When asked about dates, amounts, clauses, or any specific details, provide the EXACT information from the analysis
- Do NOT give generic or template responses - use the actual document content provided above
- If the analysis contains specific names, dates, amounts, or details, cite them directly in your response

Your role is to:
1. Extract and present specific information from the document analysis provided above
2. Answer questions using ONLY the actual content and details from the analysis
3. Identify and cite specific names, dates, parties, amounts, and clauses from the analysis
4. Explain specific terms and provisions found in this particular document
5. Provide insights based on the actual content of this specific document

Response Guidelines:
- Always reference the specific content from the analysis above
- If asked "who is involved", list the actual names and parties from the analysis
- If asked about amounts or dates, provide the specific figures from the analysis  
- If asked about clauses, quote or summarize the actual provisions from the analysis
- If the analysis doesn't contain certain information, state that clearly
- Include legal disclaimers that this is for informational purposes only

Remember: You have access to a comprehensive analysis of this specific document. Use the ACTUAL content and details from that analysis, not generic responses.`

    // Prepare messages for OpenAI
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: message }
    ]

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      max_tokens: 1000,
      temperature: 0.3,
    })

    const aiResponse = completion.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response. Please try again.'

    return NextResponse.json({ 
      message: aiResponse,
      documentId: document.id 
    })

  } catch (error) {
    console.error('Error in AI document chat:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process chat message',
        message: 'I apologize, but I encountered an error processing your message. Please try again.'
      },
      { status: 500 }
    )
  }
}