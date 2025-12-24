import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { documentId } = await req.json()
    
    if (!documentId) {
      return new Response(
        JSON.stringify({ error: 'Document ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get document info from database
    const { data: document, error: docError } = await supabaseClient
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return new Response(
        JSON.stringify({ error: 'Document not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Download file from Supabase Storage
    // Extract the full path from the URL (consistent with frontend logic)
    const urlParts = document.file_url.split('/')
    const bucketIndex = urlParts.findIndex((part: string) => part === 'documents')
    const filePath = urlParts.slice(bucketIndex + 1).join('/')
    
    console.log('Downloading file for AI processing with path:', filePath)
    
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from('documents')
      .download(filePath)

    if (downloadError || !fileData) {
      return new Response(
        JSON.stringify({ error: 'Failed to download document' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract text from document (simplified for demo)
    let textContent = ''
    
    if (document.file_name.toLowerCase().endsWith('.txt')) {
      textContent = await fileData.text()
    } else {
      // For PDF/DOC files, you'd need additional libraries
      // For now, we'll use a placeholder message
      textContent = `Document: ${document.file_name}\nCategory: ${document.category}\nThis is a ${document.category} document that requires manual review for full text extraction.`
    }

    // Call OpenAI API for summarization
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a legal assistant for AN. Zeph and Associates. Summarize documents into 5 key bullet points including parties involved and critical dates. Keep summaries professional and concise.'
          },
          {
            role: 'user',
            content: `Please summarize this ${document.category} document:\n\n${textContent}`
          }
        ],
        max_tokens: 500,
        temperature: 0.3
      })
    })

    if (!openaiResponse.ok) {
      throw new Error('OpenAI API request failed')
    }

    const openaiData = await openaiResponse.json()
    const summary = openaiData.choices[0]?.message?.content || 'Unable to generate summary'

    // Update document with AI summary
    const { error: updateError } = await supabaseClient
      .from('documents')
      .update({ ai_summary: summary })
      .eq('id', documentId)

    if (updateError) {
      throw new Error('Failed to save summary to database')
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        summary,
        message: 'Document summarized successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in summarize-document function:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})