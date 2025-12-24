import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface ChatRequest {
  message: string
  documents: Array<{
    id: string
    file_name: string
    category: string
    ai_summary?: string
  }>
  conversationHistory?: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
  isInitial?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()
    const { message, documents, conversationHistory = [], isInitial = false } = body

    // Validate OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    // Get document content if we need to analyze them
    const supabase = createClient()
    let documentContent = ''
    
    if (documents && documents.length > 0) {
      // Build document context from existing summaries and metadata
      documentContent = documents.map(doc => {
        let content = `Document: ${doc.file_name}\nCategory: ${doc.category}\n`
        if (doc.ai_summary) {
          content += `Previous Summary: ${doc.ai_summary}\n`
        }
        return content
      }).join('\n---\n')
    }

    // Build system prompt
    let systemPrompt = `You are ZephVault AI, a specialized legal document assistant for AN. Zeph and Associates law firm. You help analyze legal documents, provide summaries, and answer questions about document contents.

Key Guidelines:
1. Focus on factual document analysis and legal information extraction
2. Always remind users that this is not legal advice and they should consult qualified attorneys
3. Be concise but thorough in your responses
4. Highlight important legal terms, dates, parties, and obligations
5. If asked about specific legal interpretations, recommend consulting with the firm's attorneys

Available Documents Context:
${documentContent || 'No documents provided in this session.'}

Remember: You are assisting with document analysis and information extraction, not providing legal advice.`

    // Build conversation messages
    const messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }> = [
      { role: 'system', content: systemPrompt }
    ]

    // Add conversation history (limit to last 10 messages for context)
    const recentHistory = conversationHistory.slice(-10)
    messages.push(...recentHistory)

    // Add current message or generate initial summary
    if (isInitial && documents.length > 0) {
      messages.push({
        role: 'user',
        content: `Please provide a comprehensive summary of the ${documents.length} document(s) I've uploaded. Focus on key legal elements, parties involved, important dates, and main obligations or terms. Then ask me what specific questions I have about these documents.`
      })
    } else {
      messages.push({
        role: 'user',
        content: message
      })
    }

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using the latest model
      messages: messages,
      max_tokens: 1000,
      temperature: 0.7,
      stream: false, // We can implement streaming later if needed
    })

    const response = completion.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response. Please try again.'

    // Log the interaction for debugging
    console.log('AI Chat Request:', {
      documentsCount: documents.length,
      messageLength: message.length,
      isInitial,
      responseLength: response.length
    })

    return NextResponse.json({
      response,
      tokensUsed: completion.usage?.total_tokens || 0,
    })

  } catch (error) {
    console.error('Error in AI chat:', error)
    
    // Handle specific OpenAI errors
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'OpenAI API key is invalid or missing' },
          { status: 401 }
        )
      }
      
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again in a moment.' },
          { status: 429 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    )
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}