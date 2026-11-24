# Deployment Instructions

## Overview

This guide covers deploying the Multi-Branch Billing System to production using Vercel (frontend) and Supabase (database/auth/storage).

## Prerequisites

- GitHub/GitLab/Bitbucket account
- Vercel account
- Supabase account
- Domain name (optional)

---

## 1. Supabase Setup

### Create Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose organization, name project, set database password
4. Select region closest to users
5. Wait for provisioning (2-3 minutes)

### Database Migrations

Run the following SQL files in order in the **SQL Editor**:

#### 1. Core Schema (`db/schema.sql`)
```sql
-- Copy and paste the entire contents of db/schema.sql
-- This creates all tables, indexes, and base structure
```

#### 2. Atomic Invoice Function (`db/migrations/002_atomic_invoice_function.sql`)
```sql
-- Copy and paste the function for atomic invoice creation
```

#### 3. Stock Helper Functions (`db/migrations/003_stock_functions.sql`)
```sql
-- Copy and paste increment/decrement/transfer functions
```

### Row Level Security (RLS) Policies

Apply these policies for each table. Example for `customers`:

```sql
-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Organization-scoped policies
CREATE POLICY "Users can view customers in their organization"
ON customers FOR SELECT USING (
  organization_id = (
    SELECT organization_id
    FROM organization_memberships
    WHERE user_profile_id = auth.uid()
  )
);

CREATE POLICY "Users can insert customers in their organization"
ON customers FOR INSERT WITH CHECK (
  organization_id = (
    SELECT organization_id
    FROM organization_memberships
    WHERE user_profile_id = auth.uid()
  )
);

CREATE POLICY "Users can update customers in their organization"
ON customers FOR UPDATE USING (
  organization_id = (
    SELECT organization_id
    FROM organization_memberships
    WHERE user_profile_id = auth.uid()
  )
);

CREATE POLICY "Users can delete customers in their organization"
ON customers FOR DELETE USING (
  organization_id = (
    SELECT organization_id
    FROM organization_memberships
    WHERE user_profile_id = auth.uid()
  )
);
```

Repeat similar policies for ALL tables:
- Organization-scoped: `customers`, `products`, `product_categories`, `suppliers`, `purchase_receipts`, `service_jobs`, `invoices`, `payments`, `audit_logs`, `stored_documents`
- Branch-scoped: `branch_products`, `stock_movements`, `stock_transfers`, `stock_transfer_items`, `service_job_parts`, `invoice_items`

For branch-scoped tables, add branch membership check:
```sql
CREATE POLICY "Branch access" ON branch_products
FOR ALL USING (
  organization_id = (SELECT organization_id FROM organization_memberships WHERE user_profile_id = auth.uid())
  AND branch_id IN (SELECT branch_id FROM branch_memberships WHERE user_profile_id = auth.uid())
);
```

### Storage Buckets

Create buckets in **Storage** section:

1. `invoices` - Private (for PDF invoices)
2. `service-photos` - Private (for service job photos)
3. `documents` - Private (for general documents)

Set policies:
```sql
-- Example for invoices bucket
CREATE POLICY "Users can upload invoices in their org"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'invoices'
  AND (storage.foldername(name))[1] = (
    SELECT organization_id::text
    FROM organization_memberships
    WHERE user_profile_id = auth.uid()
  )
);

CREATE POLICY "Users can view invoices in their org"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'invoices'
  AND (storage.foldername(name))[1] = (
    SELECT organization_id::text
    FROM organization_memberships
    WHERE user_profile_id = auth.uid()
  )
);
```

### Auth Configuration

1. Go to **Authentication > Settings**
2. Configure:
   - Site URL: `https://your-domain.com`
   - Redirect URLs: `https://your-domain.com/auth/callback`
   - Enable Email/Password provider
   - Disable email confirmations for development (enable for production)
   - Set password requirements

---

## 2. Vercel Deployment

### Connect Repository

1. Push code to GitHub/GitLab/Bitbucket
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "Add New..." > "Project"
4. Import your repository
5. Vercel auto-detects Next.js

### Environment Variables

Add these in **Project Settings > Environment Variables**:

| Variable | Value | Environment |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `your_anon_key` | All |
| `SUPABASE_SERVICE_ROLE_KEY` | `your_service_role_key` | All |
| `NODE_ENV` | `production` | Production |

**Important:** Never commit `.env` files. Use Vercel's environment variable system.

### Build Settings

Vercel auto-configures Next.js. Verify:
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

### Deploy

1. Click "Deploy"
2. Wait for build (3-5 minutes)
3. Visit deployment URL

### Custom Domain (Optional)

1. Go to **Project Settings > Domains**
2. Add your domain
3. Configure DNS records as instructed
4. SSL auto-provisioned

---

## 3. Post-Deployment Setup

### Initial Bootstrap

After first deployment, create the organization and owner user:

```bash
curl -X POST https://your-domain.com/api/setup \
  -H "Content-Type: application/json" \
  -d '{"email": "owner@yourcompany.com", "name": "Business Owner"}'
```

### Verify Setup

1. Visit `https://your-domain.com`
2. Should redirect to `/auth/login`
3. Sign up with the bootstrapped email
4. Check email for confirmation (if enabled)
5. Login and verify dashboard loads

### Create First Branch

1. Go to Settings > Branches
2. Click "Add Branch"
3. Enter branch details

### Configure GST/Tax Rates

1. Go to Settings > GST Configuration
2. Add HSN/SAC codes with applicable rates
3. Set default CGST/SGST/IGST

---

## 4. Production Checklist

### Security
- [ ] RLS policies enabled on all tables
- [ ] Service role key only in Vercel environment variables
- [ ] HTTPS enforced (Vercel default)
- [ ] CORS configured in Supabase (Dashboard > API > CORS)
- [ ] Rate limiting considered (Vercel Edge Functions or middleware)

### Performance
- [ ] Database indexes created (see `db/schema.sql`)
- [ ] Connection pooling enabled in Supabase (Settings > Database > Connection Pooling)
- [ ] Vercel Edge Caching for static assets
- [ ] Image optimization configured

### Monitoring
- [ ] Vercel Analytics enabled
- [ ] Supabase Logs monitored
- [ ] Error tracking (Sentry) configured
- [ ] Database backup schedule verified (Supabase Pro+)

### Backup Strategy
- Supabase automatic daily backups (point-in-time recovery)
- Manual backup before major changes:
  ```bash
  supabase db dump --schema public > backup.sql
  ```

---

## 5. Scaling Considerations

### Database
- Read replicas for reporting queries
- Partition `stock_movements` and `audit_logs` by date
- Archive old invoices to separate table

### Application
- Vercel Functions scale automatically
- Consider Edge Middleware for auth checks
- Implement caching for product catalog

### File Storage
- Supabase Storage scales automatically
- CDN for invoice PDFs
- Consider separate bucket for service photos

---

## 6. Troubleshooting

### Common Issues

**Build Fails:**
- Check Node.js version (18.x required)
- Verify all dependencies in `package.json`
- Check TypeScript errors: `npm run build`

**RLS Not Working:**
- Verify policies are created
- Check `auth.uid()` returns correct user
- Ensure user has organization membership

**PDF Generation Fails:**
- Verify `pdfkit` compatibility
- Check file system permissions (use `/tmp` in serverless)
- Consider streaming PDF directly to response

**Barcode Scanning Not Working:**
- HTTPS required for camera access
- Check browser permissions
- Test `@zxing/browser` compatibility

---

## 7. Maintenance

### Regular Tasks
- Weekly: Review audit logs
- Monthly: Check database size, clean old logs
- Quarterly: Review RLS policies, update dependencies

### Updates
```bash
# Update dependencies
npm update

# Check for security vulnerabilities
npm audit

# Deploy updates
git push origin main  # Auto-deploys via Vercel
```

---

## Support Resources

- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
- [Supabase Production Checklist](https://supabase.com/docs/guides/platform/production-checklist)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)