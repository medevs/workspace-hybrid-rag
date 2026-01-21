'use client';

import { useState } from 'react';
import { DocumentDropzone } from '@/components/features/document-dropzone';
import { DocumentList } from '@/components/features/document-list';
import { ChatInterface } from '@/components/features/chat-interface';

export default function ChatPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadComplete = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full">
      {/* Left Panel - Documents (30%) */}
      <div className="w-[30%] min-w-[250px] max-w-[500px] border-r flex flex-col overflow-hidden">
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

      {/* Right Panel - Chat (70%) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b px-4 py-3 shrink-0">
          <h2 className="text-lg font-semibold">Chat</h2>
          <p className="text-sm text-muted-foreground">
            Ask questions about your documents
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <ChatInterface />
        </div>
      </div>
    </div>
  );
}
