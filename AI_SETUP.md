# AI Assistant Setup Instructions

## OpenAI API Key Configuration

To enable the AI Assistant feature, you need to configure your OpenAI API key:

### Steps:

1. **Get your OpenAI API Key:**
   - Go to [OpenAI Platform](https://platform.openai.com/)
   - Sign in to your account (or create one if you don't have it)
   - Navigate to "API Keys" in your dashboard
   - Click "Create new secret key"
   - Copy the generated API key

2. **Add the API key to your environment:**
   - Open the `.env.local` file in the `frontend` directory
   - Find the line: `OPENAI_API_KEY=your_openai_api_key_here`
   - Replace `your_openai_api_key_here` with your actual OpenAI API key
   - Save the file

3. **Restart the development server:**
   ```bash
   npm run dev
   ```

### Example .env.local configuration:
```bash
# OpenAI Configuration (for AI document summarization)
OPENAI_API_KEY=sk-proj-abcdef123456...your-actual-key-here
```

## Features

Once configured, the AI Assistant provides:

- **Document Analysis**: Automatic summarization of uploaded legal documents
- **Interactive Q&A**: Ask questions about your documents and get contextual answers
- **Multi-Document Context**: Analyze multiple documents together for comprehensive insights
- **Legal Focus**: Specialized prompts for legal document analysis

## Usage

1. Upload documents to the Document Vault
2. Click the "AI Assistant" button (available when documents are loaded)
3. The AI will provide an initial summary of your documents
4. Ask follow-up questions about the documents
5. Get insights about legal terms, obligations, dates, and more

## Security

- All document analysis happens securely through OpenAI's API
- Your API key is stored securely in environment variables
- Document content is sent to OpenAI only for analysis purposes
- Always ensure you comply with your organization's data policies

## Troubleshooting

- **"OpenAI API key not configured"**: Make sure your API key is correctly set in `.env.local`
- **Rate limit errors**: You may need to upgrade your OpenAI plan or wait before making more requests
- **Invalid API key**: Double-check that your API key is correct and has sufficient credits

## Cost Considerations

- The AI Assistant uses OpenAI's GPT-4o-mini model
- Costs depend on the length and number of documents analyzed
- Monitor your OpenAI usage dashboard to track costs
- Consider setting usage limits in your OpenAI account