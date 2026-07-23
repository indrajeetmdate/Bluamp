# Bluamp Plant OS — Security, Privacy & Credentials Audit
> **Target Audience**: Systems Engineer & Deployment Specialist  
> **Goal**: Prepare a sanitized, production-ready clone of the application for **Bluamp Energies**, isolating all external connections, API keys, database URLs, Slack webhooks, and legacy brand artifacts.

---

## Executive Summary
A comprehensive security and privacy audit was conducted across the codebase to locate all external connections, hardcoded credentials, company identity metadata, default email addresses, and legacy system fallbacks.

To safely transition the codebase to **Bluamp Energies**, all connections and credentials must be removed from code fallbacks and parametrized strictly via environment variables.

---

## 1. Credentials & External Connections Audit Matrix

| Category | Component / File Path | Exposed Value / Hardcoded Pattern | Risk Level | Required Remediation for Bluamp Energies |
| :--- | :--- | :--- | :--- | :--- |
| **Supabase Client** | `supabaseClient.ts`<br/>`api/slack-daily-tasks.ts`<br/>`api/slack-invoice.ts`<br/>`api/get-shared-draft.ts`<br/>`api/auth-migrate.ts` | **Supabase URL**: `https://bfkxdpripwjxenfvwpfu.supabase.co`<br/>**Anon JWT Key**: `eyJhbGciOiJIUzI1...` | 🔴 **CRITICAL** | Remove fallback string literals. Enforce `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in runtime environment. |
| **Gmail SMTP Proxy** | `api/send-mail.js`<br/>`api/backup.js` | **Default Email**: `datlioncnergy@gmail.com`<br/>**Allowed Origins**: `https://inventory.cnergy.co.in` | 🔴 **HIGH** | Replace default emails and origins with `GMAIL_USER`, `BACKUP_EMAIL`, and `VITE_APP_URL`. |
| **OpenRouter AI Proxy** | `api/openrouter.ts` | **HTTP-Referer**: `https://datlioncnergy.vercel.app`<br/>**X-Title**: `Datlion Cnergy Plant OS` | 🟡 **MEDIUM** | Replace headers with `VITE_APP_URL` and dynamic application title. |
| **Gemini AI Proxy** | `api/gemini.ts`<br/>`api/slack-invoice.ts` | Uses `process.env.GEMINI_API_KEY` | 🟡 **MEDIUM** | Provision a dedicated Google Gemini API key for Bluamp. |
| **Slack Webhook Integrations** | `api/slack-daily-tasks.ts`<br/>`api/slack-invoice.ts`<br/>`api/slack-task-reminder.ts` | **Fallback App URL**: `https://inventory.cnergy.co.in`<br/>**Task Exclusions**: `t.assigned_to !== 'chitale'` | 🟡 **MEDIUM** | Parametrize app URL via `VITE_APP_URL` and clean out legacy employee exclusions. |
| **Brand Assets & Storage** | `components/Auth.tsx`<br/>`components/Header.tsx`<br/>`App.tsx` | Logo stored on Supabase bucket:<br/>`https://bfkxdpripwjxenfvwpfu.supabase.co/.../DC_Full_battery_black_bg.png` | 🟡 **MEDIUM** | Re-host logo on Bluamp's storage bucket or local `/public/logo.png`. |
| **Default User Management** | `components/UserManagement.tsx`<br/>`schema_employee_tasks.sql` | Hardcoded email protection:<br/>`if (user.username === 'datlioncnergy@gmail.com')`<br/>Seed users: `chitale`, `datlioncnergy@gmail.com` | 🟡 **MEDIUM** | Replace hardcoded email check with dynamic check; update SQL seed script. |
| **Database Row-Level Security** | `schema_employee_tasks.sql`<br/>`schema.sql`<br/>`schema_expenses.sql` | Permissive RLS policies (`Allow anonymous read/write/delete`) | 🔴 **HIGH** | Provision a fresh database instance and enforce authenticated RLS. |

---

## 2. Detailed Findings & File-by-File Analysis

### 2.1 Supabase Connection Fallbacks
- **Files**: `supabaseClient.ts`, `api/slack-daily-tasks.ts`, `api/slack-invoice.ts`, `api/get-shared-draft.ts`, `api/auth-migrate.ts`
- **Issue**:
  ```ts
  // supabaseClient.ts
  const supabaseUrl = getEnv('VITE_SUPABASE_URL') || "https://bfkxdpripwjxenfvwpfu.supabase.co";
  const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY') || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
  ```
- **Action Required**: Remove fallback strings so that missing environment variables trigger an explicit error rather than silently fallback to Datlion Cnergy's live database.

---

### 2.2 Email & Backup Service
- **Files**: `api/send-mail.js`, `api/backup.js`
- **Issue**:
  ```javascript
  // api/send-mail.js
  const allowedOrigins = ['https://inventory.cnergy.co.in', 'http://localhost:3000', 'http://localhost:5173'];
  user: process.env.GMAIL_USER || 'datlioncnergy@gmail.com'
  ```
- **Action Required**: 
  1. Remove hardcoded `'datlioncnergy@gmail.com'` fallbacks.
  2. Make `allowedOrigins` build dynamically from `process.env.VITE_APP_URL`.
  3. Set up a dedicated Gmail App Password or SMTP service for Bluamp Energies.

---

### 2.3 User Management Safeguards
- **File**: `components/UserManagement.tsx`
- **Issue** (Line 82):
  ```tsx
  if (user.username === 'datlioncnergy@gmail.com') {
    alert('The default admin account cannot be deleted.');
    return;
  }
  ```
- **Action Required**: Replace hardcoded email check with a generic admin role check or `process.env.VITE_ADMIN_EMAIL`.

---

### 2.4 SQL Seed Scripts & Task Seeds
- **File**: `schema_employee_tasks.sql`
- **Issue** (Lines 40–46):
  ```sql
  INSERT INTO employee_tasks (...)
  VALUES 
      ('task-seed-1', 'chitale', ...),
      ('task-seed-3', 'datlioncnergy@gmail.com', ...);
  ```
- **Action Required**: Update SQL seed scripts to use standard Bluamp sample users (e.g. `operator@bluamp.com`, `admin@bluamp.com`).

---

### 2.5 OpenRouter Proxy Headers
- **File**: `api/openrouter.ts`
- **Issue** (Lines 18–19):
  ```ts
  "HTTP-Referer": "https://datlioncnergy.vercel.app",
  "X-Title": "Datlion Cnergy Plant OS"
  ```
- **Action Required**: Update to `"HTTP-Referer": process.env.VITE_APP_URL` and `"X-Title": "Bluamp Plant OS"`.

---

## 3. Recommended Clean Environment Setup (`.env.example`)

Create a `.env.example` in the project root for Bluamp Energies:

```env
# ==========================================
# BLUAMP PLANT OS — ENVIRONMENT VARIABLES
# ==========================================

# 1. Supabase Database Configuration
VITE_SUPABASE_URL=https://your-bluamp-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_bluamp_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_bluamp_service_role_key_here

# 2. Application Domain
VITE_APP_URL=https://inventory.bluampenergies.com
APP_URL=https://inventory.bluampenergies.com

# 3. AI Assistant Services
GEMINI_API_KEY=your_gemini_api_key_here
OPENROUTER_API_KEY=your_openrouter_api_key_here

# 4. Email Notification Service (SMTP)
GMAIL_USER=notifications@bluampenergies.com
GMAIL_PASS=your_gmail_app_password_here
BACKUP_EMAIL=backups@bluampenergies.com
MAIL_API_SECRET=your_random_mail_secret_here

# 5. Slack Bot & Digest Webhooks
SLACK_WEBHOOK_URL_TO_DO=https://hooks.slack.com/services/YOUR/BLUAMP/WEBHOOK
CRON_SECRET=your_vercel_cron_secret_here
```

---

## 4. Step-by-Step Deployment Checklist for Bluamp Energies

- [ ] **Step 1: Database Setup**
  1. Create a new Supabase project under Bluamp Energies' account.
  2. Run `schema.sql`, `schema_employee_tasks.sql`, and `schema_expenses.sql` on the new database.
  3. Create an initial admin user in Supabase Auth (e.g., `admin@bluamp.com`).

- [ ] **Step 2: Environment Variables**
  1. Copy `.env.example` to `.env.local`.
  2. Populate all keys for the new Supabase instance, Gemini, OpenRouter, Gmail, and Slack.
  3. Configure matching environment variables in Vercel.

- [ ] **Step 3: Storage Buckets**
  1. In the new Supabase dashboard, create a public bucket named `Logo` (or `assets`).
  2. Upload the official Bluamp logo.

- [ ] **Step 4: Vercel Cron & Slack Integration**
  1. Link the repository to Bluamp's Vercel organization.
  2. Set `SLACK_WEBHOOK_URL_TO_DO` in Vercel project environment variables.
  3. Verify that Vercel Cron automatically triggers `/api/slack-daily-tasks` at 11:30 AM IST.

- [ ] **Step 5: Code Sanitation**
  1. Remove hardcoded fallbacks in `supabaseClient.ts`, `api/slack-daily-tasks.ts`, `api/slack-invoice.ts`, and `api/send-mail.js`.
  2. Verify all references to legacy company identity are removed.
