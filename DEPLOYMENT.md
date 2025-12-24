# ZephVault Deployment Checklist

## ✅ Pre-Deployment Setup

### Supabase Configuration
- [ ] Supabase project created and configured
- [ ] Database tables created using `sql-foundation.sql`
- [ ] Database enhancements applied using `database-enhancements.sql`
- [ ] RLS policies enabled and tested
- [ ] Storage bucket `documents` created as private
- [ ] Storage policies configured for authenticated access
- [ ] Sample data inserted (Faith Plaza with test tenants)

### Environment Variables Setup
- [ ] `.env.local` created with all required variables
- [ ] `NEXT_PUBLIC_SUPABASE_URL` configured
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configured  
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configured
- [ ] `OPENAI_API_KEY` configured
- [ ] Email service API key configured (`RESEND_API_KEY` or `POSTMARK_SERVER_TOKEN`)
- [ ] `FIRM_NAME` and `FIRM_EMAIL` set
- [ ] `CRON_SECRET` generated for automation security

### Supabase Edge Functions
- [ ] Supabase CLI installed and logged in
- [ ] Project linked with `supabase link`
- [ ] `summarize-document` function deployed
- [ ] OpenAI API key set as Supabase secret
- [ ] Edge function tested with sample document

## 🚀 Deployment Steps

### Vercel Deployment
- [ ] GitHub repository connected to Vercel
- [ ] Environment variables added to Vercel project settings
- [ ] Build settings configured (Next.js framework auto-detected)
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate verified

### Post-Deployment Verification
- [ ] Application loads correctly on production URL
- [ ] Authentication flow works (login/logout)
- [ ] Dashboard displays correctly with stats
- [ ] Document upload functionality tested
- [ ] AI summarization tested with sample document
- [ ] Faith Plaza tenant management tested
- [ ] Manual rent reminder email tested

## 📧 Email Service Setup

### Resend Setup (Recommended)
- [ ] Resend account created
- [ ] Domain verified in Resend dashboard
- [ ] API key generated and added to environment
- [ ] Test email sent successfully

### OR Postmark Setup
- [ ] Postmark account created
- [ ] Sender signature verified
- [ ] Server token generated and added to environment
- [ ] Test email sent successfully

## 🤖 Automation Setup

### Cron Job Configuration
Choose one method:

#### Option 1: GitHub Actions (Recommended)
- [ ] Create `.github/workflows/rent-reminders.yml`
- [ ] Configure daily schedule (8 AM WAT suggested)
- [ ] Add `CRON_SECRET` to GitHub Secrets
- [ ] Test workflow manually

#### Option 2: Vercel Cron (Pro Plan Required)
- [ ] Add `vercel.json` with cron configuration
- [ ] Deploy with cron jobs enabled
- [ ] Test cron endpoint

#### Option 3: External Cron Service
- [ ] Set up account with cron-job.org or similar
- [ ] Configure daily job to hit `/api/check-rent-reminders`
- [ ] Include `Authorization: Bearer CRON_SECRET` header

## 👥 User Management

### Admin Users Setup
- [ ] Admin users created in Supabase Auth dashboard
- [ ] Test login with admin credentials
- [ ] Verify admin has access to all features
- [ ] Document user credentials securely

### User Access Control
- [ ] RLS policies tested with authenticated users
- [ ] Verify unauthenticated users cannot access data
- [ ] Test document storage privacy (files not publicly accessible)

## 🔧 Production Configuration

### Security Checklist
- [ ] All environment variables use production values
- [ ] Database RLS policies active and tested
- [ ] Storage bucket is private (not public)
- [ ] CORS headers configured correctly
- [ ] API endpoints require proper authentication
- [ ] Cron endpoints protected with secret token

### Performance Optimization
- [ ] Database indexes created for performance
- [ ] Image optimization enabled in Next.js
- [ ] Static assets properly cached
- [ ] Bundle size analyzed and optimized

## 📊 Monitoring Setup

### Application Monitoring
- [ ] Vercel Analytics enabled
- [ ] Error tracking configured
- [ ] Performance metrics baseline established
- [ ] Uptime monitoring set up

### Database Monitoring
- [ ] Supabase dashboard bookmarked
- [ ] Database usage alerts configured
- [ ] Backup strategy verified
- [ ] Edge function logs monitored

## 🧪 Testing Checklist

### Core Functionality Tests
- [ ] User authentication (login/logout)
- [ ] Document upload and download
- [ ] Document categorization and search
- [ ] AI document summarization
- [ ] Tenant information management
- [ ] Rent due date updates
- [ ] Manual email reminders
- [ ] Automated email notifications
- [ ] Dashboard statistics accuracy

### Edge Cases
- [ ] Large file upload (test limits)
- [ ] Invalid file type handling
- [ ] Network error handling
- [ ] Concurrent user access
- [ ] Mobile device compatibility

## 📋 Launch Preparation

### Documentation
- [ ] README.md completed with setup instructions
- [ ] User guide created for firm staff
- [ ] Technical documentation for future developers
- [ ] API documentation for integrations

### Training & Handoff
- [ ] Admin training session scheduled
- [ ] User manual provided
- [ ] Support contact information documented
- [ ] Backup admin access configured

## 🚀 Go-Live Tasks

### Final Verification
- [ ] All tests passing
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] Backup and recovery tested

### Launch Communication
- [ ] Stakeholders notified of launch
- [ ] User access credentials distributed
- [ ] Support process documented
- [ ] Success metrics defined

### Post-Launch Monitoring
- [ ] Monitor application performance first 24 hours
- [ ] Check error logs for issues
- [ ] Verify automated emails are working
- [ ] Collect initial user feedback
- [ ] Document any immediate issues for resolution

## 📞 Support Information

### Technical Support
- **Developer**: Available for technical issues
- **Supabase Support**: Database and auth issues
- **Vercel Support**: Hosting and deployment issues
- **Email Service Support**: Email delivery issues

### Emergency Contacts
- **System Administrator**: [Contact Info]
- **Firm IT Support**: [Contact Info]
- **Developer**: [Contact Info]

---

## ✅ Deployment Complete!

Once all items are checked off:
1. Application is live and fully functional
2. All users can access the system
3. Automated processes are running
4. Monitoring is in place
5. Support structure is established

**Production URL**: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
**Admin Dashboard**: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
**Deployment Date**: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_