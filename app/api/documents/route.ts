import { NextResponse } from 'next/server';

export async function POST() {
  // Document upload - to be implemented
  return NextResponse.json(
    { error: 'Not implemented', code: 'NOT_IMPLEMENTED' },
    { status: 501 }
  );
}

export async function GET() {
  // List documents - to be implemented
  return NextResponse.json(
    { error: 'Not implemented', code: 'NOT_IMPLEMENTED' },
    { status: 501 }
  );
}
