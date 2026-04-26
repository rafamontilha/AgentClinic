# Phase 4 — Staff Dashboard Auth: Plan

Groups run top to bottom; each is a self-contained, testable deliverable. Estimated total: 1–2 days.

---

## Group 1 — Middleware + Route Protection

**Goal:** All `/dashboard/*` routes redirect to `/login` when no valid session cookie is present. The app is in a consistent security state from the first commit.

- Install iron-session: `npm install iron-session`
- Create `src/lib/session.ts`:
  - Define `SessionData` interface: `{ authenticated: boolean }`
  - Export `sessionOptions: IronSessionOptions` with:
    - `cookieName: "agentclinic_session"`
    - `password: process.env.SESSION_SECRET!`
    - `cookieOptions: { maxAge: 8 * 60 * 60, httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" }`
  - Export `getSession()` — thin wrapper around `getIronSession(cookies(), sessionOptions)` for use in server actions and route handlers
- Create `src/middleware.ts`:
  - `config.matcher: ['/dashboard/:path*']` — only protect dashboard routes
  - Read and decrypt the session cookie from the incoming request using iron-session's edge-compatible `getIronSession`
  - If cookie is absent, expired, or tampered: `NextResponse.redirect(new URL('/login', request.url))`
  - Pass through all other matching requests unchanged
- Add to `.env.example`:
  ```
  # 32+ character random string — generate with: openssl rand -base64 32
  SESSION_SECRET=
  ```
- Add to `src/instrumentation.ts`:
  ```ts
  if (!process.env.SESSION_SECRET) {
    console.warn("AGENTCLINIC: SESSION_SECRET is not set — dashboard auth is disabled")
  }
  ```
- Smoke-check: `npm run dev` + navigate to `/dashboard` without a cookie → browser redirects to `/login` (404 until Group 2 — that's expected)

---

## Group 2 — Login Page UI + Server Action

**Goal:** A Pico CSS login form renders at `/login` and grants access on correct password.

- Create `app/login/page.tsx` (Server Component):
  - Pico CSS `<main>` with a centered `<article>` (max-width: 24rem)
  - `<hgroup>` heading: "AgentClinic Staff Login"
  - `<form action={loginAction}` with:
    - `<input type="password" name="password" required placeholder="Password" />`
    - `<button type="submit">Sign in</button>`
  - If `searchParams.error` is present, render `<small role="alert">Invalid password.</small>` above the form
- Create `app/login/actions.ts` (Server Action, `"use server"`):
  - `export async function loginAction(formData: FormData)`
  - Read `process.env.STAFF_PASSWORD` — if unset, `redirect('/login?error=1')`
  - Compare submitted password with `STAFF_PASSWORD` using `crypto.timingSafeEqual` (constant-time, no extra dependency)
  - On match: call `getSession()`, set `session.authenticated = true`, `await session.save()`, `redirect('/dashboard')`
  - On mismatch: `redirect('/login?error=1')`
- Smoke-check: `npm run dev` → open `/login`, submit correct password → redirects to `/dashboard`; wrong password → error message displayed

---

## Group 3 — Logout Route

**Goal:** A logout action destroys the session and sends the user back to `/login`.

- Create `app/logout/route.ts` (`GET /logout`):
  - Load session with `getSession()`
  - Call `session.destroy()`
  - Return `NextResponse.redirect(new URL('/login', request.url))`
- Add a "Sign out" `<a href="/logout">` link to the dashboard nav component (`app/components/NavMenu.tsx` or the dashboard layout header)
- Smoke-check: click "Sign out" in the nav → redirected to `/login`; navigate back to `/dashboard` → redirected to `/login` again

---

## Group 4 — Automated Tests

**Goal:** Middleware redirect logic, session options, and login action are covered by Vitest unit tests.

- `tests/auth/session.test.ts`:
  - Assert `sessionOptions.cookieName === "agentclinic_session"`
  - Assert `sessionOptions.cookieOptions.httpOnly === true`
  - Assert `sessionOptions.cookieOptions.maxAge === 28800` (8 × 3600)
  - Assert `sessionOptions.cookieOptions.sameSite === "lax"`
- `tests/auth/login.test.ts`:
  - Mock `process.env.STAFF_PASSWORD = "correct-password"`
  - Assert: correct password → session set + redirect to `/dashboard`
  - Assert: wrong password → redirect to `/login?error=1`, no session set
  - Assert: `STAFF_PASSWORD` unset → redirect to `/login?error=1`
- `tests/validation/phase4.test.ts`:
  - [auto] All session option assertions from `tests/auth/session.test.ts` re-run as validation
  - [auto] `src/middleware.ts` exists (file-presence assertion)
  - [auto] `config.matcher` does not include `/api/` (grep assertion — API routes must not be affected)
  - [auto] `SESSION_SECRET` absent → `console.warn` is called (spy on `console.warn` before importing instrumentation)
  - [auto] All Phase 1–3 validation assertions still pass (import and run `phase3.test.ts` assertions)

---

## Group 5 — Phase 4 Validation

**Goal:** All automated and manual checks pass. Merge is unblocked.

- Run `npm test` — exit 0, zero failures
- Walk through the manual smoke test checklist in `validation.md`
- Confirm no Phase 1–3 regressions (all dashboard pages load after login; all API routes respond correctly without a session cookie)
