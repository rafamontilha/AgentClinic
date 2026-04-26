# Phase 4 — Staff Dashboard Auth: Validation

Phase 4 is merge-ready when **`npm test` exits 0** and every item below is checked.

Automated assertions marked `[auto]` must pass as part of `tests/validation/phase4.test.ts`. Manual steps are marked `[manual]`.

---

## 1. Middleware — Route Protection

- `[auto]` `src/middleware.ts` exists and exports a default function
- `[auto]` `config.matcher` includes `'/dashboard/:path*'`
- `[auto]` `config.matcher` does NOT include `'/api/'` or `'/login'` (grep assertion — API routes must not be affected)
- `[auto]` `sessionOptions.cookieName === "agentclinic_session"`
- `[auto]` `sessionOptions.cookieOptions.httpOnly === true`
- `[auto]` `sessionOptions.cookieOptions.maxAge === 28800`
- `[auto]` `sessionOptions.cookieOptions.sameSite === "lax"`
- `[manual]` Start `npm run dev`. Navigate to `http://localhost:3000/dashboard` with no cookies — confirm the browser is redirected to `/login`
- `[manual]` Navigate to `http://localhost:3000/api/health` with no cookies — confirm `200 { status: "ok" }` with no redirect
- `[manual]` Navigate to `http://localhost:3000/api/visits` with no API key — confirm `401` JSON error, not a redirect to `/login`

---

## 2. Login Page

- `[auto]` `app/login/page.tsx` exists
- `[auto]` Login action with correct password: `session.authenticated` is set to `true`; response redirects to `/dashboard`
- `[auto]` Login action with wrong password: redirects to `/login?error=1`; no session is saved
- `[auto]` Login action when `STAFF_PASSWORD` is unset: redirects to `/login?error=1`
- `[manual]` Open `http://localhost:3000/login` — confirm the Pico CSS form renders correctly at all viewport sizes (mobile ≥ 320px, desktop ≥ 1024px)
- `[manual]` Submit an incorrect password — confirm an error message appears on the page (no blank screen, no 500 error)
- `[manual]` Submit the correct `STAFF_PASSWORD` — confirm redirect to `/dashboard` and the dashboard loads

---

## 3. Session Cookie

- `[auto]` After login, the `Set-Cookie` response header includes `HttpOnly`
- `[auto]` After login, the `Set-Cookie` response header includes `Max-Age=28800`
- `[auto]` After login, the `Set-Cookie` response header includes `SameSite=Lax`
- `[manual]` After login, open browser DevTools → Application → Cookies — confirm `agentclinic_session` is present with `HttpOnly` flag set and `Expires` approximately 8 hours from now

---

## 4. Logout

- `[auto]` `GET /logout` calls `session.destroy()` (assert session data is empty after the call)
- `[auto]` `GET /logout` response is a redirect to `/login`
- `[manual]` After login, click "Sign out" in the dashboard nav — confirm redirect to `/login`
- `[manual]` After sign-out, navigate directly to `http://localhost:3000/dashboard` — confirm redirect back to `/login` (session is gone)

---

## 5. Startup Warning

- `[auto]` When `SESSION_SECRET` is absent from `process.env`, `instrumentation.ts` calls `console.warn` with a message containing `"SESSION_SECRET"` (spy on `console.warn`)

---

## 6. Regression — Phases 1–3 Must Still Pass

- `[auto]` All `tests/validation/phase3.test.ts` assertions pass with zero failures
- `[auto]` `POST /api/patients`, `GET /api/patients/:id`, `GET /api/ailments`, `GET /api/analytics/overview` all return expected shapes (API contract smoke check)
- `[manual]` After login, navigate to `/dashboard`, `/dashboard/patients`, `/dashboard/ailments`, `/dashboard/alerts` — confirm all pages load without errors or layout breaks
- `[manual]` Confirm the dashboard nav "Sign out" link is visible on all dashboard pages

---

## Merge Blockers

The following failures **block merge** regardless of other passing tests:

1. `npm test` exits non-zero
2. Any `[auto]` assertion in `tests/validation/phase4.test.ts` fails
3. `/dashboard` is accessible without a valid session cookie
4. The login page accepts an incorrect password and grants access
5. Session cookie is not `httpOnly`
6. `GET /api/health` returns a redirect instead of `200` (API routes must not be gated by session middleware)
7. Any Phase 1–3 automated assertion regresses
