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
        console.log('Processing PDF file...')
        
        // For now, let's use a simpler approach
        // Try to use existing AI summary if available, otherwise provide guidance
        if (docData.ai_summary) {
          documentContent = `Document Summary: ${docData.ai_summary}\n\nNote: This is a summary of the PDF content. For more detailed analysis, please share specific excerpts from the document.`
        } else {
          documentContent = `Document: ${document.file_name} (Category: ${document.category})

This is a PDF document. While I can help analyze legal documents, I currently need you to share specific text excerpts from the document for detailed analysis. 

You can help by:
1. Copy and paste specific sections you'd like me to analyze
2. Ask about general legal concepts related to ${document.category} documents
3. Share key details like names, dates, or clauses you'd like me to explain

I'm here to help with legal document analysis once you provide the relevant text!`
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

Available document information:
${documentContent}

Your role is to:
1. Help analyze the document based on available information and user-provided content
2. Provide legal analysis and insights (with appropriate disclaimers)
3. Identify key clauses, dates, parties, and obligations when provided
4. Explain legal terminology and concepts
5. Help with document review and understanding
6. Suggest action items or important considerations
7. Guide users on what information to share for better analysis

Important guidelines:
- Work with available document information and user-provided excerpts
- When users share text from the document, analyze it thoroughly
- Always provide legal disclaimers when giving legal analysis
- Be thorough but concise in your responses
- If you need more information, guide the user on what to share
- Ask clarifying questions when helpful
- Maintain a professional, helpful tone

Remember: Always include appropriate disclaimers that your analysis is for informational purposes only and does not constitute legal advice. Encourage users to share specific document content for detailed analysis.`

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