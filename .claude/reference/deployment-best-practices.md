# Deployment Best Practices

## Environment Variables

### Local Development

```bash
# .env.local (gitignored)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

OPENAI_API_KEY=sk-your-key
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Production Secrets

Set these in your deployment platform (Vercel, Railway, etc.):
- `SUPABASE_SERVICE_ROLE_KEY` - Never expose client-side
- `OPENAI_API_KEY` - Never expose client-side

## Build Process

### Pre-Build Checks

```bash
# Run before every deployment
pnpm type-check   # TypeScript errors
pnpm lint         # ESLint errors
pnpm test         # Unit tests
pnpm build        # Production build
```

### Build Command

```bash
pnpm build
```

Outputs:
- `.next/` - Next.js build artifacts
- Static files optimized and minified
- Server code compiled

## Deployment Options

### Vercel (Recommended)

```bash
# Install CLI
npm i -g vercel

# Deploy
vercel            # Preview
vercel --prod     # Production
```

**vercel.json**:
```json
{
  "buildCommand": "pnpm build",
  "installCommand": "pnpm install"
}
```

### Railway

```bash
npm i -g @railway/cli
railway login
railway up
```

### Self-Hosted

```bash
# Build
pnpm build

# Start with PM2
npm i -g pm2
pm2 start "pnpm start" --name rag-app
pm2 save
pm2 startup
```

## Database Setup

### Push Migrations

```bash
# Link to Supabase project
npx supabase link --project-ref YOUR_PROJECT_REF

# Push all migrations
npx supabase db push
```

### Verify Setup

Check that migrations created:
1. Tables: workspaces, users, documents, chunks, embeddings
2. Indexes: HNSW on embeddings, GIN on chunks.text
3. Functions: match_chunks, match_chunks_keyword
4. RLS policies on all tables
5. Seeded workspaces

## Health Check

Create `app/api/health/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/db';

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('workspaces').select('count').limit(1);

    if (error) throw error;

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: error instanceof Error ? error.message : 'Unknown' },
      { status: 503 }
    );
  }
}
```

## Security Checklist

- [ ] `.env.local` in `.gitignore`
- [ ] Service role key only on server
- [ ] RLS enabled on all tables
- [ ] Input validation with Zod
- [ ] HTTPS in production

## Monitoring

### Logs

```bash
# Vercel
vercel logs <url>

# Railway
railway logs

# PM2
pm2 logs rag-app
```

### OpenAI Usage

Monitor at [platform.openai.com/usage](https://platform.openai.com/usage)

## Deployment Checklist

```
Before deploying:
☐ pnpm type-check passes
☐ pnpm lint passes
☐ pnpm test passes
☐ pnpm build succeeds
☐ Environment variables set
☐ Database migrations pushed
☐ Health check responds

After deploying:
☐ /api/health returns 200
☐ Login/signup works
☐ Document upload works
☐ Chat returns answers
☐ Check logs for errors
```

## Cost Summary

| Service | Free Tier | Paid |
|---------|-----------|------|
| Vercel | Hobby (limited) | $20/mo Pro |
| Supabase | 500MB DB | $25/mo Pro |
| OpenAI | None | Pay-per-use |

**OpenAI Costs (gpt-4o-mini)**:
- Input: $0.15 per 1M tokens
- Output: $0.60 per 1M tokens
- Embeddings: $0.02 per 1M tokens
