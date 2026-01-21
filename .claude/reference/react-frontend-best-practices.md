# React Frontend Best Practices for RAG (Next.js + shadcn/ui)

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Component Architecture](#2-component-architecture)
3. [shadcn/ui Integration](#3-shadcnui-integration)
4. [Forms & Validation](#4-forms--validation)
5. [State Management](#5-state-management)
6. [Client-Side Data Fetching](#6-client-side-data-fetching)
7. [Styling with Tailwind](#7-styling-with-tailwind)
8. [Performance Optimization](#8-performance-optimization)
9. [Error Handling & Loading States](#9-error-handling--loading-states)
10. [Testing Components](#10-testing-components)
11. [Accessibility](#11-accessibility)
12. [Anti-Patterns](#12-anti-patterns)

---

## 1. Project Structure

### Feature-Based Structure (Next.js App Router)

```
app/
├── components/
│   ├── ui/                          # shadcn/ui components (owned, not installed)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   └── ...
│   └── features/
│       ├── admin-document-upload/   # Feature: Document upload
│       │   ├── DocumentUploadForm.tsx
│       │   ├── DocumentList.tsx
│       │   └── useDocuments.ts
│       ├── chat-interface/          # Feature: Q&A chat
│       │   ├── ChatWindow.tsx
│       │   ├── ChatInput.tsx
│       │   ├── MessageList.tsx
│       │   └── useChat.ts
│       └── search/                  # Feature: Hybrid search
│           ├── SearchResults.tsx
│           └── useSearch.ts
├── lib/
│   ├── utils.ts                     # Utility functions
│   ├── api-client.ts                # API fetch wrapper
│   └── validators.ts                # Zod schemas
├── types/
│   └── index.ts                     # Shared types
├── hooks/
│   └── useAuth.ts                   # Auth hook
└── middleware.ts                    # Auth verification
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `ChatWindow.tsx` |
| Hooks | camelCase, `use` prefix | `useChat.ts` |
| Types/Interfaces | PascalCase | `ChatMessage` |
| Utilities | camelCase | `formatDate.ts` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_CHUNK_SIZE` |

---

## 2. Component Architecture

### Server Components (Default in Next.js 15)

```typescript
// app/admin/documents/page.tsx
import { supabaseAdmin } from '@/lib/db';

export default async function DocumentsPage() {
  // This runs on server at build time or request time
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

**Benefits**:
- Direct database access (no API route needed)
- Secrets safe from client
- Reduced JavaScript sent to browser

### Client Components (for Interactivity)

```typescript
// app/admin/documents/upload/DocumentUploadForm.tsx
'use client';  // This is a client component

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/useToast';

export function DocumentUploadForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  async function handleUpload(formData: FormData) {
    setIsLoading(true);
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');
      toast({ title: 'Success', description: 'Document uploaded' });
    } catch (error) {
      toast({ title: 'Error', description: String(error) });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form action={handleUpload}>
      {/* Form content */}
    </form>
  );
}
```

### Component Composition Pattern

```typescript
// app/chat/page.tsx
'use client';

import { ChatWindow } from '@/components/features/chat-interface/ChatWindow';
import { MessageList } from '@/components/features/chat-interface/MessageList';
import { ChatInput } from '@/components/features/chat-interface/ChatInput';

export default function ChatPage() {
  return (
    <ChatWindow>
      <MessageList />
      <ChatInput />
    </ChatWindow>
  );
}
```

---

## 3. shadcn/ui Integration

### How shadcn/ui Works

shadcn/ui is **not a package manager**—it's a collection of copy-paste components. You own them:

```bash
# Copy a component from shadcn/ui registry
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add card
```

### Common shadcn/ui Components for RAG

```typescript
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Toast, ToastAction, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from '@/components/ui/toast';
```

### Customizing shadcn/ui

```typescript
// components/ui/button.tsx - You can modify after copying
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'rounded font-medium transition-colors',
        variant === 'default' && 'bg-primary text-white hover:bg-primary/90',
        variant === 'outline' && 'border border-primary text-primary hover:bg-primary/5',
        className
      )}
      {...props}
    />
  )
);

export { Button };
```

### Building Custom Components with shadcn/ui

```typescript
// components/features/admin-document-upload/DocumentUploadForm.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function DocumentUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [content, setContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const formData = new FormData();
    if (file) formData.append('file', file);
    if (content) formData.append('content', content);

    setIsUploading(true);
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setFile(null);
        setContent('');
        // Show success toast
      }
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Document</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <Textarea
            placeholder="Or paste content here"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <Button type="submit" disabled={isUploading}>
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

---

## 4. Forms & Validation

### React Hook Form + Zod

```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Define validation schema
const querySchema = z.object({
  question: z.string().min(3, 'Question must be at least 3 characters').max(500),
});

type QueryForm = z.infer<typeof querySchema>;

export function ChatInput() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<QueryForm>({
    resolver: zodResolver(querySchema),
  });

  async function onSubmit(data: QueryForm) {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        reset();
        // Stream response
      }
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
      <Input
        {...register('question')}
        placeholder="Ask a question..."
        disabled={isSubmitting}
      />
      {errors.question && (
        <p className="text-sm text-red-500">{errors.question.message}</p>
      )}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Sending...' : 'Send'}
      </Button>
    </form>
  );
}
```

---

## 5. State Management

### For Simple UI State (useState)

```typescript
'use client';

import { useState } from 'react';

export function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div>
      {isOpen && <MessageList messages={messages} />}
      <button onClick={() => setIsOpen(!isOpen)}>Toggle</button>
    </div>
  );
}
```

### For Shared State (React Context)

```typescript
'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface ChatContextType {
  messages: Message[];
  addMessage: (message: Message) => void;
  clearMessages: () => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);

  const value = {
    messages,
    addMessage: (msg: Message) => setMessages(prev => [...prev, msg]),
    clearMessages: () => setMessages([]),
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
}
```

---

## 6. Client-Side Data Fetching

### Using the Fetch Wrapper

```typescript
// lib/api-client.ts
export async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Request failed');
  }

  if (response.status === 204) return null as T;
  return response.json();
}

// Usage
'use client';

import { apiRequest } from '@/lib/api-client';

export function useChat() {
  async function sendMessage(question: string) {
    const answer = await apiRequest<{ answer: string }>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ question }),
    });
    return answer;
  }

  return { sendMessage };
}
```

### Streaming Responses (for Chat)

```typescript
'use client';

import { useEffect, useState } from 'react';

export function ChatWindow() {
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleChat(question: string) {
    setIsLoading(true);
    setResponse('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        const chunk = decoder.decode(value);
        setResponse(prev => prev + chunk);
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <div className="whitespace-pre-wrap">{response}</div>
      <button onClick={() => handleChat('Hello')}>Send</button>
    </div>
  );
}
```

---

## 7. Styling with Tailwind

### CSS Variables for Theme

```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.6%;
    --primary: 142.1 76.2% 36.3%;
    --primary-foreground: 355.7 100% 97.3%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 96%;
  }

  [data-theme="dark"] {
    --background: 0 0% 3.6%;
    --foreground: 0 0% 98%;
    --primary: 142.1 70.6% 45.3%;
    --primary-foreground: 355.7 100% 97.3%;
  }
}

@layer base {
  body {
    @apply bg-background text-foreground;
  }
}
```

### Component Styling with shadcn/ui

```typescript
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

interface DocumentCardProps {
  document: Document;
  isHighlighted?: boolean;
}

export function DocumentCard({ document, isHighlighted }: DocumentCardProps) {
  return (
    <Card className={cn(
      'p-4 cursor-pointer transition-all',
      isHighlighted && 'border-primary bg-primary/5'
    )}>
      <h3 className="font-semibold text-lg">{document.filename}</h3>
      <p className="text-sm text-muted-foreground">
        {document.chunks_count} chunks
      </p>
    </Card>
  );
}
```

### Responsive Classes

```typescript
// Mobile-first approach
<div className="
  px-4 py-2 sm:px-6 sm:py-4 lg:px-8 lg:py-6
  grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4
  text-sm md:text-base lg:text-lg
">
  {/* Content */}
</div>
```

---

## 8. Performance Optimization

### Code Splitting with Dynamic Imports

```typescript
import dynamic from 'next/dynamic';

// Lazy load admin panel
const AdminPanel = dynamic(() => import('@/components/features/admin-panel'), {
  loading: () => <div>Loading...</div>,
});

export function Dashboard() {
  return (
    <div>
      <AdminPanel />
    </div>
  );
}
```

### Image Optimization

```typescript
import Image from 'next/image';

export function DocumentThumbnail() {
  return (
    <Image
      src="/document-icon.png"
      alt="Document"
      width={100}
      height={100}
      priority={false}
      sizes="(max-width: 768px) 100px, 150px"
    />
  );
}
```

### Memoization

```typescript
'use client';

import { memo } from 'react';

// Only re-renders when props change
export const MessageItem = memo(function MessageItem({ message }: { message: Message }) {
  return (
    <div className="p-2 rounded bg-gray-100">
      {message.content}
    </div>
  );
});
```

---

## 9. Error Handling & Loading States

### Error Boundary

```typescript
'use client';

import { useEffect, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function ErrorBoundary({ children, fallback }: ErrorBoundaryProps) {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Error caught:', event.error);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  return <>{children}</>;
}
```

### Loading States

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function UploadButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsLoading(true);
    setError(null);

    try {
      // API call
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleClick} disabled={isLoading}>
        {isLoading ? 'Uploading...' : 'Upload'}
      </Button>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}
```

---

## 10. Testing Components

### Unit Tests with Vitest

```typescript
// components/features/chat-interface/ChatInput.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInput } from './ChatInput';

describe('ChatInput', () => {
  it('renders input field', () => {
    render(<ChatInput />);
    expect(screen.getByPlaceholderText(/ask a question/i)).toBeInTheDocument();
  });

  it('submits question', async () => {
    const user = userEvent.setup();
    render(<ChatInput />);

    const input = screen.getByPlaceholderText(/ask a question/i);
    await user.type(input, 'What is RAG?');
    await user.click(screen.getByRole('button', { name: /send/i }));

    // Verify submission
  });

  it('shows validation error for empty input', async () => {
    const user = userEvent.setup();
    render(<ChatInput />);

    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(screen.getByText(/must be at least 3 characters/i)).toBeInTheDocument();
  });
});
```

---

## 11. Accessibility

### ARIA Labels

```typescript
import { Button } from '@/components/ui/button';

export function ChatControls() {
  return (
    <div className="flex gap-2">
      <Button aria-label="Clear chat history">Clear</Button>
      <Button aria-label="Save conversation">Save</Button>
    </div>
  );
}
```

### Semantic HTML

```typescript
export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="bg-white shadow">
        <nav className="max-w-7xl mx-auto px-4">
          <h1>Admin Dashboard</h1>
        </nav>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
      <footer className="bg-gray-50 border-t">
        © 2026 RAG Application
      </footer>
    </>
  );
}
```

---

## 12. Anti-Patterns

### Avoid

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| Props drilling | Hard to maintain | Use Context or composition |
| "use client" in everything | Loses server benefits | Server-first by default |
| Fetching in useEffect | Race conditions, cleanup issues | Use server components or better patterns |
| useEffect for derived state | Unnecessary complexity | Compute during render |
| Direct DOM manipulation | Conflicts with React | Use refs sparingly |

### Examples

```typescript
// BAD: Unnecessary client boundary
'use client';
export default async function Page() {  // ❌ Can't use async in client
  const data = await fetch(...);
}

// GOOD: Server component by default
export default async function Page() {  // ✓ Server component
  const data = await fetch(...);
}

// BAD: Props drilling
<ChatWindow user={user}>
  <MessageList user={user}>
    <MessageItem user={user} />
  </MessageList>
</ChatWindow>

// GOOD: Use Context
<ChatProvider>
  <ChatWindow>
    <MessageList />
  </ChatWindow>
</ChatProvider>
```

---

## Quick Reference

### Common Imports

```typescript
// React
import { useState, useEffect, useCallback, memo } from 'react';

// Next.js
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import dynamic from 'next/dynamic';

// Form validation
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// UI components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
```

### Testing Library Queries (Priority Order)

```typescript
screen.getByRole('button')                    // ✓ Best (accessible)
screen.getByLabelText('Upload')               // ✓ Good (labels)
screen.getByText(/search/i)                   // ✓ OK (visible text)
screen.getByTestId('upload-button')           // ✗ Last resort
```

## References

- [Next.js 15 Documentation](https://nextjs.org/docs)
- [React 19 Documentation](https://react.dev)
- [shadcn/ui Components](https://ui.shadcn.com)
- [React Hook Form](https://react-hook-form.com)
- [Tailwind CSS](https://tailwindcss.com)
- [Testing Library](https://testing-library.com)
