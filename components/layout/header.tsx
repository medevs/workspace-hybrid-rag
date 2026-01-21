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
