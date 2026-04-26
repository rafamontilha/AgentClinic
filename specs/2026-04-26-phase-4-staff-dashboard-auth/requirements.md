# Phase 4 — Staff Dashboard Auth: Requirements

## Scope

Phase 4 adds a login gate to the AgentClinic operator dashboard. Phases 1–3 delivered a fully functional clinic API, dashboard, and client SDK — all without authentication on the dashboard UI. (API routes are separately protected by `AGENTCLINIC_API_KEY`.) Phase 4 closes the dashboard gap so the application is safe to run in any shared or non-private environment.

### In scope

- Session middleware protecting all `/dashboard/*` routes
- Login page at `/app/login/page.tsx` with a Pico CSS password form
- Server action validating the submitted password against `STAFF_PASSWORD` env var
- `iron-session` encrypted session cookie (httpOnly, `sameSite: lax`, 8-hour max-age)
- Logout route at `GET /logout` that destroys the session and redirects to `/login`
- "Sign out" link in the dashboard nav
- Startup warning in `instrumentation.ts` when `SESSION_SECRET` is absent
- Unit tests for session options and login action
- Manual smoke test checklist (see `validation.md`)

### Out of scope

- Multiple staff accounts or per-user passwords
- Password change UI
- OAuth, SSO, or NextAuth
- Changes to `/api/*` route auth (already handled by `AGENTCLINIC_API_KEY`)
- Rate limiting on login attempts
- "Remember me" / persistent sessions beyond 8 hours

---

## Decisions

### Session library: iron-session

**Choice:** `iron-session` (one new npm dependency).

iron-session stores the entire session payload in an encrypted, tamper-proof cookie using AES-256-GCM, keyed by `SESSION_SECRET`. No session database, no JWT signing code, no server state. On cookie tamper or expiry, iron-session throws; the middleware catches this and redirects to `/login`.

This is consistent with the zero-server-state principle in the existing codebase — rate limiting uses DB row counts, SSE uses an in-memory singleton — nothing requires a separate session store.

**Edge runtime compatibility:** iron-session v8+ uses the Web Crypto API internally, so it works in Next.js middleware (which runs on the edge runtime). `src/lib/session.ts` must not import `better-sqlite3` or any Node.js-only module, or middleware will fail at build time.

### Password comparison: `crypto.timingSafeEqual`

**Choice:** Node.js built-in `crypto.timingSafeEqual` — zero extra dependencies.

`STAFF_PASSWORD` is a single plaintext env var. On login, the submitted value is compared using constant-time equality to prevent timing-based brute-force attacks. bcrypt is not used here because:

- There is no password database — the password is a single env var, not a stored hash.
- bcrypt's cost factor protects against offline dictionary attacks on stored hashes; it provides no security benefit for an env var comparison.
- Keeping dependency count low is a stated project goal (see `tech-stack.md`).

If multiple staff accounts with hashed passwords are ever needed, that belongs in a full auth overhaul — not this phase.

### Session cookie properties

| Property | Value | Reason |
|---|---|---|
| `cookieName` | `agentclinic_session` | Namespaced to the app |
| `maxAge` | `28800` (8 × 3600 s) | One working day; balances security and usability |
| `httpOnly` | `true` | Cookie inaccessible from browser JavaScript |
| `secure` | `true` in production, `false` in dev | HTTPS required in prod; localhost has no HTTPS |
| `sameSite` | `"lax"` | Prevents CSRF on state-changing requests; allows navigation from external links |

### Routes excluded from middleware

The middleware `config.matcher` is set to `['/dashboard/:path*']` only. The following routes are explicitly not protected by session middleware:

| Route | Reason |
|---|---|
| `/login` | The login page itself — must be accessible unauthenticated |
| `/logout` | Destroys the session; no auth needed to reach it |
| `/api/*` | Protected separately by `AGENTCLINIC_API_KEY` bearer token |
| `/api/health` | Explicitly public — no auth of any kind |

---

## Context

### Mission alignment

AgentClinic's primary audience is **AI agent developers** calling the API via the TypeScript SDK (see `mission.md`). The dashboard is a human operator tool for Mary's team (Engineering). The dashboard is not a product surface — it is an internal ops panel. A single shared password is appropriate for MVP; RBAC and per-user accounts are post-MVP.

### Tech stack alignment

Next.js 15 App Router middleware runs at the edge (see `tech-stack.md`). iron-session v8+ is edge-compatible. The session utility (`src/lib/session.ts`) must only import edge-safe modules. The login page uses a Server Action (`"use server"`) for form submission — no client-side JS required for the auth flow itself, consistent with the React Server Components architecture used throughout the dashboard.

### Phase dependencies

- Phases 1–3 must be complete. Dashboard pages at `/dashboard/*` must exist for the redirect behavior to be testable end-to-end.
- `SESSION_SECRET` and `STAFF_PASSWORD` must be added to `.env.local` before `npm run dev`. Both must be documented in `.env.example`.
- No database schema changes. No new tables. No migrations.
