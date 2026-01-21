'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface DocumentDropzoneProps {
  onUploadComplete?: () => void;
}

export function DocumentDropzone({ onUploadComplete }: DocumentDropzoneProps) {
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setIsUploading(true);

    for (const file of acceptedFiles) {
      try {
        const content = await file.text();

        const response = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            content,
            fileType: file.type,
            fileSize: file.size,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Upload failed');
        }

        const result = await response.json();
        toast.success(`${file.name} uploaded (${result.chunks} chunks)`);
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setIsUploading(false);
    onUploadComplete?.();
  }, [onUploadComplete]);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
  } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    disabled: isUploading,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
        'hover:border-primary/50 hover:bg-accent/50',
        isDragActive && 'border-primary bg-accent',
        isDragAccept && 'border-green-500 bg-green-50 dark:bg-green-950/20',
        isDragReject && 'border-destructive bg-destructive/10',
        isUploading && 'opacity-50 cursor-not-allowed'
      )}
    >
      <input {...getInputProps()} />

      <div className="flex flex-col items-center gap-3">
        {isDragReject ? (
          <>
            <AlertCircle className="h-10 w-10 text-destructive" />
            <p className="text-sm text-destructive">File type not supported</p>
          </>
        ) : isDragAccept ? (
          <>
            <FileText className="h-10 w-10 text-green-600" />
            <p className="text-sm text-green-600">Drop to upload</p>
          </>
        ) : (
          <>
            <Upload className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {isUploading ? 'Uploading...' : 'Drag & drop files here'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports TXT, PDF, DOCX (max 10MB)
              </p>
            </div>
          </>
        )}

        {!isDragActive && !isUploading && (
          <Button variant="outline" size="sm" className="mt-2">
            Browse files
          </Button>
        )}
      </div>
    </div>
  );
}
