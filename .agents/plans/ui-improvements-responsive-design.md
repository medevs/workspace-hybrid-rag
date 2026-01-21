# Feature: UI Improvements with Responsive Design

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Comprehensive UI improvements for the Workspace RAG application including:
1. Add a global header/navbar with user info display (email) and logout button
2. Make the 3-panel layout responsive for different screen sizes (mobile, tablet, desktop)
3. Improve spacing and proportions so all components are visible
4. Add mobile navigation (hamburger menu for sidebar collapse)
5. Improve overall user experience and accessibility

## User Story

As a user of the Workspace RAG application
I want to see my account info, have a logout option, and use the app on any device
So that I can manage my session and access the app from mobile, tablet, or desktop

## Problem Statement

Current UI issues identified:
1. **No header/navbar**: Users cannot see who they're logged in as or log out
2. **Fixed width panels**: The 3-panel layout uses fixed pixel widths (200px, 250px) that don't adapt to screen size
3. **No mobile responsiveness**: On small screens, the 3 panels would be cramped and unusable
4. **No collapsible sidebars**: Users can't hide panels to focus on chat
5. **Chat takes remaining space**: But the fixed panels leave inconsistent chat widths
6. **No user context**: Users don't know which workspace they're in
7. **Conversation titles truncated**: Titles cut off with `truncate` class, can't see full title
8. **Document filenames truncated**: Same issue - filenames cut off, can't read full name
9. **Delete button hidden on conversations**: Menu only appears on hover (bad for touch/mobile)
10. **Delete button hard to see on documents**: Ghost button blends into background

## Solution Statement

1. Create a responsive header component with:
   - App logo/title
   - User email display
   - Workspace name badge
   - Logout button
   - Mobile menu toggle

2. Implement responsive 3-panel layout using:
   - CSS Grid for desktop (collapsible panels)
   - Stacked/tabbed layout for mobile
   - Medium breakpoint for tablet (2 panels + drawer)
   - ResizablePanelGroup for desktop resizing

3. Add mobile navigation:
   - Sheet/drawer for conversation sidebar on mobile
   - Sheet/drawer for documents panel on mobile
   - Bottom navigation tabs for mobile quick access

4. Fix text visibility issues:
   - Use `line-clamp-2` instead of `truncate` for titles/filenames (show 2 lines)
   - Add native `title` attribute for full text on hover
   - Always show action buttons (no hover-only visibility)
   - Make delete buttons more prominent with color on hover

## Feature Metadata

**Feature Type**: Enhancement
**Estimated Complexity**: Medium-High
**Primary Systems Affected**:
- `app/chat/page.tsx` - Main layout restructure
- `app/layout.tsx` - Add header component
- `components/features/` - All feature components need responsive updates
**Dependencies**:
- Existing shadcn/ui components (Sheet, Avatar, DropdownMenu)
- May need to add `@radix-ui/react-sheet` if not present

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `app/chat/page.tsx` (lines 1-77) - Why: Current 3-panel layout implementation to restructure
- `app/layout.tsx` (lines 1-27) - Why: Root layout where header will be added
- `components/features/conversation-sidebar.tsx` (lines 1-107) - Why: Sidebar to make collapsible
- `components/features/chat-interface.tsx` (lines 1-214) - Why: Chat component to make responsive
- `components/features/document-dropzone.tsx` (lines 1-119) - Why: Dropzone needs mobile-friendly sizing
- `components/features/document-list.tsx` (lines 1-179) - Why: Document list needs responsive design
- `components/ui/avatar.tsx` (lines 1-54) - Why: Will use for user avatar in header
- `components/ui/dropdown-menu.tsx` - Why: Will use for user menu dropdown
- `components/ui/resizable.tsx` (lines 1-64) - Why: Already have resizable panels component
- `lib/db.ts` (lines 13-69) - Why: `getUserFromSession` returns email and workspaceId
- `app/auth/signout/route.ts` (lines 1-22) - Why: Existing signout API endpoint to use
- `app/globals.css` (lines 1-126) - Why: CSS variables and theme setup

### New Files to Create

- `components/layout/header.tsx` - Main header component with user info and logout
- `components/layout/mobile-nav.tsx` - Mobile navigation with sheet drawers
- `components/layout/user-menu.tsx` - User dropdown menu component
- `app/api/user/route.ts` - API endpoint to get current user info for client components

### Patterns to Follow

**Component Naming**: PascalCase for components, kebab-case for files
```typescript
// Example from conversation-sidebar.tsx
export function ConversationSidebar({ ... }: ConversationSidebarProps) {
```

**Responsive Classes Pattern**: Use Tailwind breakpoints
```typescript
// Mobile-first approach
className="w-full md:w-[250px] lg:w-[300px]"
className="hidden md:flex" // Hide on mobile, show on tablet+
className="flex md:hidden" // Show on mobile, hide on tablet+
```

**API Route Pattern**:
```typescript
// From app/api/documents/route.ts
export async function GET() {
  const user = await getUserFromSession();
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
      { status: 401 }
    );
  }
  // ... rest of handler
}
```

**Client State Management**:
```typescript
// From chat/page.tsx - using useState and useCallback
const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
const handleNewChat = useCallback(() => {
  setActiveConversationId(null);
}, []);
```

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation - User API & Header Setup

Set up the infrastructure needed for the header component:
- Create API endpoint for fetching user info (email, workspace)
- Create base header component structure
- Add header to root layout

### Phase 2: Header Implementation

Complete the header with all features:
- User info display with avatar
- Workspace name badge
- Logout functionality
- Mobile menu toggle button

### Phase 3: Responsive Layout Restructure

Transform the fixed 3-panel layout into a responsive design:
- Use ResizablePanelGroup for desktop
- Add collapsible behavior to sidebars
- Implement mobile sheet/drawer navigation
- Add responsive breakpoints

### Phase 4: Component Updates

Update individual components for responsiveness:
- Reduce padding/spacing for mobile
- Make dropzone smaller on mobile
- Adjust chat input for touch
- Improve document list for small screens

### Phase 5: Testing & Polish

Verify all screen sizes work correctly:
- Test on mobile (320px - 480px)
- Test on tablet (768px - 1024px)
- Test on desktop (1024px+)
- Fix any overflow or layout issues

---

## STEP-BY-STEP TASKS

### Task 1: CREATE `components/ui/sheet.tsx`

Add the Sheet component from shadcn/ui for mobile drawers.

- **IMPLEMENT**: Add shadcn sheet component for mobile navigation
- **PATTERN**: Follow existing shadcn/ui component patterns in `components/ui/`
- **IMPORTS**: `@radix-ui/react-dialog` (Sheet uses Dialog primitives)
- **VALIDATE**: `pnpm dlx shadcn@latest add sheet`

### Task 2: CREATE `app/api/user/route.ts`

Create API endpoint to get current user info for client-side header.

- **IMPLEMENT**:
```typescript
import { NextResponse } from 'next/server';
import { getUserFromSession, createAdminClient } from '@/lib/db';

export async function GET() {
  const user = await getUserFromSession();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
      { status: 401 }
    );
  }

  // Get workspace name
  const supabase = createAdminClient();
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('name')
    .eq('id', user.workspaceId)
    .single();

  return NextResponse.json({
    email: user.email,
    workspaceId: user.workspaceId,
    workspaceName: workspace?.name || 'Unknown Workspace',
  });
}
```
- **PATTERN**: Reference `app/api/documents/route.ts` for structure
- **IMPORTS**: `getUserFromSession`, `createAdminClient` from `@/lib/db`
- **VALIDATE**: `curl http://localhost:3000/api/user` (should return user info or 401)

### Task 3: CREATE `components/layout/user-menu.tsx`

Create the user dropdown menu component.

- **IMPLEMENT**:
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, User, Building2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UserMenuProps {
  email: string;
  workspaceName: string;
}

export function UserMenu({ email, workspaceName }: UserMenuProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await fetch('/auth/signout', { method: 'POST' });
      router.push('/auth/login');
      router.refresh();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const initials = email.substring(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none truncate">{email}</p>
            <p className="text-xs leading-none text-muted-foreground flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {workspaceName}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={isLoading}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {isLoading ? 'Signing out...' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```
- **PATTERN**: Reference existing dropdown usage in `conversation-item.tsx`
- **IMPORTS**: Avatar, Button, DropdownMenu from `@/components/ui/`
- **VALIDATE**: Component renders without errors when imported

### Task 4: CREATE `components/layout/header.tsx`

Create the main header component.

- **IMPLEMENT**:
```typescript
'use client';

import { useState, useEffect } from 'react';
import { Menu, MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { UserMenu } from './user-menu';

interface HeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

interface UserInfo {
  email: string;
  workspaceName: string;
}

export function Header({ onMenuClick, showMenuButton = false }: HeaderProps) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch('/api/user');
        if (response.ok) {
          const data = await response.json();
          setUser(data);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchUser();
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 gap-4">
        {showMenuButton && (
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        )}

        <div className="flex items-center gap-2">
          <MessageSquareText className="h-6 w-6 text-primary" />
          <span className="font-semibold text-lg hidden sm:inline-block">
            Workspace RAG
          </span>
        </div>

        <div className="flex-1" />

        {isLoading ? (
          <Skeleton className="h-9 w-9 rounded-full" />
        ) : user ? (
          <UserMenu email={user.email} workspaceName={user.workspaceName} />
        ) : null}
      </div>
    </header>
  );
}
```
- **PATTERN**: Reference shadcn/ui patterns for sticky header
- **IMPORTS**: Button, Skeleton from `@/components/ui/`, UserMenu from local
- **VALIDATE**: Header renders with user info or loading skeleton

### Task 5: CREATE `components/layout/mobile-nav.tsx`

Create mobile navigation with sheet drawers.

- **IMPLEMENT**:
```typescript
'use client';

import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  side?: 'left' | 'right';
}

export function MobileNav({
  isOpen,
  onClose,
  title,
  children,
  side = 'left'
}: MobileNavProps) {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side={side} className="w-[300px] sm:w-[350px] p-0">
        <SheetHeader className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle>{title}</SheetTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```
- **PATTERN**: Use Sheet component from shadcn/ui
- **IMPORTS**: Sheet components from `@/components/ui/sheet`
- **VALIDATE**: Sheet opens and closes correctly

### Task 6: UPDATE `app/layout.tsx`

Add header to root layout and adjust structure.

- **IMPLEMENT**:
```typescript
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
        <div className="relative min-h-screen flex flex-col">
          {children}
        </div>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
```
- **PATTERN**: Keep layout minimal, header added in chat page for auth pages to not have it
- **GOTCHA**: Don't add header here - auth pages shouldn't have it
- **VALIDATE**: `pnpm type-check`

### Task 7: UPDATE `app/chat/page.tsx`

Restructure to responsive 3-panel layout with header.

- **IMPLEMENT**: Complete rewrite with responsive design
```typescript
'use client';

import { useState, useCallback } from 'react';
import { FileText, MessageSquare } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { DocumentDropzone } from '@/components/features/document-dropzone';
import { DocumentList } from '@/components/features/document-list';
import { ChatInterface } from '@/components/features/chat-interface';
import { ConversationSidebar } from '@/components/features/conversation-sidebar';
import { Button } from '@/components/ui/button';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';

export default function ChatPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [conversationRefreshTrigger, setConversationRefreshTrigger] = useState(0);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Mobile navigation state
  const [showConversations, setShowConversations] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);

  const handleUploadComplete = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleNewChat = useCallback(() => {
    setActiveConversationId(null);
    setShowConversations(false);
  }, []);

  const handleSelectConversation = useCallback((id: string | null) => {
    setActiveConversationId(id);
    setShowConversations(false);
  }, []);

  const handleConversationCreated = useCallback((id: string) => {
    setActiveConversationId(id);
    setConversationRefreshTrigger(prev => prev + 1);
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <Header
        onMenuClick={() => setShowConversations(true)}
        showMenuButton
      />

      {/* Mobile Navigation Sheets */}
      <MobileNav
        isOpen={showConversations}
        onClose={() => setShowConversations(false)}
        title="Conversations"
        side="left"
      >
        <ConversationSidebar
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          refreshTrigger={conversationRefreshTrigger}
        />
      </MobileNav>

      <MobileNav
        isOpen={showDocuments}
        onClose={() => setShowDocuments(false)}
        title="Documents"
        side="right"
      >
        <div className="p-4 flex flex-col h-full">
          <div className="mb-4">
            <DocumentDropzone onUploadComplete={handleUploadComplete} />
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <DocumentList refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </MobileNav>

      {/* Mobile Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background p-2 flex justify-around z-40">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowConversations(true)}
          className="flex-1"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Chats
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDocuments(true)}
          className="flex-1"
        >
          <FileText className="h-4 w-4 mr-2" />
          Docs
        </Button>
      </div>

      {/* Desktop Layout with Resizable Panels */}
      <div className="flex-1 hidden md:block overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Conversations Panel */}
          <ResizablePanel defaultSize={15} minSize={12} maxSize={25}>
            <div className="h-full border-r bg-muted/30">
              <ConversationSidebar
                activeConversationId={activeConversationId}
                onSelectConversation={handleSelectConversation}
                onNewChat={handleNewChat}
                refreshTrigger={conversationRefreshTrigger}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Documents Panel */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <div className="h-full border-r p-4 flex flex-col">
              <h2 className="text-lg font-semibold mb-4 shrink-0">Documents</h2>
              <div className="mb-4 shrink-0">
                <DocumentDropzone onUploadComplete={handleUploadComplete} />
              </div>
              <div className="flex-1 min-h-0 overflow-auto">
                <DocumentList refreshTrigger={refreshTrigger} />
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Chat Panel */}
          <ResizablePanel defaultSize={65} minSize={40}>
            <div className="h-full flex flex-col">
              <div className="border-b px-4 py-3 shrink-0">
                <h2 className="text-lg font-semibold">Chat</h2>
                <p className="text-sm text-muted-foreground">
                  Ask questions about your documents
                </p>
              </div>
              <div className="flex-1 min-h-0">
                <ChatInterface
                  conversationId={activeConversationId}
                  onConversationCreated={handleConversationCreated}
                />
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Mobile Chat (full screen with bottom padding for nav) */}
      <div className="flex-1 md:hidden flex flex-col pb-14">
        <div className="border-b px-4 py-2 shrink-0">
          <h2 className="text-base font-semibold">Chat</h2>
        </div>
        <div className="flex-1 min-h-0">
          <ChatInterface
            conversationId={activeConversationId}
            onConversationCreated={handleConversationCreated}
          />
        </div>
      </div>
    </div>
  );
}
```
- **PATTERN**: Use ResizablePanelGroup for desktop, Sheet for mobile
- **IMPORTS**: Header, MobileNav, ResizablePanelGroup, ResizablePanel, ResizableHandle
- **GOTCHA**: Mobile layout needs padding for bottom nav bar
- **VALIDATE**: `pnpm type-check && pnpm build`

### Task 8: UPDATE `components/features/document-dropzone.tsx`

Make dropzone more compact and mobile-friendly.

- **IMPLEMENT**: Update padding and sizing classes
- Change `p-8` to `p-4 md:p-6`
- Change icon size from `h-10 w-10` to `h-8 w-8 md:h-10 md:w-10`
- **VALIDATE**: Dropzone looks good on small screens

### Task 9: UPDATE `components/features/chat-interface.tsx`

Improve chat input for mobile.

- **IMPLEMENT**:
- Add responsive padding: `p-3 md:p-4`
- Make input placeholder shorter on mobile
- Ensure scroll area works on mobile
- **VALIDATE**: Chat input is usable on mobile keyboard

### Task 10: UPDATE `components/features/conversation-item.tsx`

Fix title visibility and always show action menu.

- **IMPLEMENT**:
```typescript
// Change line 55 - Allow title to wrap instead of truncate
<p className="text-sm font-medium line-clamp-2">{conversation.title}</p>

// Change lines 63-69 - Always show menu button (remove opacity-0)
<Button
  variant="ghost"
  size="icon"
  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
  onClick={(e) => e.stopPropagation()}
>
  <MoreHorizontal className="h-4 w-4" />
</Button>

// Remove showMenu state and onMouseEnter/onMouseLeave handlers (not needed anymore)
```
- **PATTERN**: Use `line-clamp-2` for 2-line title display, always visible actions
- **GOTCHA**: Need to add `line-clamp` plugin or use Tailwind's built-in (v3.3+)
- **VALIDATE**: Titles show 2 lines, menu button always visible

### Task 11: UPDATE `components/features/conversation-sidebar.tsx`

Keep "New Chat" button styling but adjust for smaller screens.

- **IMPLEMENT**: Minor padding adjustments
- **VALIDATE**: Sidebar works in both sheet and panel contexts

### Task 12: UPDATE `components/features/document-list.tsx`

Fix filename visibility and make delete button more prominent.

- **IMPLEMENT**:
```typescript
// Change line 144 - Increase scroll area height or make it flexible
<ScrollArea className="flex-1 min-h-0">

// Change line 154 - Allow filename to wrap to 2 lines
<p className="text-sm font-medium line-clamp-2" title={doc.filename}>
  {doc.filename}
</p>

// Change lines 162-168 - Make delete button more visible with color
<Button
  variant="ghost"
  size="icon"
  className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
  onClick={() => handleDelete(doc.id, doc.filename)}
  disabled={deletingId === doc.id}
  title="Delete document"
>
  <Trash2 className="h-4 w-4" />
</Button>
```
- **PATTERN**: Use `line-clamp-2` for multi-line filenames, prominent delete button
- **GOTCHA**: Long filenames should show tooltip on hover (title attribute)
- **VALIDATE**: Filenames show properly, delete button clearly visible

### Task 13: ADD Tooltip for truncated text

Add tooltips to show full text on hover for truncated items.

- **IMPLEMENT**: Already using `title` attribute, but consider adding shadcn Tooltip for better UX
- **VALIDATE**: Hovering shows full filename/title

---

## TESTING STRATEGY

### Unit Tests

Not applicable for UI changes - focus on visual testing.

### Integration Tests

Test responsive behavior at different breakpoints:
- 375px (mobile)
- 768px (tablet)
- 1024px (small desktop)
- 1440px (large desktop)

### Edge Cases

- [ ] Very long email addresses truncate properly
- [ ] Very long workspace names display correctly
- [ ] Empty conversation list displays correctly
- [ ] Empty document list displays correctly
- [ ] Logout works and redirects to login
- [ ] Mobile sheet overlays don't cause scroll issues
- [ ] Keyboard doesn't push layout on mobile

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style

```bash
pnpm type-check
pnpm lint
```

### Level 2: Build Test

```bash
pnpm build
```

### Level 3: Manual Validation

1. Desktop (1440px+):
   - [ ] Header shows with user email and logout
   - [ ] 3 panels are resizable
   - [ ] All panels scroll independently

2. Tablet (768px - 1024px):
   - [ ] Header shows with user info
   - [ ] Panels are still visible but narrower
   - [ ] Resize handles work

3. Mobile (< 768px):
   - [ ] Header shows with menu button
   - [ ] Bottom nav bar shows Chats and Docs buttons
   - [ ] Tapping Chats opens conversation sheet from left
   - [ ] Tapping Docs opens document sheet from right
   - [ ] Chat is full screen with bottom padding
   - [ ] User can logout via avatar menu

---

## ACCEPTANCE CRITERIA

- [ ] Header component displays user email and workspace name
- [ ] Logout button works and redirects to login page
- [ ] Desktop layout uses resizable panels (15%, 20%, 65% default)
- [ ] Mobile layout shows chat full screen with bottom nav
- [ ] Mobile sheets open for conversations and documents
- [ ] All panels scroll independently without affecting others
- [ ] No horizontal scroll on any screen size
- [ ] Touch targets are at least 44px on mobile
- [ ] All existing functionality still works (upload, chat, conversations)
- [ ] **Conversation titles show up to 2 lines** (not truncated to 1 line)
- [ ] **Document filenames show up to 2 lines** (not truncated to 1 line)
- [ ] **Conversation menu button always visible** (not hidden until hover)
- [ ] **Document delete button clearly visible** with hover color change
- [ ] **Tooltips show full text** on hover for truncated items

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] `pnpm type-check` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm build` passes
- [ ] Desktop layout tested and working
- [ ] Tablet layout tested and working
- [ ] Mobile layout tested and working
- [ ] Logout functionality tested
- [ ] User info displays correctly

---

## NOTES

### Design Decisions

1. **Header in chat page, not root layout**: Auth pages (login/signup) shouldn't have the header, so we add it only to protected pages.

2. **ResizablePanelGroup for desktop**: Already have the component, provides better UX than fixed widths.

3. **Sheet for mobile navigation**: Standard mobile pattern, doesn't require complex state management.

4. **Bottom navigation bar on mobile**: Common pattern for mobile apps, provides quick access to main sections.

5. **Breakpoint at md (768px)**: Standard tablet/mobile breakpoint that works for most devices.

### Trade-offs

- Mobile layout prioritizes chat over documents (chat is full screen)
- Desktop panels have min/max sizes to prevent unusable states
- Sheet navigation adds extra tap for mobile users to access panels

### Future Improvements

- Add keyboard shortcuts for desktop panel toggling
- Add swipe gestures for mobile sheet opening
- Add panel collapse buttons for desktop
- Add dark mode toggle in header
