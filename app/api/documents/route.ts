import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession, createAdminClient } from '@/lib/db';
import { chunkText } from '@/lib/chunking';
import { generateEmbeddings } from '@/lib/embeddings';
import { documentUploadSchema, documentDeleteSchema } from '@/lib/validations/documents';
import { extractText, getDocumentProxy } from 'unpdf';

/**
 * Extract text content from a file based on its type
 */
async function extractTextContent(
  content: string,
  fileType: string | undefined,
  isBase64: boolean | undefined
): Promise<string> {
  console.log('extractTextContent called with:', { fileType, isBase64, contentLength: content.length });

  // Plain text files
  if (fileType === 'text/plain' || !isBase64) {
    console.log('Treating as plain text');
    return content;
  }

  // Decode base64 to buffer
  console.log('Decoding base64 content...');
  const buffer = Buffer.from(content, 'base64');
  console.log('Buffer created, size:', buffer.length);

  // PDF files
  if (fileType === 'application/pdf') {
    console.log('Parsing PDF file with unpdf...');
    try {
      // Convert Node.js Buffer to Uint8Array for unpdf
      const uint8Array = new Uint8Array(buffer);

      // Load PDF document
      const pdf = await getDocumentProxy(uint8Array);
      console.log('PDF loaded, pages:', pdf.numPages);

      // Extract text with merged pages
      const { text, totalPages } = await extractText(pdf, { mergePages: true });
      console.log('PDF parsed successfully, pages:', totalPages, 'text length:', text.length);

      // Clean up
      await pdf.destroy();

      return text;
    } catch (error) {
      console.error('PDF parsing error:', error);
      throw new Error(`Failed to parse PDF file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // DOCX files - not yet supported
  if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    throw new Error('DOCX files are not yet supported. Please convert to PDF or TXT.');
  }

  // Unknown file type, try to use as text
  console.log('Unknown file type, using as text');
  return content;
}

export async function POST(request: NextRequest) {
  const user = await getUserFromSession();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON', code: 'INVALID_JSON' },
      { status: 400 }
    );
  }

  const parsed = documentUploadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', code: 'VALIDATION_ERROR', details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { filename, content, fileType, fileSize, isBase64 } = parsed.data;
  const supabase = createAdminClient();

  try {
    // 1. Extract text content from file (handles PDF, TXT, etc.)
    const textContent = await extractTextContent(content, fileType, isBase64);

    if (!textContent || textContent.trim().length === 0) {
      return NextResponse.json(
        { error: 'No text content could be extracted from the file', code: 'EMPTY_CONTENT' },
        { status: 400 }
      );
    }

    // 2. Create document record
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        workspace_id: user.workspaceId,
        filename,
        file_type: fileType,
        file_size: fileSize,
        created_by: user.userId,
      })
      .select()
      .single();

    if (docError) throw docError;

    // 3. Chunk the text
    const textChunks = chunkText(textContent);

    // 4. Create chunk records
    const chunkRecords = textChunks.map((text, index) => ({
      document_id: document.id,
      workspace_id: user.workspaceId,
      text,
      chunk_order: index,
    }));

    const { data: chunks, error: chunkError } = await supabase
      .from('chunks')
      .insert(chunkRecords)
      .select();

    if (chunkError) throw chunkError;

    // 5. Generate embeddings
    const embeddingInputs = chunks.map(c => ({ id: c.id, text: c.text }));
    const embeddings = await generateEmbeddings(embeddingInputs.map(e => e.text));

    // 6. Store embeddings
    const embeddingRecords = chunks.map((chunk, index) => ({
      chunk_id: chunk.id,
      embedding: embeddings[index],
    }));

    const { error: embError } = await supabase
      .from('embeddings')
      .insert(embeddingRecords);

    if (embError) throw embError;

    return NextResponse.json({
      documentId: document.id,
      filename: document.filename,
      chunks: chunks.length,
      message: 'Document uploaded and processed successfully',
    });
  } catch (error) {
    console.error('Document upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to process document: ${errorMessage}`, code: 'PROCESSING_ERROR' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const user = await getUserFromSession();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
      { status: 401 }
    );
  }

  const supabase = createAdminClient();

  try {
    const { data: documents, error } = await supabase
      .from('documents')
      .select('id, filename, file_type, file_size, created_at, created_by')
      .eq('workspace_id', user.workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Document list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents', code: 'FETCH_ERROR' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getUserFromSession();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get('id');

  const parsed = documentDeleteSchema.safeParse({ documentId });
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid document ID', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  try {
    // Check ownership
    const { data: doc, error: fetchError } = await supabase
      .from('documents')
      .select('created_by')
      .eq('id', documentId)
      .eq('workspace_id', user.workspaceId)
      .single();

    if (fetchError || !doc) {
      return NextResponse.json(
        { error: 'Document not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (doc.created_by !== user.userId) {
      return NextResponse.json(
        { error: 'You can only delete your own documents', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Delete document (cascades to chunks and embeddings)
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true, message: 'Document deleted' });
  } catch (error) {
    console.error('Document delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete document', code: 'DELETE_ERROR' },
      { status: 500 }
    );
  }
}
