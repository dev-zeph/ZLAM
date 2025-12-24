'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Bot, 
  User, 
  Send, 
  FileText, 
  ArrowLeft,
  Loader2,
  Eye
} from 'lucide-react'
import Link from 'next/link'
import type { DocumentView } from '@/lib/types/database'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

function DocumentChatContent() {
  const searchParams = useSearchParams()
  const documentId = searchParams?.get('id')
  
  const [document, setDocument] = useState<DocumentView | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [documentExcerpt, setDocumentExcerpt] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const supabase = createClient()

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Fetch document details
  useEffect(() => {
    const fetchDocument = async () => {
      if (!documentId) {
        console.log('No document ID provided')
        setIsLoading(false)
        return
      }

      try {
        console.log('Fetching document with ID:', documentId)
        
        // Check auth status
        const { data: { user } } = await supabase.auth.getUser()
        console.log('Current user:', user?.email || 'Not authenticated')
        
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('id', documentId)
          .single()

        if (error) {
          console.error('Supabase error:', error)
          throw error
        }
        
        console.log('Document fetched successfully:', data)
        setDocument(data)
        
        // Add initial greeting message based on analysis status
        const hasAnalysis = data.ai_summary && data.ai_summary.trim().length > 0
        const initialMessage: ChatMessage = {
          id: '1',
          role: 'assistant',
          content: hasAnalysis 
            ? `Hello! I'm here to help you with questions about "${data.file_name}". This document has been analyzed, so I can answer detailed questions about its content, including specific names, dates, clauses, and other important information. What would you like to know?`
            : `Hello! I'm here to help you with questions about "${data.file_name}". To provide you with detailed answers about the document's content, I recommend first analyzing the document using the "Analyze Document" button below. Once analyzed, I can answer specific questions about names, dates, clauses, and other document details.`,
          timestamp: new Date()
        }
        
        setMessages([initialMessage])
      } catch (error) {
        console.error('Error fetching document:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDocument()
  }, [documentId, supabase])

  const sendMessage = async () => {
    if (!inputMessage.trim() || !document || isSending) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsSending(true)

    try {
      const response = await fetch('/api/ai-document-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage.trim(),
          document: {
            id: document.id,
            file_name: document.file_name,
            category: document.category,
            ai_summary: document.ai_summary
          },
          conversationHistory: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }),
      })

      if (!response.ok) throw new Error('Failed to get AI response')

      const data = await response.json()
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your message. Please try again or check if the OpenAI API is properly configured.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const analyzeDocument = async () => {
    if (!document || isAnalyzing) return

    setIsAnalyzing(true)
    
    try {
      const response = await fetch('/api/ai-analyze-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document: {
            id: document.id,
            file_name: document.file_name,
            category: document.category,
            ai_summary: document.ai_summary
          }
        }),
      })

      if (!response.ok) throw new Error('Failed to analyze document')

      const data = await response.json()
      
      // Update the document state with the new summary immediately
      setDocument(prev => prev ? { ...prev, ai_summary: data.summary } : null)
      console.log('Updated document state with new analysis, length:', data.summary?.length || 0)
      
      // Refresh document from database to get the latest analysis (if stored successfully)
      try {
        const { data: refreshedDoc, error: refreshError } = await supabase
          .from('documents_view')
          .select('*')
          .eq('id', document.id)
          .single()

        if (!refreshError && refreshedDoc) {
          setDocument(refreshedDoc)
          console.log('Document refreshed from database, analysis length:', refreshedDoc.ai_summary?.length || 0)
        } else {
          console.warn('Could not refresh document from database:', refreshError)
          // Keep the local state update
        }
      } catch (refreshErr) {
        console.warn('Error refreshing document:', refreshErr)
        // Keep the local state update
      }
      
      // Add a message to the chat about the successful analysis
      const analysisMessage: ChatMessage = {
        id: (Date.now() + 1000).toString(),
        role: 'assistant',
        content: `Perfect! I've successfully analyzed "${document.file_name}" and now have comprehensive information about its content. I can answer detailed questions about:

• Who is involved (names, parties, organizations)
• Key dates and deadlines
• Financial terms and amounts
• Important clauses and provisions
• Document purpose and main content
• Any obligations or requirements

What would you like to know about the document?`,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, analysisMessage])
    } catch (error) {
      console.error('Error analyzing document:', error)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1000).toString(),
        role: 'assistant',
        content: 'I encountered an error while analyzing the document. Please try again or ensure the document is accessible.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsAnalyzing(false)
    }
  }

  const analyzeWithExcerpt = async () => {
    if (!document || isAnalyzing || !documentExcerpt.trim()) return

    setIsAnalyzing(true)
    
    try {
      const response = await fetch('/api/ai-analyze-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document: {
            id: document.id,
            file_name: document.file_name,
            category: document.category,
            ai_summary: document.ai_summary
          },
          documentExcerpt: documentExcerpt.trim()
        }),
      })

      if (!response.ok) throw new Error('Failed to analyze document with excerpt')

      const data = await response.json()
      
      // Update the document state with the new summary immediately
      setDocument(prev => prev ? { ...prev, ai_summary: data.summary } : null)
      console.log('Updated document state with excerpt analysis, length:', data.summary?.length || 0)
      
      // Also refresh document from database to ensure consistency
      try {
        const { data: refreshedData } = await supabase
          .from('documents')
          .select('*')
          .eq('id', document.id)
          .single()
        
        if (refreshedData) {
          setDocument(refreshedData)
          console.log('Refreshed document from database, summary length:', refreshedData.ai_summary?.length || 0)
        }
      } catch (refreshError) {
        console.warn('Could not refresh document from database:', refreshError)
      }
      
      // Add a message to the chat about the successful analysis
      const analysisMessage: ChatMessage = {
        id: (Date.now() + 1000).toString(),
        role: 'assistant',
        content: `Excellent! I've analyzed "${document.file_name}" using the document excerpt you provided. I now have detailed information about the document content and can answer specific questions about:

• Names and parties involved
• Key dates and deadlines
• Financial terms and amounts
• Important clauses and provisions
• Document purpose and main content
• Any obligations or requirements

The analysis is based on the text excerpt you provided. What would you like to know about the document?`,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, analysisMessage])
      
      // Clear the excerpt after successful analysis
      setDocumentExcerpt('')
      
    } catch (error) {
      console.error('Error analyzing document with excerpt:', error)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1000).toString(),
        role: 'assistant',
        content: 'I encountered an error while analyzing the document excerpt. Please try again or check the content format.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsAnalyzing(false)
    }
  }

  const copyToExcerpt = () => {
    // This function can be removed since we'll use direct chat input
  }

  const openDocumentInNewTab = async () => {
    if (!document?.file_url) return

    try {
      // Extract the file path from the URL
      const urlParts = document.file_url.split('/')
      const bucketIndex = urlParts.findIndex(part => part === 'documents')
      
      if (bucketIndex === -1) {
        // If we can't parse the URL, try opening it directly
        window.open(document.file_url, '_blank')
        return
      }
      
      const filePath = urlParts.slice(bucketIndex + 1).join('/')
      console.log('Opening document with file path:', filePath)
      
      // Get signed URL for secure access
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 3600) // 1 hour expiry
      
      if (error) {
        console.error('Error creating signed URL:', error)
        // Fallback to original URL
        window.open(document.file_url, '_blank')
      } else {
        console.log('Opening signed URL:', data.signedUrl)
        window.open(data.signedUrl, '_blank')
      }
    } catch (error) {
      console.error('Error opening document:', error)
      // Final fallback
      window.open(document.file_url, '_blank')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading document...</span>
        </div>
      </div>
    )
  }

  if (!document) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700">Document Not Found</h2>
          <p className="text-gray-500 mb-4">The document you're looking for doesn't exist or has been removed.</p>
          <Link href="/dashboard/documents">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Documents
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/documents">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bot className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h1 className="font-semibold text-gray-900">AI Document Assistant</h1>
                <p className="text-sm text-gray-500">Analyzing: {document.file_name}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={openDocumentInNewTab}
              variant="outline"
              size="sm"
            >
              <Eye className="h-4 w-4 mr-2" />
              View Document
            </Button>
            <Badge variant="secondary" className="capitalize">
              {document.category}
            </Badge>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="max-w-4xl mx-auto p-6">
        <Card className="h-[calc(100vh-200px)] flex flex-col">
          <CardHeader className="border-b flex-shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-600" />
              <CardTitle className="text-lg">{document.file_name}</CardTitle>
            </div>
            <p className="text-sm text-gray-600">
              Uploaded: {new Date(document.created_at).toLocaleDateString()}
            </p>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            {/* Messages */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full p-4">
                <div className="space-y-4 pb-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-blue-600" />
                      </div>
                    )}
                    
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white ml-auto'
                          : 'bg-white border border-gray-200'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {message.timestamp.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                    
                    {message.role === 'user' && (
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-gray-600" />
                      </div>
                    )}
                  </div>
                ))}
                
                {isSending && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
                      <div className="flex items-center gap-2 text-gray-500">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span className="text-sm">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div ref={messagesEndRef} />
            </ScrollArea>
            </div>

            {/* Input Area */}
            <div className="border-t p-4 flex-shrink-0">
              {/* Analysis Controls */}
              <div className="mb-4">
                {document && (!document.ai_summary || document.ai_summary.trim().length === 0) ? (
                  // Show if document hasn't been analyzed
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-900">Document Analysis Required</p>
                          <p className="text-xs text-blue-700">Analyze this document to enable detailed Q&A</p>
                        </div>
                        <Button 
                          onClick={analyzeDocument}
                          disabled={isAnalyzing}
                          variant="outline"
                          size="sm"
                          className="border-blue-300 text-blue-700 hover:bg-blue-100"
                        >
                          {isAnalyzing ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <Bot className="h-3 w-3 mr-1" />
                              Analyze Document
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    {/* Simple Copy-Paste Instructions */}
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="text-sm font-medium text-amber-900 mb-2">
                            📄 For Detailed PDF Analysis
                          </h4>
                          <div className="text-xs text-amber-800 space-y-1">
                            <p><strong>Step 1:</strong> Click "View Document" button above (opens in new tab)</p>
                            <p><strong>Step 2:</strong> In the new tab, select all text (Ctrl+A or Cmd+A)</p>
                            <p><strong>Step 3:</strong> Copy the text (Ctrl+C or Cmd+C)</p>
                            <p><strong>Step 4:</strong> Return here, paste below, and click "Analyze PDF Content"</p>
                          </div>
                        </div>
                      </div>
                      
                      <textarea
                        placeholder="Paste document content here for comprehensive analysis... (Ctrl+V or Cmd+V)"
                        className="w-full h-24 mt-3 p-3 text-sm border border-amber-300 rounded-md resize-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        value={documentExcerpt}
                        onChange={(e) => setDocumentExcerpt(e.target.value)}
                        disabled={isAnalyzing}
                      />
                      <Button 
                        onClick={analyzeWithExcerpt} 
                        disabled={isAnalyzing || !documentExcerpt.trim()}
                        className="w-full mt-3"
                        size="sm"
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Analyzing Content...
                          </>
                        ) : (
                          <>
                            <FileText className="mr-2 h-4 w-4" />
                            Analyze PDF Content
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : document.ai_summary?.includes('I do not have direct access') ? (
                  // Show if analysis exists but is generic (no real content)
                  <div className="space-y-3">
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-orange-900">Analysis Needs Improvement</p>
                          <p className="text-xs text-orange-700">Current analysis is generic. Add document content for detailed Q&A</p>
                        </div>
                        <Button 
                          onClick={analyzeDocument}
                          disabled={isAnalyzing}
                          variant="outline"
                          size="sm"
                          className="border-orange-300 text-orange-700 hover:bg-orange-100"
                        >
                          {isAnalyzing ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Re-analyzing...
                            </>
                          ) : (
                            <>
                              <Bot className="h-3 w-3 mr-1" />
                              Re-analyze Document
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    {/* PDF Excerpt Input for improvement */}
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="mb-2">
                        <p className="text-sm font-medium text-amber-900">
                          📄 Add PDF Content for Better Analysis
                        </p>
                        <p className="text-xs text-amber-700">
                          Paste key text sections to get detailed analysis with specific names, dates, and terms
                        </p>
                      </div>
                      <textarea
                        placeholder="Paste key sections of the PDF here... Example: 'This lease agreement is between John Doe (Landlord) and Jane Smith (Tenant), monthly rent $2,500, lease term March 1, 2024 to February 28, 2025...'"
                        className="w-full h-24 p-2 text-sm border border-amber-300 rounded resize-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        value={documentExcerpt}
                        onChange={(e) => setDocumentExcerpt(e.target.value)}
                        disabled={isAnalyzing}
                      />
                      <Button 
                        onClick={analyzeWithExcerpt} 
                        disabled={isAnalyzing || !documentExcerpt.trim()}
                        className="w-full mt-2"
                        size="sm"
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            Analyzing Content...
                          </>
                        ) : (
                          <>
                            <FileText className="mr-2 h-3 w-3" />
                            Analyze PDF Content
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Show if document has been analyzed successfully
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-900">Document Analyzed ✓</p>
                        <p className="text-xs text-green-700">I can now answer detailed questions about this document</p>
                      </div>
                      <Button 
                        onClick={analyzeDocument}
                        disabled={isAnalyzing}
                        variant="outline"
                        size="sm"
                        className="border-green-300 text-green-700 hover:bg-green-100"
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Re-analyzing...
                          </>
                        ) : (
                          <>
                            <Bot className="h-3 w-3 mr-1" />
                            Re-analyze Document
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask a question about this document..."
                  className="flex-1"
                  disabled={isSending}
                />
                <Button 
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isSending}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Press Enter to send • AI responses are for informational purposes only
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function DocumentChatPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-gray-500">Loading document chat...</p>
        </div>
      </div>
    }>
      <DocumentChatContent />
    </Suspense>
  )
}