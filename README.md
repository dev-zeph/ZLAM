# ZephVault Admin Portal

A comprehensive administrative dashboard for AN. Zeph and Associates, featuring secure document management and property administration with AI-powered document summarization and automated rent notifications.

## 🏗️ Project Architecture

### Tech Stack
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, Shadcn/UI
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **AI**: OpenAI GPT-4o for document summarization
- **Email**: Resend/Postmark for automated notifications
- **Storage**: Supabase Storage (S3-compatible, private bucket)

### Key Features
1. **Document Vault**: Secure document storage with AI-powered summarization
2. **Faith Plaza Tracker**: Property management with automated rent notifications
3. **Authentication**: Secure email/password authentication with RLS
4. **Dashboard**: Overview of documents, properties, and upcoming rent dates

## 🚀 Setup Instructions

### Prerequisites
- Node.js 18+ 
- A Supabase account
- An OpenAI API key
- An email service account (Resend or Postmark)

### 1. Supabase Setup

#### Create Supabase Project
1. Go to [Supabase](https://supabase.com) and create a new project
2. Note your project URL and anon key

#### Database Setup
1. In your Supabase SQL editor, run the `sql-foundation.sql` file
2. Then run the `database-enhancements.sql` file
3. This will create all tables, RLS policies, views, and sample data

#### Storage Setup
The `database-enhancements.sql` file automatically creates the private `documents` bucket with proper policies.

### 2. Environment Variables

Create `/frontend/.env.local` (copy from `.env.local.example`):

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Email Service (choose one)
RESEND_API_KEY=your_resend_api_key
# OR
POSTMARK_SERVER_TOKEN=your_postmark_server_token

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
FIRM_NAME="AN. Zeph and Associates"
FIRM_EMAIL="admin@anzeph.com"

# Cron Job Security
CRON_SECRET=your_secure_random_string

NODE_ENV=development
```

### 3. Install Dependencies

```bash
cd frontend
npm install
```

### 4. Deploy Supabase Edge Function

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Deploy the edge function
supabase functions deploy summarize-document --no-verify-jwt

# Set environment variables for the edge function
supabase secrets set OPENAI_API_KEY=your_openai_api_key
```

### 5. Create Admin User

Since this is an internal-only application, create admin users directly in Supabase:

1. Go to Authentication > Users in your Supabase dashboard
2. Click "Add user"
3. Create users with firm email addresses
4. Users will receive confirmation emails

### 6. Run the Development Server

```bash
cd frontend
npm run dev
```

Visit `http://localhost:3000` and sign in with your admin credentials.

## 📚 Usage Guide

### Document Management

1. **Upload Documents**: Click "Upload Document" in the Document Vault
2. **Categorize**: Choose from General, Litigation, Corporate, Lease, or Property
3. **AI Summarization**: Click the robot icon to generate AI summaries
4. **Search & Filter**: Use the search bar and category filters

### Property Management

1. **View Tenants**: Go to Faith Plaza tab to see all tenants and rent status
2. **Edit Tenant Info**: Click edit icon to update tenant details and rent dates
3. **Send Reminders**: Click email icon to send manual rent reminders
4. **Monitor Status**: Track overdue, urgent, and upcoming payments

### Automated Rent Notifications

The system automatically sends rent reminders at:
- **30 days** before rent is due
- **7 days** before rent is due  
- **1 day** before rent is due

Set up a cron job to call the automation endpoint:

```bash
# Example cron job (daily at 8 AM)
0 8 * * * curl -X POST "https://your-app.vercel.app/api/check-rent-reminders" \
  -H "Authorization: Bearer your_cron_secret"
```

## 🔧 Database Schema

### Core Tables
- `properties`: Properties managed by the firm
- `units`: Individual units within properties
- `tenants`: Tenant information and rent due dates
- `documents`: Document storage with AI summaries
- `notification_logs`: Email notification tracking

### Views
- `tenant_units_view`: Combined tenant and property information
- `documents_view`: Enhanced document information with property details

### Functions
- `get_tenants_needing_reminders()`: Returns tenants needing rent reminders
- `log_notification()`: Logs email notifications
- `update_document_summary()`: Updates AI summaries

## 🔐 Security Features

- **Row Level Security (RLS)**: Only authenticated users can access data
- **Private Storage**: Documents are stored in private Supabase bucket
- **Auth Protection**: All dashboard routes require authentication
- **API Security**: Cron endpoints require secret tokens

## 🎨 UI Components

Built with Shadcn/UI for consistency and accessibility:
- Responsive dashboard layout
- Data tables with sorting and filtering
- Modal dialogs and slide-over panels  
- Loading states and error handling
- Mobile-friendly navigation

## 📱 API Endpoints

- `POST /api/send-rent-notice`: Send manual rent reminders
- `POST /api/check-rent-reminders`: Automated cron job for rent checks
- `POST /functions/v1/summarize-document`: AI document summarization

## 🚀 Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Add all environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Supabase Edge Functions

Edge functions are already deployed to Supabase and will scale automatically.

### Cron Jobs

Set up cron jobs using:
- **GitHub Actions** (recommended for git-based projects)
- **Vercel Cron** (for Vercel Pro plans)
- **External cron service** (cron-job.org, etc.)

## 🔍 Monitoring & Logs

- **Supabase Dashboard**: Monitor database usage and auth
- **Vercel Analytics**: Track application performance
- **Edge Function Logs**: Monitor AI summarization requests
- **Notification Logs**: Track all sent email notifications in database

## 🛠️ Development

### Adding New Features
1. Create new database tables/functions in SQL files
2. Update TypeScript types in `/lib/types/database.ts`
3. Add new UI components following existing patterns
4. Create API routes for backend functionality

### Testing
- Test authentication flows
- Verify RLS policies work correctly
- Test document upload and AI summarization
- Validate email notifications (use test mode first)

## 🆘 Troubleshooting

### Common Issues
1. **Upload Failures**: Check Supabase storage policies and bucket permissions
2. **AI Summarization**: Verify OpenAI API key and Edge Function deployment
3. **Email Issues**: Confirm email service API keys and from addresses
4. **Auth Problems**: Check RLS policies and user permissions

### Support
- Check Supabase logs for database errors
- Monitor Edge Function logs for AI issues
- Review Vercel function logs for API problems

## 📄 License

Private internal use only for AN. Zeph and Associates.