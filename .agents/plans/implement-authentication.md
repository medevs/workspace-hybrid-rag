# Feature: User Authentication System

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Implement a complete authentication system using Supabase Auth with workspace selection at signup. Users can sign up with email/password, select their workspace from a pre-seeded list, and log in to access protected routes. The system creates user profiles in the database upon signup, enabling workspace-scoped access to documents and chat.

## User Story

As a new user
I want to sign up with my email and select a workspace
So that I can access the shared knowledge base with my team

As a returning user
I want to log in quickly
So that I can continue using the workspace's knowledge base

## Problem Statement

The application requires user identification and workspace assignment for multi-tenant data isolation. Currently, auth pages are placeholder stubs and the database has no tables. Users cannot sign up, log in, or access protected routes.

## Solution Statement

Implement a complete authentication flow:
1. Create database schema with workspaces and users tables
2. Build signup page with workspace dropdown using React Hook Form + Zod
3. Build login page with email/password form
4. Update auth callback to create user profiles with workspace_id
5. Implement logout functionality
6. Add Toaster for feedback notifications

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium
**Primary Systems Affected**: Database (migrations), Auth pages, Middleware, API callbacks
**Dependencies**: @supabase/ssr, react-hook-form, @hookform/resolvers, zod, sonner (toast)

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `lib/supabase/server.ts` (lines 1-27) - Why: Server-side Supabase client pattern to follow
- `lib/supabase/client.ts` (lines 1-8) - Why: Browser-side Supabase client pattern
- `lib/supabase/middleware.ts` (lines 1-45) - Why: Session management and protected route logic
- `middleware.ts` (lines 1-12) - Why: Current middleware setup
- `app/auth/callback/route.ts` (lines 1-19) - Why: Existing callback handler to extend
- `components/ui/form.tsx` (full file) - Why: shadcn Form component pattern with React Hook Form
- `components/ui/select.tsx` (full file) - Why: Select component for workspace dropdown
- `components/ui/button.tsx` (full file) - Why: Button component variants
- `components/ui/input.tsx` (full file) - Why: Input component styling
- `components/ui/card.tsx` (full file) - Why: Card component for form wrapper
- `components/ui/alert.tsx` (full file) - Why: Alert component for error messages
- `types/index.ts` (lines 1-14) - Why: Workspace and User type definitions
- `env.ts` (lines 1-18) - Why: Environment variable validation pattern
- `.claude/reference/supabase-setup.md` (full file) - Why: Database schema and RLS policies

### New Files to Create

**Database Migrations (in order):**
1. `supabase/migrations/20260121000001_enable_extensions.sql` - Enable pgvector and uuid-ossp
2. `supabase/migrations/20260121000002_create_tables.sql` - Create workspaces, users tables
3. `supabase/migrations/20260121000003_enable_rls.sql` - Enable RLS on tables
4. `supabase/migrations/20260121000004_create_rls_policies.sql` - RLS policies for workspace isolation
5. `supabase/migrations/20260121000005_seed_workspaces.sql` - Seed demo workspaces

**Application Files:**
6. `lib/validations/auth.ts` - Zod schemas for login/signup forms
7. `app/auth/signup/page.tsx` - Signup form with workspace selection (REPLACE existing stub)
8. `app/auth/login/page.tsx` - Login form (REPLACE existing stub)
9. `app/auth/signout/route.ts` - Sign out route handler
10. `app/layout.tsx` - Add Toaster provider (UPDATE existing)

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Supabase SSR with Next.js App Router](https://supabase.com/docs/guides/auth/server-side/nextjs)
  - Section: Setting up Server-Side Auth
  - Why: Official pattern for createServerClient with cookies

- [React Hook Form with Zod Resolver](https://react-hook-form.com/docs/useform#resolver)
  - Section: Schema Validation
  - Why: Form validation pattern with @hookform/resolvers

- [Supabase Auth signUp with metadata](https://supabase.com/docs/reference/javascript/auth-signup)
  - Section: Sign up with additional user metadata
  - Why: Passing workspace_id in user_metadata during signup

### Patterns to Follow

**Form Pattern (from components/ui/form.tsx):**
```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const formSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormValues = z.infer<typeof formSchema>;

function MyForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: FormValues) {
    // Handle submit
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
```

**Supabase Auth Pattern (signUp with metadata):**
```typescript
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${origin}/auth/callback`,
    data: {
      workspace_id: selectedWorkspaceId,
    },
  },
});
```

**Server-Side Client Pattern (from lib/supabase/server.ts):**
```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch { /* Server Component - ignore */ }
        },
      },
    }
  );
}
```

**Toast Notification Pattern (sonner):**
```tsx
import { toast } from 'sonner';

// Success
toast.success('Account created successfully');

// Error
toast.error('Failed to sign up');

// In layout.tsx
import { Toaster } from '@/components/ui/sonner';
// Add <Toaster /> in body
```

**Naming Conventions:**
- Types: PascalCase with suffix (LoginSchema, SignupFormValues)
- Files: kebab-case (auth-form.tsx, login-schema.ts)
- Zod schemas: camelCase with Schema suffix (loginSchema, signupSchema)
- Form components: PascalCase (LoginForm, SignupForm)

**Error Handling:**
```typescript
if (error) {
  console.error('Auth error:', error.message);
  toast.error(error.message || 'Authentication failed');
  return;
}
```

---

## IMPLEMENTATION PLAN

### Phase 1: Database Foundation

Create database schema with workspaces and users tables, RLS policies, and seed data.

**Tasks:**
- Write and apply migration for extensions (pgvector, uuid-ossp)
- Create workspaces and users tables
- Enable RLS on all tables
- Create RLS policies for workspace isolation
- Seed demo workspaces (Acme Corporation, TechStart Inc, Demo Workspace)

### Phase 2: Validation Schemas

Create Zod validation schemas for authentication forms.

**Tasks:**
- Create login schema (email, password)
- Create signup schema (email, password, workspace_id)

### Phase 3: Signup Implementation

Build signup page with workspace selection dropdown.

**Tasks:**
- Create signup page as client component
- Fetch workspaces from database on mount
- Build form with React Hook Form + Zod
- Implement Supabase signUp with workspace_id in metadata
- Handle success/error states with toast

### Phase 4: Login Implementation

Build login page with email/password form.

**Tasks:**
- Create login page as client component
- Build form with React Hook Form + Zod
- Implement Supabase signInWithPassword
- Handle success/error states with toast

### Phase 5: Auth Callback & User Profile

Update auth callback to create user profiles in database.

**Tasks:**
- Extend callback route to create user record
- Extract workspace_id from user_metadata
- Insert into users table with workspace association
- Handle existing user edge case

### Phase 6: Signout & Layout Updates

Add signout functionality and toast provider.

**Tasks:**
- Create signout route handler
- Add Toaster to root layout
- Verify middleware redirects work correctly

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### Task 1: CREATE `supabase/migrations/20260121000001_enable_extensions.sql`

- **IMPLEMENT**: Enable required PostgreSQL extensions
- **SQL**:
```sql
-- Enable pgvector for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable uuid-ossp for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```
- **VALIDATE**: Apply migration using Supabase MCP `apply_migration`

### Task 2: CREATE `supabase/migrations/20260121000002_create_tables.sql`

- **IMPLEMENT**: Create workspaces and users tables
- **PATTERN**: Follow schema from `.claude/reference/supabase-setup.md`
- **SQL**:
```sql
-- Workspaces table (pre-seeded, users select at signup)
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table (links to Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Foreign key index
CREATE INDEX idx_users_workspace ON users(workspace_id);
```
- **VALIDATE**: Apply migration, then verify with `list_tables`

### Task 3: CREATE `supabase/migrations/20260121000003_enable_rls.sql`

- **IMPLEMENT**: Enable Row-Level Security on tables
- **SQL**:
```sql
-- Enable RLS on workspaces
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Enable RLS on users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```
- **VALIDATE**: Apply migration

### Task 4: CREATE `supabase/migrations/20260121000004_create_rls_policies.sql`

- **IMPLEMENT**: Create RLS policies for workspace isolation
- **SQL**:
```sql
-- Workspaces: Anyone can view (for signup dropdown)
CREATE POLICY "Anyone can view workspaces"
  ON workspaces FOR SELECT
  USING (true);

-- Users: Can view members of their workspace
CREATE POLICY "Users can view workspace members"
  ON users FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM users WHERE id = auth.uid()));

-- Users: Can insert own profile during signup
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());
```
- **VALIDATE**: Apply migration

### Task 5: CREATE `supabase/migrations/20260121000005_seed_workspaces.sql`

- **IMPLEMENT**: Seed demo workspaces
- **SQL**:
```sql
-- Insert demo workspaces
INSERT INTO workspaces (id, name) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Acme Corporation'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'TechStart Inc'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Demo Workspace');
```
- **VALIDATE**: Apply migration, then verify with `execute_sql` SELECT query

### Task 6: CREATE `lib/validations/auth.ts`

- **IMPLEMENT**: Zod validation schemas for auth forms
- **IMPORTS**: `import { z } from 'zod';`
- **CODE**:
```typescript
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(72, 'Password must be less than 72 characters'),
  workspaceId: z.string().uuid('Please select a workspace'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type SignupFormValues = z.infer<typeof signupSchema>;
```
- **VALIDATE**: `pnpm type-check`

### Task 7: UPDATE `app/layout.tsx`

- **IMPLEMENT**: Add Toaster provider for notifications
- **IMPORTS**: Add `import { Toaster } from '@/components/ui/sonner';`
- **UPDATE**: Add `<Toaster />` inside body, after `{children}`
- **CODE**:
```tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Workspace RAG',
  description: 'Multi-tenant RAG system with hybrid search',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
```
- **VALIDATE**: `pnpm type-check`

### Task 8: REPLACE `app/auth/signup/page.tsx`

- **IMPLEMENT**: Complete signup form with workspace selection
- **PATTERN**: Use Form component pattern from `components/ui/form.tsx`
- **IMPORTS**:
```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { signupSchema, type SignupFormValues } from '@/lib/validations/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Workspace } from '@/types';
```
- **GOTCHA**: Must be client component (`'use client'`) for form interactivity
- **GOTCHA**: Fetch workspaces using browser client, not server client
- **VALIDATE**: `pnpm type-check && pnpm lint`

### Task 9: REPLACE `app/auth/login/page.tsx`

- **IMPLEMENT**: Complete login form with email/password
- **PATTERN**: Use Form component pattern from `components/ui/form.tsx`
- **IMPORTS**: Similar to signup but using `loginSchema`
- **CODE**: Use `signInWithPassword` from Supabase Auth
- **GOTCHA**: Must be client component
- **GOTCHA**: Handle redirect after successful login
- **VALIDATE**: `pnpm type-check && pnpm lint`

### Task 10: UPDATE `app/auth/callback/route.ts`

- **IMPLEMENT**: Create user profile after email verification
- **PATTERN**: Use server client from `lib/supabase/server.ts`
- **CODE**:
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/chat';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Create user profile if it doesn't exist
      const workspaceId = data.user.user_metadata?.workspace_id;

      if (workspaceId) {
        const { error: profileError } = await supabase
          .from('users')
          .upsert(
            {
              id: data.user.id,
              email: data.user.email!,
              workspace_id: workspaceId,
            },
            { onConflict: 'id' }
          );

        if (profileError) {
          console.error('Error creating user profile:', profileError);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=Could not authenticate`);
}
```
- **GOTCHA**: Use `upsert` with `onConflict: 'id'` to handle existing users
- **VALIDATE**: `pnpm type-check`

### Task 11: CREATE `app/auth/signout/route.ts`

- **IMPLEMENT**: Sign out route handler
- **PATTERN**: Use server client pattern
- **CODE**:
```typescript
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  // Check if user is logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await supabase.auth.signOut();
  }

  revalidatePath('/', 'layout');
  return NextResponse.redirect(new URL('/auth/login', req.url), {
    status: 302,
  });
}
```
- **VALIDATE**: `pnpm type-check`

### Task 12: UPDATE `lib/supabase/middleware.ts`

- **IMPLEMENT**: Add redirect for authenticated users on auth pages
- **UPDATE**: Add logic to redirect authenticated users away from login/signup
- **CODE**: After getting user, add:
```typescript
// Redirect authenticated users away from auth pages
const authPaths = ['/auth/login', '/auth/signup'];
const isAuthPath = authPaths.some((path) =>
  request.nextUrl.pathname.startsWith(path)
);

if (isAuthPath && user) {
  const url = request.nextUrl.clone();
  url.pathname = '/chat';
  return NextResponse.redirect(url);
}
```
- **VALIDATE**: `pnpm type-check`

---

## TESTING STRATEGY

### Unit Tests

No complex business logic requiring unit tests in this feature. Form validation is handled by Zod schemas which are type-checked.

### Integration Tests

**E2E Test (via Playwright MCP):**
1. Navigate to `/auth/signup`
2. Verify workspace dropdown loads with 3 workspaces
3. Fill form with valid email/password
4. Select workspace
5. Submit form
6. Verify redirect to `/chat` or email confirmation message

### Edge Cases

- [ ] Empty workspace dropdown (database empty)
- [ ] Invalid email format
- [ ] Password too short
- [ ] Duplicate email signup
- [ ] Network error during signup
- [ ] Session expiry during navigation
- [ ] Already authenticated user accessing login page

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
pnpm type-check
pnpm lint
```

### Level 2: Build Verification

```bash
pnpm build
```

### Level 3: Database Validation

Using Supabase MCP:
- `list_tables` - Verify workspaces, users tables exist
- `execute_sql` with `SELECT * FROM workspaces` - Verify seed data
- `get_advisors` with type `security` - Check for RLS issues

### Level 4: Manual Validation

1. Start dev server: `pnpm dev`
2. Navigate to `http://localhost:3000/auth/signup`
3. Verify:
   - Workspace dropdown shows 3 options
   - Form validation works (try empty submit)
   - Submit creates account (check email or Supabase dashboard)
4. Navigate to `http://localhost:3000/auth/login`
5. Verify:
   - Can log in with created account
   - Redirects to `/chat` after login
6. Test signout (add temporary signout button or call via API)

---

## ACCEPTANCE CRITERIA

- [x] Database schema created with workspaces and users tables
- [ ] RLS policies enforce workspace isolation
- [ ] Signup page shows workspace dropdown with 3 pre-seeded options
- [ ] Signup form validates email format and password length
- [ ] Successful signup creates user in Supabase Auth with workspace_id in metadata
- [ ] Auth callback creates user profile in users table
- [ ] Login page authenticates with email/password
- [ ] Successful login redirects to /chat
- [ ] Signout clears session and redirects to login
- [ ] Authenticated users cannot access login/signup pages
- [ ] Unauthenticated users cannot access /chat or /documents
- [ ] Toast notifications show success/error feedback
- [ ] All validation commands pass with zero errors

---

## COMPLETION CHECKLIST

- [ ] All migrations applied successfully
- [ ] All tasks completed in order
- [ ] `pnpm type-check` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm build` succeeds
- [ ] Manual testing confirms:
  - [ ] Signup flow works end-to-end
  - [ ] Login flow works end-to-end
  - [ ] Protected routes redirect unauthenticated users
  - [ ] Auth pages redirect authenticated users
- [ ] Security advisor shows no critical issues

---

## NOTES

### Design Decisions

1. **Client Components for Auth Pages**: Signup and login pages must be client components because they use React Hook Form and need browser-side state management for form handling.

2. **Workspace Selection at Signup**: Users select workspace during signup (stored in user_metadata), not after. This simplifies the flow and ensures workspace assignment happens before any data access.

3. **User Profile Creation in Callback**: The user profile (in `users` table) is created in the auth callback, not during signup. This ensures the user is verified before creating the profile.

4. **Upsert for Profile**: Using `upsert` with `onConflict: 'id'` handles the case where a user signs up again or the callback is called multiple times.

5. **No Email Verification for MVP**: For faster testing, you may want to disable email confirmation in Supabase Auth settings. Remember to re-enable for production.

### Security Considerations

- RLS policies ensure users can only access their workspace's data
- Passwords are handled by Supabase Auth (never stored in our tables)
- Service role key is only used server-side
- Session tokens are stored in HTTP-only cookies via @supabase/ssr

### Future Enhancements

- OAuth providers (Google, GitHub)
- Password reset flow
- Email change flow
- Workspace creation by users
- Invite users to workspace
