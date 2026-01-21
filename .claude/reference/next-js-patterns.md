# Next.js 15 Patterns & Best Practices

## App Router Architecture

### Directory Structure

```
app/
├── layout.tsx              # Root layout (auth, providers)
├── page.tsx                # Home page
├── middleware.ts           # Auth verification (at root level, not in app/)
├── api/
│   ├── auth/
│   │   ├── login/route.ts
│   │   ├── logout/route.ts
│   │   └── refresh/route.ts
│   ├── documents/
│   │   ├── route.ts        # GET (list), POST (create)
│   │   └── [id]/route.ts   # GET, DELETE
│   ├── search/
│   │   └── route.ts        # POST (hybrid search)
│   └── chat/
│       └── route.ts        # POST (Q&A with streaming)
├── admin/
│   ├── layout.tsx          # Admin layout (protected)
│   ├── documents/
│   │   ├── page.tsx        # Document management
│   │   └── upload/page.tsx # Upload form
│   └── (dashboard)/
│       └── page.tsx        # Admin dashboard
├── chat/
│   ├── layout.tsx          # Chat layout
│   └── page.tsx            # Chat interface
└── auth/
    ├── login/page.tsx
    ├── signup/page.tsx
    └── callback/route.ts
```

### Important Notes on Caching in Next.js 15

**Critical Change**: In Next.js 15, GET route handlers are **NOT cached by default** (changed from Next.js 14).

```typescript
// This is NOT cached automatically in Next.js 15
export async function GET(req: NextRequest) {
  // ...
}

// To cache, explicitly use cacheTime (or use fetch cache)
export const revalidate = 60; // Revalidate every 60 seconds

// Or use Response headers
export async function GET(req: NextRequest) {
  const response = await fetch(..., { cache: 'force-cache' });
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60',
    },
  });
}
```

## Route Handlers (API Routes)

### Basic Pattern

**File: `app/api/documents/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Request validation schema
const CreateDocumentSchema = z.object({
  filename: z.string().min(1),
  content: z.string().min(100),
});

// GET: List documents
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch from database
    const documents = await db.documents.findMany({
      where: { workspaceId: userWorkspace.id },
    });

    return NextResponse.json(documents);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

// POST: Create document
export async function POST(req: NextRequest) {
  try {
    // Auth
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Parse & validate request
    const body = await req.json();
    const { filename, content } = CreateDocumentSchema.parse(body);

    // Business logic
    const document = await db.documents.create({
      data: { filename, content, workspaceId: userWorkspace.id },
    });

    // Return 201 Created
    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}
```

### Dynamic Route Parameters

**File: `app/api/documents/[id]/route.ts`**

```typescript
interface RouteParams {
  params: { id: string };
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const document = await db.documents.findUnique({
      where: { id: params.id },
    });

    if (!document) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Verify ownership
    if (document.workspaceId !== userWorkspace.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(document);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const document = await db.documents.findUnique({
      where: { id: params.id },
    });

    if (!document) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Verify role
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.documents.delete({ where: { id: params.id } });

    // Return 204 No Content
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
```

### Streaming Responses

```typescript
// Streaming responses (for chat/real-time updates)
export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();

    // Create readable stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Call LLM with streaming
          const answerStream = await generateRAGAnswerStream({
            question,
            context,
          });

          for await (const token of answerStream) {
            controller.enqueue(encoder.encode(token));
          }

          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

### Request Body Limits

Next.js has a 4MB body size limit by default. For larger uploads, consider:

```typescript
// Increase body size limit (in middleware or API route)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb', // Increase limit for file uploads
    },
  },
};
```

## Middleware

**File: `middleware.ts` (at project root, not in app/)**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabasePublic } from '@/lib/db';

// Configure which routes middleware runs on
export const config = {
  matcher: [
    // Protect these routes
    '/admin/:path*',
    '/api/:path*',
    '/chat/:path*',

    // Exclude these
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Get session from Supabase Auth
  const {
    data: { session },
  } = await supabasePublic.auth.getSession();

  if (!session) {
    // Redirect to login if trying to access protected route
    if (pathname.startsWith('/admin') || pathname.startsWith('/chat')) {
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }
  }

  // Get user workspace & role from database
  const { data: user } = await supabasePublic
    .from('users')
    .select('workspace_id, role')
    .eq('id', session?.user.id)
    .single();

  // Verify admin access
  if (pathname.startsWith('/admin') && user?.role !== 'admin') {
    return NextResponse.redirect(new URL('/chat', req.url));
  }

  // Add user info to request headers (accessible in route handlers)
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-user-id', session?.user.id || '');
  requestHeaders.set('x-workspace-id', user?.workspace_id || '');
  requestHeaders.set('x-user-role', user?.role || '');

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}
```

## Server Components & Data Fetching

### Fetching in Server Components

```typescript
// app/admin/documents/page.tsx
import { supabaseAdmin } from '@/lib/db';

export default async function DocumentsPage() {
  // This runs on the server; safe to use service role
  const { data: documents } = await supabaseAdmin
    .from('documents')
    .select('*')
    .order('uploaded_at', { ascending: false });

  return (
    <div>
      {documents?.map(doc => (
        <DocumentCard key={doc.id} document={doc} />
      ))}
    </div>
  );
}
```

### Client-Side Data Fetching (Forms, Interactions)

```typescript
// app/admin/documents/upload/page.tsx
'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';

export function DocumentUploadForm() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleUpload(formData: FormData) {
    setLoading(true);
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      toast({ title: 'Success', description: 'Document uploaded' });
    } catch (error) {
      toast({ title: 'Error', description: 'Upload failed' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form action={handleUpload}>
      {/* Form fields */}
    </form>
  );
}
```

## Best Practices

### 1. **Lean Middleware**

Keep middleware lightweight—heavy logic belongs in route handlers:

```typescript
// BAD: Complex logic in middleware
export async function middleware(req: NextRequest) {
  const user = await complexUserValidation(); // Slow!
  const permissions = await checkPermissions(); // Slow!
  // ... lots of logic
}

// GOOD: Keep middleware minimal
export async function middleware(req: NextRequest) {
  const session = await getSession(); // Fast
  if (!session) return redirect('/login');
  // That's it. Complex logic goes in handlers.
}
```

### 2. **Error Handling Pattern**

```typescript
export async function POST(req: NextRequest) {
  try {
    // 1. Validate input
    const body = await req.json();
    const data = MySchema.parse(body);

    // 2. Check auth
    const userId = req.headers.get('x-user-id');
    if (!userId) return unauthorized();

    // 3. Business logic
    const result = await db.operation(data);

    // 4. Return result
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    // 5. Error handling
    if (error instanceof z.ZodError) return badRequest(error.errors);
    if (error instanceof AuthError) return unauthorized();
    return internalError();
  }
}

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function badRequest(details: unknown) {
  return NextResponse.json({ error: 'Bad request', details }, { status: 400 });
}

function internalError() {
  return NextResponse.json({ error: 'Internal error' }, { status: 500 });
}
```

### 3. **Environment Variable Validation**

**File: `env.ts`**

```typescript
import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  OPENAI_API_KEY: z.string(),
  OPENAI_MODEL: z.string().default('gpt-4'),
});

export const env = envSchema.parse(process.env);
```

Then import in your code:

```typescript
import { env } from '@/env';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
```

### 4. **Consistent Response Format**

```typescript
// Always return structured responses
type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };

export function success<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function error(message: string, status = 500) {
  return NextResponse.json({ success: false, error: message }, { status });
}

// Usage:
export async function GET(req: NextRequest) {
  try {
    const data = await fetch...();
    return success(data);
  } catch (error) {
    return error('Failed to fetch', 500);
  }
}
```

### 5. **Rate Limiting**

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 h'), // 10 requests per hour
});

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const { success } = await ratelimit.limit(userId);

  if (!success) {
    return error('Rate limit exceeded', 429);
  }

  // Process request...
}
```

## References

- [Getting Started: Route Handlers and Middleware | Next.js](https://nextjs.org/docs/15/app/getting-started/route-handlers-and-middleware)
- [Getting Started: Route Handlers | Next.js](https://nextjs.org/docs/app/getting-started/route-handlers)
- [Routing: Middleware | Next.js](https://nextjs.org/docs/14/app/building-your-application/routing/middleware)
- [Next.js 15: App Router — A Complete Senior-Level Guide](https://medium.com/@livenapps/next-js-15-app-router-a-complete-senior-level-guide-0554a2b820f7)
