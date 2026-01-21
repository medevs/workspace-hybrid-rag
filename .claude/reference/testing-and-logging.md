# Testing & Logging for RAG Application

## Table of Contents

1. [Unit Testing (Vitest)](#1-unit-testing-vitest)
2. [Integration Testing](#2-integration-testing)
3. [E2E Testing with Playwright MCP](#3-e2e-testing-with-playwright-mcp)
4. [Logging Strategy](#4-logging-strategy)
5. [Test Organization](#5-test-organization)

---

## 1. Unit Testing (Vitest)

### Vitest Configuration

**File: `vite.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.ts',
        '**/*.spec.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
```

**File: `tests/setup.ts`**

```typescript
import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => cleanup());

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})) as any;

// Mock fetch if using real one
global.fetch = vi.fn();
```

### Testing Utility Functions

```typescript
// lib/utils.test.ts
import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn - Class name utility', () => {
  it('combines class names', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
  });

  it('removes duplicates', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('handles conditional classes', () => {
    expect(cn('base', true && 'active', false && 'disabled'))
      .toBe('base active');
  });
});
```

### Testing React Components

```typescript
// components/features/chat-interface/ChatInput.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInput } from './ChatInput';

describe('ChatInput', () => {
  it('renders input field', () => {
    render(<ChatInput />);
    expect(screen.getByPlaceholderText(/ask a question/i)).toBeInTheDocument();
  });

  it('validates empty input', async () => {
    const user = userEvent.setup();
    render(<ChatInput />);

    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(screen.getByText(/must be at least 3 characters/i))
      .toBeInTheDocument();
  });

  it('submits valid question', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<ChatInput onSubmit={onSubmit} />);

    const input = screen.getByPlaceholderText(/ask a question/i);
    await user.type(input, 'What is RAG?');
    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(onSubmit).toHaveBeenCalledWith({ question: 'What is RAG?' });
  });

  it('disables button while submitting', async () => {
    const user = userEvent.setup();
    render(<ChatInput />);

    const input = screen.getByPlaceholderText(/ask a question/i);
    await user.type(input, 'Test question');

    const button = screen.getByRole('button', { name: /send/i });
    await user.click(button);

    expect(button).toBeDisabled();
  });
});
```

### Testing Hooks

```typescript
// lib/useSearch.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSearch } from './useSearch';

describe('useSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with empty results', () => {
    const { result } = renderHook(() => useSearch());

    expect(result.current.results).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('performs search', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ results: [{ id: 1, text: 'result' }] }),
      })
    ) as any;

    const { result } = renderHook(() => useSearch());

    await act(async () => {
      await result.current.search('test query');
    });

    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].text).toBe('result');
  });

  it('handles search errors', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error'))) as any;

    const { result } = renderHook(() => useSearch());

    await act(async () => {
      await result.current.search('test');
    });

    expect(result.current.error).toBe('Network error');
  });
});
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run in watch mode
pnpm test --watch

# Run specific file
pnpm test ChatInput.test.tsx

# With coverage
pnpm test --coverage

# Update snapshots
pnpm test --update
```

---

## 2. Integration Testing

### Testing API Routes

```typescript
// app/api/chat/__tests__/route.test.ts
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { POST } from '../route';

describe('POST /api/chat', () => {
  it('returns answer for valid question', async () => {
    const request = new Request('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'test-user-id',
      },
      body: JSON.stringify({ question: 'What is RAG?' }),
    });

    // Mock external dependencies
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ answer: 'RAG is...' }),
      })
    ) as any;

    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  it('returns 401 without auth', async () => {
    const request = new Request('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'test' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it('validates request body', async () => {
    const request = new Request('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'test-user',
      },
      body: JSON.stringify({}),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });
});
```

### Mocking Supabase

```typescript
// lib/__tests__/api.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { searchDocuments } from '@/lib/search';

// Mock Supabase
vi.mock('@/lib/db', () => ({
  supabasePublic: {
    rpc: vi.fn(),
  },
}));

import { supabasePublic } from '@/lib/db';

describe('searchDocuments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('performs hybrid search', async () => {
    vi.mocked(supabasePublic.rpc).mockResolvedValue({
      data: [
        {
          chunk_id: '1',
          text: 'RAG is a technique...',
          similarity: 0.95,
        },
      ],
      error: null,
    });

    const results = await searchDocuments('What is RAG?');

    expect(results).toHaveLength(1);
    expect(results[0].text).toContain('RAG');
  });
});
```

---

## 3. E2E Testing with Playwright MCP

### Playwright Setup

**Install Playwright MCP in Claude Code:**

```bash
claude mcp add playwright npx @playwright/mcp@latest
```

Then use in Claude Code for E2E tests. **File: `playwright.config.ts`**

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['json', { outputFile: 'test-results/results.json' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Page Objects

```typescript
// e2e/pages/AdminPage.ts
import { Page, Locator } from '@playwright/test';

export class AdminPage {
  readonly page: Page;
  readonly uploadButton: Locator;
  readonly fileInput: Locator;
  readonly documentList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.uploadButton = page.getByRole('button', { name: /upload/i });
    this.fileInput = page.getByLabel('Choose file');
    this.documentList = page.getByTestId('document-list');
  }

  async goto() {
    await this.page.goto('/admin/documents');
  }

  async uploadDocument(filePath: string) {
    await this.fileInput.setInputFiles(filePath);
    await this.uploadButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async getDocumentCount() {
    return (await this.documentList.getByRole('listitem')).count();
  }
}
```

### E2E Tests

```typescript
// e2e/admin-workflow.spec.ts
import { test, expect } from '@playwright/test';
import { AdminPage } from './pages/AdminPage';

test.describe('Admin Document Management', () => {
  test('upload document successfully', async ({ page }) => {
    const admin = new AdminPage(page);
    await admin.goto();

    const initialCount = await admin.getDocumentCount();

    // Create temporary test file
    const testFile = '/tmp/test-document.txt';
    // ... write test content

    await admin.uploadDocument(testFile);

    const finalCount = await admin.getDocumentCount();
    expect(finalCount).toBe(initialCount + 1);

    // Verify success message
    await expect(page.getByText(/uploaded successfully/i)).toBeVisible();
  });

  test('search document', async ({ page }) => {
    await page.goto('/admin/documents');

    const searchInput = page.getByPlaceholder('Search documents');
    await searchInput.fill('test');

    await expect(page.getByTestId('document-item')).toHaveCount(1);
  });
});
```

### Running E2E Tests in Claude Code

```bash
# Via Playwright MCP in Claude Code
# Run all tests
npx playwright test

# Run with UI
npx playwright test --ui

# Run specific file
npx playwright test admin-workflow

# Debug mode
npx playwright test --debug
```

---

## 4. Logging Strategy

### Server-Side Logging

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const startTime = performance.now();
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();

  // Log request
  console.log(JSON.stringify({
    type: 'REQUEST',
    requestId,
    method: req.method,
    path: req.nextUrl.pathname,
    timestamp: new Date().toISOString(),
  }));

  // Continue with middleware...
  const response = NextResponse.next();
  const duration = performance.now() - startTime;

  // Log response
  console.log(JSON.stringify({
    type: 'RESPONSE',
    requestId,
    status: response.status,
    duration: `${duration.toFixed(2)}ms`,
    timestamp: new Date().toISOString(),
  }));

  return response;
}

export const config = {
  matcher: ['/:path*'],
};
```

### API Route Logging

```typescript
// app/api/documents/route.ts
import { NextRequest, NextResponse } from 'next/server';

function logEvent(level: 'INFO' | 'ERROR', message: string, data?: any) {
  console.log(JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    ...data,
  }));
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const requestId = crypto.randomUUID();

  try {
    logEvent('INFO', 'Document upload started', { requestId, userId });

    const body = await req.json();

    // Process...

    logEvent('INFO', 'Document upload completed', { requestId, documentId: '123' });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    logEvent('ERROR', 'Document upload failed', {
      requestId,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
```

### Client-Side Error Tracking

```typescript
// lib/error-tracking.ts
export function captureError(error: Error, context?: Record<string, any>) {
  console.error(JSON.stringify({
    type: 'ERROR',
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
  }));

  // Optionally send to error tracking service
  // await fetch('/api/errors', { method: 'POST', body: JSON.stringify(...) });
}
```

---

## 5. Test Organization

### Directory Structure

```
tests/
├── __fixtures__/         # Test data and mocks
├── unit/                 # Unit tests
│   ├── lib/
│   │   ├── utils.test.ts
│   │   └── search.test.ts
│   └── hooks/
│       └── useChat.test.ts
├── integration/          # API integration tests
│   └── api/
│       ├── documents.test.ts
│       └── chat.test.ts
└── setup.ts              # Test configuration

e2e/
├── pages/
│   ├── AdminPage.ts
│   └── ChatPage.ts
├── fixtures/             # Test data for E2E
├── admin-workflow.spec.ts
└── chat-workflow.spec.ts
```

### Test Coverage Goals

| Type | Target | Priority |
|------|--------|----------|
| Unit | > 70% | High |
| Integration | > 50% | Medium |
| E2E | Critical flows | High |

### Test Naming Conventions

```typescript
// ✓ Good: Describe behavior, not implementation
it('shows error message when upload fails')
it('submits form with valid data')
it('prevents navigation without unsaved changes')

// ✗ Avoid: Implementation details
it('sets state to loading')
it('calls API endpoint')
it('renders conditional div')
```

### Debugging Tests

```bash
# Run with debugging
pnpm test --inspect-brk

# Use debugger in test
import { debug } from '@testing-library/react';

it('example', () => {
  const { getByText } = render(<Component />);
  debug(); // Pause and inspect DOM
});

# For E2E
npx playwright test --debug
```

---

## Best Practices

**Unit Tests:**
- Test behavior, not implementation
- Keep tests simple and focused
- Mock external dependencies
- Use descriptive test names

**Integration Tests:**
- Test real API routes with mocked DB
- Cover success and error cases
- Verify correct status codes
- Test edge cases

**E2E Tests:**
- Test critical user journeys only
- Use Page Object Model for maintainability
- Avoid flaky tests with proper waits
- Run in CI/CD pipeline

**Logging:**
- Use JSON format for machine parsing
- Include request/trace IDs for correlation
- Log at appropriate levels (INFO, WARN, ERROR)
- Rotate logs in production

## References

- [Vitest Documentation](https://vitest.dev)
- [Testing Library](https://testing-library.com)
- [Playwright Documentation](https://playwright.dev)
- [Best Practices for Testing](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
