# Pennywise — AI-Powered Personal Expense Tracker

A mobile-only, AI-powered personal finance management application built with Next.js 15, TypeScript, Tailwind CSS, and Supabase.

Pennywise brings financial management to life with physical receipt OCR extraction powered by Gemini 2.5 Flash, Bklit UI charts for expense analytics, savings goal target tracking, multi-account management, and full multi-user authentication with strict Row Level Security (RLS).

---

## Architecture & Features

### 1. Mobile-First Experience
- **Viewport Frame**: Centered responsive viewport (360px – 430px) on desktop screens with native mobile edge-to-edge rendering on real mobile devices.
- **Micro-Interactions**: Page transition animations (`animate-pageEnter`), smooth loading skeletons, springy tab transitions, and accessible feedback toasts.
- **Offline & Cloud Sync**: Seamlessly transitions between Supabase cloud synchronization and local isolated workspaces.

### 2. Physical Receipt Scanning & Intelligence
- **Camera & File Capture**: Real-time camera viewfinder with device camera permission handling and image upload fallback.
- **Multimodal AI Processing**: Extract merchant name, transaction date, total amount, itemized line items, tax breakdowns, and suggested expense categories via Google Gemini 2.5 Flash (`/api/receipts/scan`).
- **Duplicate Detection**: Computes SHA-256 cryptographic hashes over receipt images to alert users before logging duplicate expenses.

### 3. Expense Analytics with Bklit UI
- **Interactive Area Chart**: Daily and monthly spending trends with responsive aspect ratio (2.6:1 on compact screens, 4:1 on standard mobile viewports) and interactive range selection scrubbing.
- **Synchronized Donut Chart**: Category spending distribution with center total summary and interactive legend hover synchronization.
- **Indian Rupee (INR) Formatting**: Standardized Indian financial formatting (`₹1,23,456.78`).

### 4. Savings Goals & Accounts Management
- **Goal Tracking**: Visual progress bars, target date projections, manual contributions, and recurring automation schedules (Daily, Weekly, Bi-weekly, Monthly).
- **Accounts**: Multi-account ledger (Salary, Savings, Cash, Personal, Credit Card) with balance tracking, real-time recalculation, and deletion protection.

---

## Authentication & Database Security

Pennywise features real Supabase multi-user authentication and database isolation:

### Auth Architecture
- **Server-Side Session Management**: Powered by `@supabase/ssr` with Next.js 15 awaitable `cookies()`.
- **Edge Route Protection**: `src/middleware.ts` automatically refreshes access tokens and enforces route guards:
  - Root `/` redirects to `/dashboard` for logged-in users, or `/login` for guests.
  - `/dashboard` requires an active session; unauthenticated requests are redirected to `/login?next=/dashboard`.
  - `/login` and `/signup` automatically redirect authenticated users to `/dashboard`.
- **Dedicated Auth Pages**:
  - `/login`: Email & password sign-in with remember-me, loading states, and error alerts.
  - `/signup`: Registration with full name, email, password validation (min 8 chars, numbers, letters), and currency selector.
  - `/forgot-password`: Password reset request triggering an email magic link.
  - `/reset-password`: Set new password via verified session link.
  - `/auth/callback`: Next.js Route Handler exchanging auth verification codes for user sessions.

### Multi-User Row Level Security (RLS)
The database migration (`supabase/migrations/20261103000002_multi_user_auth_and_rls.sql`) implements:
1. **Automated Profile Provisioning**: A PostgreSQL trigger on `auth.users` calls `public.handle_new_user()` on signup to generate a corresponding `public.profiles` entry.
2. **Strict RLS Policies**: Row Level Security is enabled on all 9 tables:
   - `profiles` (`auth.uid() = id`)
   - `accounts` (`auth.uid() = user_id`)
   - `transactions` (`auth.uid() = user_id`)
   - `receipts` (`auth.uid() = user_id`)
   - `receipt_items` (scoped through receipt ownership: `EXISTS (SELECT 1 FROM receipts WHERE receipts.id = receipt_items.receipt_id AND receipts.user_id = auth.uid())`)
   - `categories` (accessible to the owning user or system defaults)
   - `savings_goals` (`auth.uid() = user_id`)
   - `goal_contributions` (`auth.uid() = user_id`)
   - `recurring_contributions` (`auth.uid() = user_id`)
3. **Data Integrity**: Foreign key cascade rules and composite unique constraints (`uq_accounts_id_user_id`, `uq_goals_id_user_id`, `uq_recurring_id_user_id`) ensure transactions and contributions cannot reference accounts or goals belonging to another user.

---

## Environment Variables

Create a `.env` file in the project root with the following keys:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1Ni...

# Supabase Server-Only Secret Key (NEVER expose to the client)
SUPABASE_SECRET_KEY=sb_secret_...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1Ni...

# Google Gemini API (for AI Receipt Scanning & OCR)
GEMINI_API_KEY=AIzaSy...
```

> **Note**: Pennywise supports both Supabase's modern key format (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY`) and standard legacy keys (`NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`).

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Apply Database Migrations
Execute the migrations against your Supabase project in order:
1. `supabase/migrations/20261103000001_pennywise_schema.sql` (Tables & initial schema)
2. `supabase/migrations/20261103000002_multi_user_auth_and_rls.sql` (Multi-user auth trigger, composite constraints, and strict RLS policies)

You can run these directly via the **Supabase Dashboard SQL Editor** or using the Supabase CLI:
```bash
supabase db push
```

### 3. Run Typecheck & Unit Tests
```bash
# Verify TypeScript compilation (0 errors)
npm run typecheck

# Run unit tests (16 tests covering charts, money formatting, and state invariants)
npm test
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your mobile device or browser.

---

## Deploying to Vercel

Pennywise is fully optimized for single-click deployment on [Vercel](https://vercel.com):

1. **Push to GitHub**:
   Ensure your repository is committed and pushed to GitHub or GitLab.

2. **Import Project to Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New... > Project**.
   - Select your Pennywise repository.
   - Framework Preset: **Next.js** (automatically detected).
   - Root Directory: `./`

3. **Configure Environment Variables**:
   In the Vercel project deployment settings, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`)
   - `GEMINI_API_KEY`

4. **Configure Supabase Auth Redirect URLs**:
   In your Supabase project dashboard under **Authentication > URL Configuration**:
   - **Site URL**: `https://<your-project>.vercel.app`
   - **Redirect URLs**:
     - `https://<your-project>.vercel.app/**`
     - `https://<your-project>.vercel.app/auth/callback`
     - `http://localhost:3000/**` (for local development)

5. **Deploy**:
   Click **Deploy**. Next.js will build all pages statically and dynamically with full edge middleware routing.

---

## Production Build Verification

```bash
npm run build
```

Production build output:
```
Route (app)                                 Size  First Load JS
┌ ƒ /                                      131 B         103 kB
├ ○ /_not-found                             1 kB         104 kB
├ ƒ /api/receipts/scan                     131 B         103 kB
├ ƒ /auth/callback                         131 B         103 kB
├ ƒ /dashboard                            161 kB         360 kB
├ ○ /forgot-password                     2.33 kB         201 kB
├ ƒ /login                               2.68 kB         202 kB
├ ○ /reset-password                      2.93 kB         202 kB
└ ƒ /signup                              3.54 kB         203 kB
+ First Load JS shared by all             103 kB
ƒ Middleware                             94.1 kB
```

