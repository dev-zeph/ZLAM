'use client'

import { useState, useEffect, useRef } from 'react'
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
  Loader2
} from 'lucide-react'
import Link from 'next/link'
import type { DocumentView } from '@/lib/types/database'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function DocumentChatPage() {
  const searchParams = useSearchParams()
  const documentId = searchParams.get('id')
  
  const [document, setDocument] = useState<DocumentView | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
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
          .from('documents_view')
          .select('*')
          .eq('id', documentId)
          .single()

        if (error) {
          console.error('Supabase error:', error)
          throw error
        }
        
        console.log('Document fetched successfully:', data)
        setDocument(data)
        
        // Add initial greeting message
        const initialMessage: ChatMessage = {
          id: '1',
          role: 'assistant',
          content: `Hello! I'm here to help you with questions about "${data.file_name}". I can analyze the document, explain its contents, identify key information, and answer any questions you might have about it. What would you like to know?`,
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
          <Badge variant="secondary" className="capitalize">
            {document.category}
          </Badge>
        </div>
      </div>

      {/* Chat Area */}
      <div className="max-w-4xl mx-auto p-6">
        <Card className="h-[calc(100vh-200px)] flex flex-col">
          <CardHeader className="border-b">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-600" />
              <CardTitle className="text-lg">{document.file_name}</CardTitle>
            </div>
            <p className="text-sm text-gray-600">
              Uploaded: {new Date(document.created_at).toLocaleDateString()}
            </p>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
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

            {/* Input Area */}
            <div className="border-t p-4">
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