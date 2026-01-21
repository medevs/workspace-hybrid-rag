import { NextResponse } from 'next/server';

export async function POST() {
  // RAG chat - to be implemented
  return NextResponse.json(
    { error: 'Not implemented', code: 'NOT_IMPLEMENTED' },
    { status: 501 }
  );
}
