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
  documentExcerpt?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeDocumentRequest = await request.json()
    const { document, documentExcerpt } = body

    // Validate OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    // Get additional document metadata and content from Supabase
    const supabase = await createClient()
    
    // First, get the document details including file URL
    const { data: docData, error: docError } = await supabase
      .from('documents_view')
      .select('file_url, file_name, ai_summary')
      .eq('id', document.id)
      .single()

    if (docError) {
      console.error('Could not fetch document details:', docError)
      return NextResponse.json(
        { error: 'Could not fetch document details' },
        { status: 500 }
      )
    }

    // Build comprehensive document context
    let documentContext = `Document Analysis Request:
File Name: ${document.file_name}
Category: ${document.category}
Document ID: ${document.id}`

    // Try to get actual document content from storage
    let actualDocumentContent = ''
    
    try {
      // Extract file path from the URL
      const urlParts = docData.file_url.split('/')
      const bucketIndex = urlParts.findIndex((part: string) => part === 'documents')
      
      if (bucketIndex !== -1) {
        const filePath = urlParts.slice(bucketIndex + 1).join('/')
        console.log('Attempting to fetch document content from:', filePath)
        
        // Try to download the file content
        const { data: fileData, error: fileError } = await supabase.storage
          .from('documents')
          .download(filePath)
        
        if (!fileError && fileData) {
          // For text-based files, try to extract text content
          if (document.file_name.toLowerCase().endsWith('.txt') || 
              document.file_name.toLowerCase().endsWith('.md')) {
            actualDocumentContent = await fileData.text()
            console.log('Successfully extracted text content, length:', actualDocumentContent.length)
          } else if (document.file_name.toLowerCase().endsWith('.pdf')) {
            // For PDF files, note that content extraction would require additional processing
            console.log('PDF file detected - using existing summary or metadata for analysis')
            actualDocumentContent = 'PDF file content requires specialized extraction. Analysis based on filename and metadata.'
          }
        }
      }
    } catch (contentError) {
      console.warn('Could not extract document content:', contentError)
      actualDocumentContent = 'Document content could not be extracted. Analysis based on metadata and filename.'
    }

    // Include actual document content if available
    if (actualDocumentContent) {
      documentContext += `\n\nDocument Content:\n${actualDocumentContent}`
    }

    // Include user-provided document excerpt if available (highest priority)
    if (documentExcerpt && documentExcerpt.trim().length > 0) {
      documentContext += `\n\nDocument Excerpt (User Provided):\n${documentExcerpt.trim()}`
    }

    // Include existing summary if available
    if (document.ai_summary) {
      documentContext += `\n\nPrevious Summary: ${document.ai_summary}`
    }

    // Create comprehensive system prompt for document analysis
    const systemPrompt = `You are ZephVault AI, a specialized document analysis assistant for AN. Zeph and Associates. Your task is to provide a comprehensive, detailed analysis of documents based on available information.

IMPORTANT: If you do not have access to the full document content, clearly state this at the beginning of your analysis and then provide as much useful analysis as possible based on the filename, category, and any available metadata or context.

COMPREHENSIVE ANALYSIS REQUIREMENTS (when document content is available):

**DOCUMENT IDENTIFICATION**
- Document type and purpose (inferred from filename and content)
- Creation date and any relevant dates mentioned
- Version or revision information (if any)
- Language and jurisdiction (if applicable)

**PARTIES AND PEOPLE**
- ALL people mentioned (full names, titles, roles)
- Organizations, companies, entities involved
- Contact information (addresses, phones, emails) if present
- Relationships between parties

**KEY CONTENT ANALYSIS**
- Main purpose and subject matter
- Key terms, conditions, and provisions
- Important clauses, sections, or paragraphs
- Financial information (amounts, payments, fees, costs)
- ALL dates and deadlines with context
- Rights, obligations, and responsibilities
- Conditions, requirements, or criteria

**SPECIFIC DETAILS TO EXTRACT**
- Names: Extract ALL names (people, companies, entities, locations)
- Dates: Extract ALL dates with what each represents
- Numbers: Financial figures, quantities, percentages, reference numbers
- Locations: Addresses, jurisdictions, venues, places
- References: Citations, document references, case numbers
- Signatures: Who signed, when, witness information

**CRITICAL INFORMATION**
- Document title and description
- All parties and their roles
- Key dates and deadlines
- Financial terms and amounts
- Rights and obligations
- Important conditions
- Contact information
- Action items and next steps
- Risk factors or concerns

**ANALYSIS WHEN CONTENT IS LIMITED (filename/metadata only):**
- Analyze what the filename suggests (property address, document type, parties, etc.)
- Explain what type of document this likely is based on naming patterns
- Identify likely key information that would be in such a document
- Suggest what questions users might want to ask about this document type
- Provide context about what such documents typically contain

**OUTPUT FORMAT**
Provide a structured, detailed analysis covering ALL available information. If full content isn't available, clearly explain what can be inferred and what would require document upload or content access.

**ANALYSIS GOALS**
The analysis should enable answering questions like:
- "Who wrote/signed this?"
- "What are the key dates?"
- "What are the financial terms?"
- "What are the main obligations?"
- "Who are all the parties involved?"
- "What needs to be done next?"
- "Are there any deadlines?"

Be thorough with available information and transparent about limitations.`

    // Log the complete context being sent to AI for debugging
    console.log('=== DEBUG: Document Context Being Sent to AI ===')
    console.log('Document Name:', document.file_name)
    console.log('Context Length:', documentContext.length)
    console.log('Context Content:', documentContext)
    console.log('=== END DEBUG ===')

    // Prepare the analysis request
    const messages = [
      { 
        role: 'system' as const, 
        content: systemPrompt 
      },
      {
        role: 'user' as const,
        content: `Please analyze this document comprehensively based on the available information below. 

If you have access to full document content, extract all names, dates, financial information, parties involved, obligations, and any other critical details. 

If you only have filename and metadata, provide the most comprehensive analysis possible by:
1. Analyzing what the filename indicates (addresses, document types, parties, etc.)
2. Explaining what type of document this likely is
3. Describing what key information such documents typically contain
4. Identifying what specific questions users might ask about this document

Make the analysis detailed and useful for future Q&A, clearly stating what information is based on content vs. inference from filename/metadata.

DOCUMENT INFORMATION:
${documentContext}`
      }
    ]

    // Call OpenAI API with increased token limit for comprehensive analysis
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      max_tokens: 2000, // Increased for comprehensive analysis
      temperature: 0.2, // Lower temperature for more focused, factual analysis
      stream: false,
    })

    const summary = completion.choices[0]?.message?.content || 'I apologize, but I was unable to generate an analysis for this document. Please try again.'

    // Store the comprehensive summary in the database
    const { error: updateError } = await supabase
      .from('documents')
      .update({ 
        ai_summary: summary
      })
      .eq('id', document.id)

    if (updateError) {
      console.error('Error updating document with AI summary:', updateError)
      console.log('Continuing anyway - analysis will still be returned to user')
    } else {
      console.log('Successfully stored analysis in database')
    }

    // Log analysis stats for debugging
    console.log('Document Analysis Request:', {
      documentId: document.id,
      fileName: document.file_name,
      category: document.category,
      summaryLength: summary.length,
      tokensUsed: completion.usage?.total_tokens || 0
    })

    return NextResponse.json({ 
      summary,
      message: 'Document analysis completed successfully'
    })

  } catch (error) {
    console.error('Error in document analysis:', error)
    return NextResponse.json(
      { 
        error: 'Failed to analyze document',
        message: 'An error occurred while analyzing the document. Please try again.'
      },
      { status: 500 }
    )
  }
}