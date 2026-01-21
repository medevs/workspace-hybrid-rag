# Initialize Project

Initialize the Workspace-Based RAG Application from scratch. This creates the Next.js app, installs all dependencies, sets up the folder structure, and creates placeholder files. No features are implemented - only scaffolding.

---

## Package Versions Reference (January 2026)

All packages below are tested for compatibility with each other.

### Framework & Runtime

| Package | Version | Notes |
|---------|---------|-------|
| Next.js | 15.3.x | Latest stable LTS with webpack |
| React | 19.0.0 | Bundled with Next.js 15 |
| React DOM | 19.0.0 | Bundled with Next.js 15 |
| TypeScript | 5.7.x | Bundled with Next.js 15 |
| Tailwind CSS | 3.4.x | Production-stable version |
| Node.js | 20+ | Required minimum |

### Core Dependencies

| Package | Version | Notes |
|---------|---------|-------|
| @supabase/supabase-js | ^2.90.0 | Supabase client (requires Node 20+) |
| @supabase/ssr | ^0.8.0 | Server-side auth helpers |
| openai | ^6.16.0 | OpenAI API SDK |
| zod | ^4.3.0 | Schema validation (Zod 4 stable) |
| react-hook-form | ^7.71.0 | Form handling |
| @hookform/resolvers | ^5.0.0 | Zod resolver with type inference |

### UI Dependencies

| Package | Version | Notes |
|---------|---------|-------|
| class-variance-authority | ^0.7.1 | Component variants |
| clsx | ^2.1.1 | Class name utility |
| tailwind-merge | ^2.6.0 | Tailwind v3 compatible |
| lucide-react | ^0.469.0 | Icons (stable release) |

### Dev Dependencies

| Package | Version | Notes |
|---------|---------|-------|
| vitest | ^2.1.0 | Unit testing (production stable) |
| @vitejs/plugin-react | ^4.3.0 | Vitest React support |
| jsdom | ^25.0.0 | DOM testing environment |
| @testing-library/react | ^16.1.0 | React testing utilities |
| @testing-library/dom | ^10.4.0 | DOM testing utilities |
| @testing-library/jest-dom | ^6.6.0 | Jest DOM matchers for Vitest |

---

## Phase 1: Create Next.js Application

### 1.1 Create Next.js App

```bash
pnpm create next-app@15 . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
```

Options:
- TypeScript: Yes
- Tailwind CSS: Yes (v3.4)
- ESLint: Yes
- App Router: Yes
- src/ directory: No (use root app/)
- Import alias: @/*

This installs:
- next@15.3.x
- react@19.0.0
- react-dom@19.0.0
- typescript@5.7.x
- tailwindcss@3.4.x

### 1.2 Verify Installation

```bash
pnpm type-check
```

---

## Phase 2: Install Dependencies

### 2.1 Core Dependencies

```bash
pnpm add @supabase/supabase-js@^2.90.0 @supabase/ssr@^0.8.0 openai@^6.16.0 zod@^4.3.0 react-hook-form@^7.71.0 @hookform/resolvers@^5.0.0
```

| Package | Version | Purpose |
|---------|---------|---------|
| @supabase/supabase-js | ^2.90.0 | Supabase client |
| @supabase/ssr | ^0.8.0 | Server-side auth helpers |
| openai | ^6.16.0 | OpenAI API SDK |
| zod | ^4.3.0 | Schema validation |
| react-hook-form | ^7.71.0 | Form handling |
| @hookform/resolvers | ^5.0.0 | Zod resolver for forms |

### 2.2 UI Dependencies

```bash
pnpm add class-variance-authority@^0.7.1 clsx@^2.1.1 tailwind-merge@^2.6.0 lucide-react@^0.469.0
```

| Package | Version | Purpose |
|---------|---------|---------|
| class-variance-authority | ^0.7.1 | Component variants |
| clsx | ^2.1.1 | Class name utility |
| tailwind-merge | ^2.6.0 | Tailwind class merging (v3 compatible) |
| lucide-react | ^0.469.0 | Icons |

### 2.3 Dev Dependencies

```bash
pnpm add -D vitest@^2.1.0 @vitejs/plugin-react@^4.3.0 jsdom@^25.0.0 @testing-library/react@^16.1.0 @testing-library/dom@^10.4.0 @testing-library/jest-dom@^6.6.0
```

| Package | Version | Purpose |
|---------|---------|---------|
| vitest | ^2.1.0 | Unit testing |
| @vitejs/plugin-react | ^4.3.0 | Vitest React support |
| jsdom | ^25.0.0 | DOM testing environment |
| @testing-library/react | ^16.1.0 | React testing utilities |
| @testing-library/dom | ^10.4.0 | DOM testing utilities |
| @testing-library/jest-dom | ^6.6.0 | Jest DOM matchers |

**Note:** E2E testing uses the Playwright MCP server (not the Playwright npm package).

---

## Phase 3: Configure shadcn/ui

### 3.1 Initialize shadcn/ui

```bash
pnpm dlx shadcn@latest init -d
```

When prompted, select:
- Style: Default
- Base color: Neutral
- CSS variables: Yes

### 3.2 Install Essential Components

```bash
pnpm dlx shadcn@latest add button card input label textarea select form toast alert badge separator scroll-area dropdown-menu avatar skeleton
```

---

## Phase 4: Create Folder Structure

### 4.1 Create Directories

```bash
mkdir -p app/api/documents
mkdir -p app/api/chat
mkdir -p app/auth/login
mkdir -p app/auth/signup
mkdir -p app/auth/callback
mkdir -p app/documents
mkdir -p app/chat
mkdir -p components/features
mkdir -p lib/supabase
mkdir -p types
mkdir -p supabase/migrations
mkdir -p tests/unit
mkdir -p tests/integration
```

### 4.2 Directory Structure Reference

```
hybrid-workspace-based-rag/
├── app/
│   ├── layout.tsx              # Root layout (created by Next.js)
│   ├── page.tsx                # Landing page (created by Next.js)
│   ├── globals.css             # Global styles (created by Next.js)
│   ├── api/
│   │   ├── documents/
│   │   │   └── route.ts        # Document upload endpoint
│   │   └── chat/
│   │       └── route.ts        # RAG chat endpoint
│   ├── auth/
│   │   ├── login/
│   │   │   └── page.tsx        # Login page
│   │   ├── signup/
│   │   │   └── page.tsx        # Signup page
│   │   └── callback/
│   │       └── route.ts        # Auth callback handler
│   ├── documents/
│   │   ├── layout.tsx          # Protected layout
│   │   └── page.tsx            # Document management page
│   └── chat/
│       ├── layout.tsx          # Protected layout
│       └── page.tsx            # Chat interface
├── components/
│   ├── ui/                     # shadcn/ui components (auto-generated)
│   └── features/               # Feature-specific components
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Browser Supabase client
│   │   ├── server.ts           # Server Supabase client
│   │   └── middleware.ts       # Middleware Supabase client
│   ├── utils.ts                # Utility functions (created by shadcn)
│   ├── db.ts                   # Database utilities
│   ├── auth.ts                 # Auth utilities
│   ├── embeddings.ts           # OpenAI embeddings
│   ├── chunking.ts             # Text chunking
│   ├── search.ts               # Hybrid search (semantic + keyword + RRF)
│   └── chat.ts                 # RAG pipeline
├── types/
│   └── index.ts                # Shared TypeScript types
├── supabase/
│   └── migrations/             # Database migrations
├── tests/
│   ├── unit/                   # Vitest unit tests
│   └── integration/            # Vitest integration tests
├── middleware.ts               # Next.js auth middleware
├── env.ts                      # Zod environment validation
├── .env.local.example          # Environment template
└── vitest.config.ts            # Vitest configuration
```

**Note:** E2E tests are run via the Playwright MCP server, not stored locally.

---

## Phase 5: Create Configuration Files

### 5.1 Environment Template (.env.local.example)

Create `.env.local.example`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=sk-your-openai-key
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5.2 Environment Validation (env.ts)

Create `env.ts`:

```typescript
import { z } from 'zod';

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // OpenAI
  OPENAI_API_KEY: z.string().startsWith('sk-'),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),

  // Application
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
});

export const env = envSchema.parse(process.env);
```

### 5.3 Vitest Configuration (vitest.config.ts)

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

### 5.4 Vitest Setup (tests/setup.ts)

Create `tests/setup.ts`:

```typescript
import '@testing-library/jest-dom/vitest';
```

### 5.5 Update package.json Scripts

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

---

## Phase 6: Create Placeholder Files

### 6.1 TypeScript Types (types/index.ts)

Create `types/index.ts`:

```typescript
// Workspace
export interface Workspace {
  id: string;
  name: string;
  created_at: string;
}

// User
export interface User {
  id: string;
  workspace_id: string;
  email: string;
  created_at: string;
}

// Document
export interface Document {
  id: string;
  workspace_id: string;
  filename: string;
  content_type: string | null;
  file_size: number | null;
  created_by: string | null;
  created_at: string;
}

// Chunk
export interface Chunk {
  id: string;
  document_id: string;
  workspace_id: string;
  text: string;
  chunk_order: number;
  created_at: string;
}

// Search Result
export interface SearchResult {
  chunk_id: string;
  document_id: string;
  text: string;
  chunk_order: number;
  score: number;
  source: 'semantic' | 'keyword' | 'hybrid';
  filename?: string;
}

// Chat Message
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: { filename: string; excerpt: string }[];
}

// API Response Types
export interface ApiError {
  error: string;
  code: string;
}

export interface DocumentUploadResponse {
  documentId: string;
  filename: string;
  chunks: number;
  message: string;
}
```

### 6.2 Supabase Clients

Create `lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

Create `lib/supabase/server.ts`:

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
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component - ignore
          }
        },
      },
    }
  );
}
```

Create `lib/supabase/middleware.ts`:

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes
  const protectedPaths = ['/chat', '/documents'];
  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
```

### 6.3 Middleware (middleware.ts)

Create `middleware.ts` in project root:

```typescript
import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

### 6.4 Placeholder Lib Files

Create empty placeholder files for future implementation:

Create `lib/db.ts`:

```typescript
// Database utilities - to be implemented
export {};
```

Create `lib/auth.ts`:

```typescript
// Auth utilities - to be implemented
export {};
```

Create `lib/embeddings.ts`:

```typescript
// OpenAI embeddings - to be implemented
export {};
```

Create `lib/chunking.ts`:

```typescript
// Text chunking - to be implemented
export {};
```

Create `lib/search.ts`:

```typescript
// Hybrid search (semantic + keyword + RRF) - to be implemented
export {};
```

Create `lib/chat.ts`:

```typescript
// RAG pipeline - to be implemented
export {};
```

### 6.5 Placeholder Route Files

Create `app/api/documents/route.ts`:

```typescript
import { NextResponse } from 'next/server';

export async function POST() {
  // Document upload - to be implemented
  return NextResponse.json(
    { error: 'Not implemented', code: 'NOT_IMPLEMENTED' },
    { status: 501 }
  );
}

export async function GET() {
  // List documents - to be implemented
  return NextResponse.json(
    { error: 'Not implemented', code: 'NOT_IMPLEMENTED' },
    { status: 501 }
  );
}
```

Create `app/api/chat/route.ts`:

```typescript
import { NextResponse } from 'next/server';

export async function POST() {
  // RAG chat - to be implemented
  return NextResponse.json(
    { error: 'Not implemented', code: 'NOT_IMPLEMENTED' },
    { status: 501 }
  );
}
```

Create `app/auth/callback/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/chat';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=Could not authenticate`);
}
```

### 6.6 Placeholder Page Files

Create `app/auth/login/page.tsx`:

```typescript
export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Login</h1>
        <p className="text-muted-foreground">To be implemented</p>
      </div>
    </div>
  );
}
```

Create `app/auth/signup/page.tsx`:

```typescript
export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Sign Up</h1>
        <p className="text-muted-foreground">To be implemented</p>
      </div>
    </div>
  );
}
```

Create `app/documents/layout.tsx`:

```typescript
export default function DocumentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
```

Create `app/documents/page.tsx`:

```typescript
export default function DocumentsPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold">Documents</h1>
      <p className="text-muted-foreground">To be implemented</p>
    </div>
  );
}
```

Create `app/chat/layout.tsx`:

```typescript
export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
```

Create `app/chat/page.tsx`:

```typescript
export default function ChatPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold">Chat</h1>
      <p className="text-muted-foreground">To be implemented</p>
    </div>
  );
}
```

---

## Phase 7: Update Landing Page

### 7.1 Update Root Layout (app/layout.tsx)

Update `app/layout.tsx`:

```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
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
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

### 7.2 Update Landing Page (app/page.tsx)

Update `app/page.tsx`:

```typescript
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted">
      <div className="container flex flex-col items-center justify-center gap-6 px-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Workspace RAG
        </h1>
        <p className="max-w-[600px] text-lg text-muted-foreground">
          A multi-tenant Retrieval-Augmented Generation system. Upload documents,
          build your knowledge base, and ask questions with AI-powered answers.
        </p>
        <div className="flex gap-4">
          <Button asChild size="lg">
            <Link href="/auth/login">Login</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/auth/signup">Sign Up</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
```

---

## Phase 8: Create Test Placeholder

### 8.1 Unit Test Example (tests/unit/example.test.ts)

Create `tests/unit/example.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

describe('Example', () => {
  it('should pass', () => {
    expect(true).toBe(true);
  });
});
```

**Note:** E2E tests are run via the Playwright MCP server, not stored as local test files.

---

## Phase 9: Final Validation

### 9.1 Install Any Missing Peer Dependencies

```bash
pnpm install
```

### 9.2 Run Validation Checks

```bash
# Type check
pnpm type-check

# Lint
pnpm lint

# Build
pnpm build

# Run unit tests
pnpm test run

# Test dev server starts (optional)
pnpm dev
```

---

## Summary

After running this initialization:

- **Next.js 15.3.x** app with **React 19**, **TypeScript 5.7**, and **Tailwind CSS 3.4** (production-stable stack)
- All dependencies installed with compatible versions:
  - Supabase: @supabase/supabase-js@2.90.x, @supabase/ssr@0.8.x
  - OpenAI: openai@6.16.x
  - Validation: zod@4.3.x, react-hook-form@7.71.x, @hookform/resolvers@5.x
  - UI: shadcn/ui with lucide-react@0.469.x
  - Testing: vitest@2.1.x, @testing-library/react@16.1.x
- Complete folder structure created
- Placeholder files for all features
- Supabase clients configured (browser, server, middleware)
- Auth middleware set up
- Simple landing page with login/signup links
- Unit test infrastructure ready (Vitest 2.1 - production stable)
- E2E testing via Playwright MCP server (no local package)
- Environment template created

**Next Steps:**
1. Copy `.env.local.example` to `.env.local` and fill in credentials
2. Create Supabase project and get credentials
3. Run database migrations
4. Implement authentication features
5. Implement document upload features
6. Implement RAG chat features
