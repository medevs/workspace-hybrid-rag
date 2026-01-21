'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from './chat-message';
import type { ChatMessage as ChatMessageType } from '@/types';

interface ChatInterfaceProps {
  conversationId: string | null;
  onConversationCreated: (id: string) => void;
}

export function ChatInterface({
  conversationId,
  onConversationCreated
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Track conversation IDs created in this session to avoid refetching during streaming
  const locallyCreatedConversationRef = useRef<string | null>(null);

  // Load conversation messages when conversationId changes
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      locallyCreatedConversationRef.current = null;
      return;
    }

    // Skip fetching if this conversation was just created locally (during streaming)
    // The messages are already in local state from the streaming response
    if (locallyCreatedConversationRef.current === conversationId) {
      return;
    }

    async function loadMessages() {
      setIsLoadingHistory(true);
      try {
        const response = await fetch(`/api/conversations/${conversationId}`);
        if (!response.ok) throw new Error('Failed to load');
        const data = await response.json();
        setMessages(
          data.messages.map((m: { role: string; content: string; sources?: { filename: string; excerpt: string }[] }) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
            sources: m.sources || [],
          }))
        );
      } catch (error) {
        console.error('Error loading messages:', error);
        toast.error('Failed to load conversation');
      } finally {
        setIsLoadingHistory(false);
      }
    }

    loadMessages();
  }, [conversationId]);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const question = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message immediately
    const userMessage: ChatMessageType = { role: 'user', content: question };
    setMessages(prev => [...prev, userMessage]);

    // Add placeholder for assistant
    const assistantMessage: ChatMessageType = { role: 'assistant', content: '', sources: [] };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          stream: true,
          conversationId: conversationId || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const chunk = JSON.parse(line);

            if (chunk.type === 'conversation_id' && !conversationId) {
              // Mark this as a locally-created conversation to prevent refetch
              locallyCreatedConversationRef.current = chunk.data;
              onConversationCreated(chunk.data);
            } else if (chunk.type === 'sources') {
              setMessages(prev => {
                const lastIndex = prev.length - 1;
                const last = prev[lastIndex];
                if (last?.role === 'assistant') {
                  // Create new array with new object (immutable update)
                  return [
                    ...prev.slice(0, lastIndex),
                    { ...last, sources: chunk.data }
                  ];
                }
                return prev;
              });
            } else if (chunk.type === 'content') {
              setMessages(prev => {
                const lastIndex = prev.length - 1;
                const last = prev[lastIndex];
                if (last?.role === 'assistant') {
                  // Create new array with new object (immutable update)
                  return [
                    ...prev.slice(0, lastIndex),
                    { ...last, content: last.content + chunk.data }
                  ];
                }
                return prev;
              });
            } else if (chunk.type === 'error') {
              throw new Error(chunk.data);
            }
          } catch (parseError) {
            console.error('Parse error:', parseError);
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      // Remove empty assistant message on error (immutable update)
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && !last.content) {
          return prev.slice(0, -1);
        }
        return prev;
      });
      toast.error(error instanceof Error ? error.message : 'Failed to get response');
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoadingHistory) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-lg font-semibold">Start a conversation</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              Ask questions about your uploaded documents
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, i) => (
              <ChatMessage key={i} message={message} />
            ))}
            <div ref={scrollRef} />
          </div>
        )}
      </ScrollArea>

      <form onSubmit={handleSubmit} className="p-3 md:p-4 border-t shrink-0">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your docs..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
