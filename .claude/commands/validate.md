# Validate Project

Run comprehensive validation of the Workspace-Based RAG Application.

Execute the following commands in sequence and report results:

## 1. TypeScript Type Check

```bash
pnpm type-check
```

**Expected:** No type errors, exit code 0

## 2. ESLint Check

```bash
pnpm lint
```

**Expected:** No linting errors or warnings

## 3. Production Build

```bash
pnpm build
```

**Expected:** Build completes successfully, outputs to `.next/` directory

## 4. Unit Tests

```bash
pnpm test run
```

**Expected:** All Vitest tests pass

## 5. E2E Tests (Playwright MCP)

E2E tests are run via the **Playwright MCP server**, not the Playwright npm package.

Use the Playwright MCP to:
1. Start a browser session
2. Navigate to http://localhost:3000
3. Verify the home page loads with "Workspace RAG" heading
4. Test navigation to /auth/login and /auth/signup
5. Verify protected routes redirect to login when unauthenticated

**Note:** The dev server must be running (`pnpm dev`) before running E2E tests via Playwright MCP.

## 6. Database Validation (Optional)

Check database connectivity and schema via Supabase MCP:

```
mcp__supabase__list_tables with project_id and schemas=["public"]
```

Expected tables:
- workspaces
- users
- documents
- chunks
- embeddings

Check for security issues:

```
mcp__supabase__get_advisors with project_id and type="security"
```

**Expected:** All expected tables exist, no critical security warnings

## 7. Summary Report

After all validations complete, provide a summary report with:

| Check | Status |
|-------|--------|
| TypeScript | PASS/FAIL |
| ESLint | PASS/FAIL |
| Build | PASS/FAIL |
| Unit Tests | X passed, Y failed |
| E2E Tests (MCP) | PASS/FAIL |
| Database | PASS/FAIL/SKIPPED |

Include:
- Any errors or warnings encountered
- Overall health assessment (PASS/FAIL)

## Quick Validation

For a quick check during development:

```bash
pnpm type-check && pnpm lint && pnpm build
```

## CI/CD Validation

Commands suitable for CI pipeline (unit tests only, no E2E):

```bash
pnpm install --frozen-lockfile
pnpm type-check
pnpm lint
pnpm build
pnpm test run
```

**Note:** E2E tests via Playwright MCP are run manually or in environments with MCP access.
