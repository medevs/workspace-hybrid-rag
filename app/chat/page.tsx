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

      {/* Desktop Layout with Flexbox */}
      <div className="flex-1 hidden md:flex overflow-hidden">
        {/* Conversations Panel - 15% */}
        <div className="w-[200px] min-w-[180px] max-w-[280px] h-full border-r bg-muted/30 flex-shrink-0">
          <ConversationSidebar
            activeConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
            onNewChat={handleNewChat}
            refreshTrigger={conversationRefreshTrigger}
          />
        </div>

        {/* Documents Panel - 20% */}
        <div className="w-[280px] min-w-[200px] max-w-[400px] h-full border-r p-4 flex flex-col flex-shrink-0">
          <h2 className="text-lg font-semibold mb-4 shrink-0">Documents</h2>
          <div className="mb-4 shrink-0">
            <DocumentDropzone onUploadComplete={handleUploadComplete} />
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <DocumentList refreshTrigger={refreshTrigger} />
          </div>
        </div>

        {/* Chat Panel - remaining space */}
        <div className="flex-1 h-full flex flex-col min-w-0">
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
