import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface AnalyzeDocumentRequest {
  document: {
    id: string
    file_name: string
    category: string
    ai_summary?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeDocumentRequest = await request.json()
    const { document } = body

    // Validate OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    // Get additional document metadata if available
    const supabase = createClient()
    
    // Build comprehensive document context
    let documentContext = `Document Analysis Request:
File Name: ${document.file_name}
Category: ${document.category}
Document ID: ${document.id}
`

    // Include existing summary if available
    if (document.ai_summary) {
      documentContext += `\nPrevious Summary: ${document.ai_summary}`
    }

    // Create specialized system prompt for legal document analysis
    const systemPrompt = `You are ZephVault AI, a specialized legal document assistant for AN. Zeph and Associates law firm. Your task is to provide a comprehensive analysis of a single legal document.

Analysis Guidelines:
1. **Executive Summary**: Provide a clear, concise overview of the document's purpose and key points
2. **Key Parties**: Identify all parties involved (individuals, organizations, entities)
3. **Important Dates**: Extract all significant dates, deadlines, and time-sensitive obligations  
4. **Financial Terms**: Highlight monetary amounts, payment schedules, penalties, or financial obligations
5. **Legal Obligations**: Outline key responsibilities, duties, and requirements for each party
6. **Critical Clauses**: Identify important legal provisions, conditions, or restrictions
7. **Risk Factors**: Note potential legal risks, ambiguities, or areas requiring attention
8. **Action Items**: Suggest follow-up actions or areas that may need legal review

Format your response with clear headings and bullet points for easy reading.

Remember: This analysis is for informational purposes only. Always recommend consulting qualified legal professionals for legal advice and interpretation.

Document to Analyze:
${documentContext}`

    // Prepare the analysis request
    const messages = [
      { 
        role: 'system' as const, 
        content: systemPrompt 
      },
      {
        role: 'user' as const,
        content: `Please provide a comprehensive legal analysis of this document. Focus on extracting key information that would be valuable for law firm case management and client advisory services.`
      }
    ]

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      max_tokens: 1500, // Increased for comprehensive analysis
      temperature: 0.3, // Lower temperature for more focused, factual analysis
      stream: false,
    })

    const summary = completion.choices[0]?.message?.content || 'I apologize, but I was unable to generate an analysis for this document. Please try again.'

    // Log the analysis for debugging
    console.log('Document Analysis Request:', {
      documentId: document.id,
      fileName: document.file_name,
      category: document.category,
      summaryLength: summary.length,
      tokensUsed: completion.usage?.total_tokens || 0
    })

    // Optionally update the document with the new analysis (if different from existing summary)
    if (document.ai_summary !== summary) {
      try {
        const supabaseClient = await supabase
        await supabaseClient
          .from('documents')
          .update({ 
            ai_summary: summary.substring(0, 2000) // Truncate if too long for database
          })
          .eq('id', document.id)
      } catch (updateError) {
        console.error('Error updating document summary:', updateError)
        // Don't fail the request if update fails
      }
    }

    return NextResponse.json({
      summary,
      tokensUsed: completion.usage?.total_tokens || 0,
      documentId: document.id
    })

  } catch (error) {
    console.error('Error in document analysis:', error)
    
    // Handle specific OpenAI errors
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'OpenAI API key is invalid or missing. Please configure your API key in the environment variables.' },
          { status: 401 }
        )
      }
      
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again in a moment.' },
          { status: 429 }
        )
      }
      
      if (error.message.includes('quota')) {
        return NextResponse.json(
          { error: 'OpenAI usage quota exceeded. Please check your OpenAI account.' },
          { status: 429 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Internal server error. Please try again or contact support.' },
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