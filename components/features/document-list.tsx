'use client';

import { useState, useEffect } from 'react';
import { Trash2, FileText, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import type { Document } from '@/types';

interface DocumentListProps {
  refreshTrigger?: number;
}

export function DocumentList({ refreshTrigger }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = async () => {
    setError(null);
    try {
      const response = await fetch('/api/documents');
      if (!response.ok) {
        const data = await response.json();
        if (response.status === 401) {
          setError('Please sign in to view documents');
          return;
        }
        throw new Error(data.error || 'Failed to fetch');
      }
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Fetch error:', error);
      setError('Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [refreshTrigger]);

  const handleDelete = async (documentId: string, filename: string) => {
    setDeletingId(documentId);

    try {
      const response = await fetch(`/api/documents?id=${documentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Delete failed');
      }

      setDocuments(prev => prev.filter(d => d.id !== documentId));
      toast.success(`${filename} deleted`);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
            <Skeleton className="h-10 w-10 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">{error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchDocuments}
          className="mt-3"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No documents yet</p>
        <p className="text-xs mt-1">Upload files to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Documents ({documents.length})</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={fetchDocuments}
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-2 pr-4">
          {documents.map(doc => (
            <div
              key={doc.id}
              className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <FileText className="h-8 w-8 text-muted-foreground shrink-0" />

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-2" title={doc.filename}>
                  {doc.filename}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(doc.file_size)} • {formatDate(doc.created_at)}
                </p>
              </div>

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
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
