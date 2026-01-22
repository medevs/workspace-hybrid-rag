'use client';

import { User, Bot, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import type { ChatMessage as ChatMessageType } from '@/types';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex gap-3 py-4',
        isUser && 'flex-row-reverse'
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div className={cn('flex-1 space-y-2 min-w-0', isUser && 'text-right')}>
        <div
          className={cn(
            'rounded-lg px-4 py-2',
            isUser
              ? 'inline-block max-w-[80%] bg-primary text-primary-foreground'
              : 'bg-muted'
          )}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="text-sm prose prose-sm dark:prose-invert prose-p:my-1 prose-headings:my-2 prose-headings:font-semibold prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-pre:my-2 prose-pre:overflow-x-auto prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:bg-muted-foreground/20 prose-code:before:content-none prose-code:after:content-none max-w-none break-words">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.sources.map((source, index) => (
              <div
                key={index}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-accent/50 rounded px-2 py-1"
                title={source.excerpt}
              >
                <FileText className="h-3 w-3" />
                <span className="truncate max-w-[150px]">{source.filename}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
