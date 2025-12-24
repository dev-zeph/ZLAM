'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Send, Bot, User, FileText, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface DocumentContext {
  id: string
  file_name: string
  category: string
  ai_summary?: string
}

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [documents, setDocuments] = useState<DocumentContext[]>([])
  const [initializing, setInitializing] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const searchParams = useSearchParams()
  const supabase = createClient()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const initializeChat = async () => {
      try {
        // Get document IDs from URL params
        const docIds = searchParams.get('documents')?.split(',') || []
        
        if (docIds.length > 0) {
          // Fetch document details
          const { data, error } = await supabase
            .from('documents')
            .select('id, file_name, category, ai_summary')
            .in('id', docIds)
          
          if (error) throw error
          
          setDocuments(data || [])
          
          // Generate initial summary if documents are loaded
          if (data && data.length > 0) {
            await generateInitialSummary(data)
          }
        } else {
          // No specific documents, show general greeting
          setMessages([{
            id: Date.now().toString(),
            role: 'assistant',
            content: "Hello! I'm your AI legal assistant. I can help analyze documents, answer questions about your legal documents, and provide insights. Please upload some documents first, then return here to start our conversation.",
            timestamp: new Date()
          }])
        }
      } catch (error) {
        console.error('Error initializing chat:', error)
        setMessages([{
          id: Date.now().toString(),
          role: 'assistant',
          content: "I'm having trouble loading the documents right now. Please try again or contact support if the issue persists.",
          timestamp: new Date()
        }])
      } finally {
        setInitializing(false)
      }
    }

    initializeChat()
  }, [searchParams, supabase])

  const generateInitialSummary = async (docs: DocumentContext[]) => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Please provide a comprehensive summary of the uploaded documents.',
          documents: docs,
          isInitial: true
        }),
      })

      if (!response.ok) throw new Error('Failed to generate summary')

      const data = await response.json()
      
      setMessages([{
        id: Date.now().toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      }])
    } catch (error) {
      console.error('Error generating initial summary:', error)
      setMessages([{
        id: Date.now().toString(),
        role: 'assistant',
        content: `I've loaded ${docs.length} document(s) for analysis: ${docs.map(d => d.file_name).join(', ')}. I'm ready to help you analyze these documents and answer any questions you might have about them. What would you like to know?`,
        timestamp: new Date()
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          documents: documents,
          conversationHistory: messages
        }),
      })

      if (!response.ok) throw new Error('Failed to get AI response')

      const data = await response.json()
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  if (initializing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading AI Assistant...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Bot className="h-6 w-6 text-blue-600" />
                ZephVault AI Assistant
              </h1>
              <p className="text-gray-600">Legal Document Analysis & Q&A</p>
            </div>
            {documents.length > 0 && (
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="text-sm text-gray-600">
                  {documents.length} document(s) loaded
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Document Context Panel */}
      {documents.length > 0 && (
        <div className="bg-white border-b p-4">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Documents in Context:</h3>
            <div className="flex flex-wrap gap-2">
              {documents.map((doc) => (
                <Badge key={doc.id} variant="secondary" className="text-xs">
                  {doc.file_name}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 max-w-4xl mx-auto w-full p-4">
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div className={`flex gap-3 max-w-[80%] ${
                  message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.role === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <Card className={`${
                    message.role === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white'
                  }`}>
                    <CardContent className="p-3">
                      <div className="whitespace-pre-wrap text-sm">
                        {message.content}
                      </div>
                      <div className={`text-xs mt-2 ${
                        message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="flex gap-3 max-w-[80%]">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-200 text-gray-600">
                    <Bot className="w-4 h-4" />
                  </div>
                  <Card className="bg-white">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-gray-600">AI is thinking...</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </ScrollArea>
      </div>

      {/* Input Form */}
      <div className="bg-white border-t p-4">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about your documents..."
              className="flex-1"
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !input.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
          <p className="text-xs text-gray-500 mt-2">
            AI can analyze your legal documents, answer questions, and provide insights. Always consult with qualified legal professionals for legal advice.
          </p>
        </div>
      </div>
    </div>
  )
}