'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Upload, 
  FileText, 
  Download, 
  Trash2, 
  Eye, 
  Bot,
  Search,
  Filter,
  Plus
} from 'lucide-react'
import type { DocumentView } from '@/lib/types/database'
import PDFViewer from './PDFViewer'

export default function DocumentVault() {
  const [documents, setDocuments] = useState<DocumentView[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<DocumentView | null>(null)
  
  const supabase = createClient()

  const categories = ['general', 'litigation', 'corporate', 'lease', 'property']

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('documents_view')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setDocuments(data || [])
    } catch (error) {
      console.error('Error fetching documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setUploading(true)

    const formData = new FormData(event.currentTarget)
    const file = formData.get('file') as File
    const category = formData.get('category') as string

    if (!file) {
      alert('Please select a file')
      setUploading(false)
      return
    }

    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `${category}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      // Insert document record into database
      const { error: insertError } = await supabase
        .from('documents')
        .insert({
          file_name: file.name,
          file_url: publicUrl,
          category: category,
        })

      if (insertError) throw insertError

      alert('Document uploaded successfully!')
      setUploadDialogOpen(false)
      fetchDocuments()
    } catch (error) {
      console.error('Error uploading document:', error)
      alert('Error uploading document')
    } finally {
      setUploading(false)
    }
  }

  const handleView = (document: DocumentView) => {
    console.log('Viewing document:', document.file_name, 'URL:', document.file_url)
    
    // Check if it's a PDF file
    const isPdf = document.file_name.toLowerCase().endsWith('.pdf')
    
    if (isPdf) {
      setSelectedDocument(document)
      setPdfViewerOpen(true)
    } else {
      // For non-PDF files, open in new tab or download
      window.open(document.file_url, '_blank')
    }
  }

  const handleDownload = async (document: DocumentView) => {
    try {
      // Extract the full path from the URL
      // URL format: https://xxx.supabase.co/storage/v1/object/public/documents/category/filename
      const urlParts = document.file_url.split('/')
      const bucketIndex = urlParts.findIndex(part => part === 'documents')
      const filePath = urlParts.slice(bucketIndex + 1).join('/')
      
      console.log('Downloading file with path:', filePath)
      
      const { data, error } = await supabase.storage
        .from('documents')
        .download(filePath)

      if (error) {
        console.error('Storage download error:', error)
        throw error
      }

      const url = URL.createObjectURL(data)
      const link = window.document.createElement('a')
      link.href = url
      link.download = document.file_name
      window.document.body.appendChild(link)
      link.click()
      window.document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading document:', error)
      alert(`Error downloading document: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleDelete = async (document: DocumentView) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    try {
      // Extract the full path from the URL (same logic as download)
      const urlParts = document.file_url.split('/')
      const bucketIndex = urlParts.findIndex(part => part === 'documents')
      const filePath = urlParts.slice(bucketIndex + 1).join('/')
      
      console.log('Deleting file with path:', filePath)
      
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([filePath])

      if (storageError) throw storageError

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', document.id)

      if (dbError) throw dbError

      alert('Document deleted successfully!')
      fetchDocuments()
    } catch (error) {
      console.error('Error deleting document:', error)
      alert('Error deleting document')
    }
  }

  const handleSummarize = async (document: DocumentView) => {
    try {
      setLoading(true)
      
      // Call Supabase Edge Function for AI summarization
      const { data, error } = await supabase.functions.invoke('summarize-document', {
        body: { documentId: document.id }
      })

      if (error) {
        throw new Error(error.message || 'Failed to summarize document')
      }

      if (data?.success) {
        alert('Document summarized successfully!')
        fetchDocuments() // Refresh to show the new summary
      } else {
        throw new Error(data?.error || 'Summarization failed')
      }
    } catch (error) {
      console.error('Error summarizing document:', error)
      alert(`Error summarizing document: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (doc.ai_summary && doc.ai_summary.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'litigation': return 'destructive'
      case 'corporate': return 'secondary'
      case 'lease': return 'default'
      case 'property': return 'outline'
      default: return 'default'
    }
  }

  const getFileIcon = (extension: string) => {
    return <FileText className="h-4 w-4" />
  }

  const handleAIAnalysis = async (document: DocumentView) => {
    // Open document chat in new tab
    const chatUrl = `/dashboard/document-chat?id=${document.id}`
    window.open(chatUrl, '_blank')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Document Vault</h1>
          <p className="text-gray-500">Secure document storage with AI-powered summarization</p>
        </div>
        
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload New Document</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleFileUpload} className="space-y-4">
              <div>
                <Label htmlFor="file">Select File</Label>
                <Input
                  id="file"
                  name="file"
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  name="category"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                >
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={uploading} className="flex-1">
                  {uploading ? 'Uploading...' : 'Upload'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setUploadDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="p-2 border border-gray-300 rounded-md"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Documents ({filteredDocuments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading documents...</div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No documents found. Upload your first document to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>AI Summary</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getFileIcon(doc.file_extension)}
                        <span className="font-medium">{doc.file_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getCategoryColor(doc.category)}>
                        {doc.category.charAt(0).toUpperCase() + doc.category.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {doc.property_name ? (
                        <div>
                          <p className="font-medium">{doc.property_name}</p>
                          {doc.unit_number && (
                            <p className="text-sm text-gray-500">{doc.unit_number}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">General</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {doc.ai_summary ? (
                        <div className="max-w-xs">
                          <p className="text-sm truncate">{doc.ai_summary}</p>
                          <Badge variant="outline" className="text-xs">
                            {doc.summary_length}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-gray-400">Not summarized</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(doc.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleView(doc)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownload(doc)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAIAnalysis(doc)}
                          title="AI Analysis"
                        >
                          <Bot className="h-4 w-4" />
                        </Button>
                        {!doc.ai_summary && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSummarize(doc)}
                            title="Generate Summary"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(doc)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* PDF Viewer Modal */}
      {selectedDocument && (
        <PDFViewer
          isOpen={pdfViewerOpen}
          onClose={() => {
            setPdfViewerOpen(false)
            setSelectedDocument(null)
          }}
          fileUrl={selectedDocument.file_url}
          fileName={selectedDocument.file_name}
        />
      )}
    </div>
  )
}