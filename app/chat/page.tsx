'use client';

import { useState, useCallback } from 'react';
import { DocumentDropzone } from '@/components/features/document-dropzone';
import { DocumentList } from '@/components/features/document-list';
import { ChatInterface } from '@/components/features/chat-interface';
import { ConversationSidebar } from '@/components/features/conversation-sidebar';

export default function ChatPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [conversationRefreshTrigger, setConversationRefreshTrigger] = useState(0);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const handleUploadComplete = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleNewChat = useCallback(() => {
    setActiveConversationId(null);
  }, []);

  const handleSelectConversation = useCallback((id: string | null) => {
    setActiveConversationId(id);
  }, []);

  const handleConversationCreated = useCallback((id: string) => {
    setActiveConversationId(id);
    setConversationRefreshTrigger(prev => prev + 1);
  }, []);

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full">
      {/* Left Sidebar - Conversations (200px) */}
      <div className="w-[200px] min-w-[180px] border-r flex flex-col overflow-hidden bg-muted/30">
        <ConversationSidebar
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          refreshTrigger={conversationRefreshTrigger}
        />
      </div>

      {/* Middle Panel - Documents (250px) */}
      <div className="w-[250px] min-w-[200px] border-r flex flex-col overflow-hidden">
        <div className="p-4 flex flex-col h-full overflow-hidden">
          <h2 className="text-lg font-semibold mb-4 shrink-0">Documents</h2>

          <div className="mb-6 shrink-0">
            <DocumentDropzone onUploadComplete={handleUploadComplete} />
          </div>

          <div className="flex-1 min-h-0 overflow-auto">
            <DocumentList refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </div>

      {/* Right Panel - Chat (flex-1) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b px-4 py-3 shrink-0">
          <h2 className="text-lg font-semibold">Chat</h2>
          <p className="text-sm text-muted-foreground">
            Ask questions about your documents
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <ChatInterface
            conversationId={activeConversationId}
            onConversationCreated={handleConversationCreated}
          />
        </div>
      </div>
    </div>
  );
}
