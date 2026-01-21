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
        // Read file as base64 for binary files (PDF, DOCX) or text for plain text
        let content: string;
        let isBase64 = false;

        if (file.type === 'text/plain') {
          // Plain text files can be read directly
          content = await file.text();
        } else {
          // Binary files (PDF, DOCX) need to be sent as base64
          // Use FileReader for reliable base64 encoding
          content = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
              const base64 = result.split(',')[1];
              resolve(base64);
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
          });
          isBase64 = true;
        }

        const response = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            content,
            fileType: file.type,
            fileSize: file.size,
            isBase64,
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
        'border-2 border-dashed rounded-lg p-4 md:p-6 text-center cursor-pointer transition-colors',
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
            <AlertCircle className="h-8 w-8 md:h-10 md:w-10 text-destructive" />
            <p className="text-sm text-destructive">File type not supported</p>
          </>
        ) : isDragAccept ? (
          <>
            <FileText className="h-8 w-8 md:h-10 md:w-10 text-green-600" />
            <p className="text-sm text-green-600">Drop to upload</p>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 md:h-10 md:w-10 text-muted-foreground" />
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
