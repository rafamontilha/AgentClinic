# Validation — Phase 1: Hello Next.js

Phase 1 is ready to merge when every item in this checklist passes. Sections 2, 3, and 6 are covered by automated tests (`npm test`); sections 1, 4, and 5 require manual browser verification.

## Checklist

### 1. Server starts cleanly

- [ ] `npm run dev` completes without TypeScript errors or runtime crashes
- [ ] Terminal output shows no unhandled promise rejections or missing module errors
- [ ] A startup log line confirms the database was initialised (migration ran)
- [ ] A startup log line confirms the seed completed (or was skipped as already seeded)

### 2. Health endpoint responds ✦ automated

- [ ] `curl -s http://localhost:3000/api/health` returns exactly `{"status":"ok"}`
- [ ] HTTP status code is `200`
- [ ] `tests/api/health.test.ts` passes (`npm test`)

### 3. Database is initialised ✦ automated

- [ ] File `data/agentclinic.db` exists after first startup
- [ ] Running `sqlite3 data/agentclinic.db ".tables"` lists all five tables: `patients`, `visits`, `ailments`, `treatments`, `ailment_treatments`
- [ ] `SELECT COUNT(*) FROM ailments;` returns `10`
- [ ] `SELECT COUNT(*) FROM treatments;` returns `10`
- [ ] `SELECT COUNT(*) FROM ailment_treatments;` returns at least `10` (one mapping per ailment minimum)
- [ ] `tests/db/migrate.test.ts` and `tests/db/seed.test.ts` pass (`npm test`)

### 4. Home page loads in browser

- [ ] Navigating to `http://localhost:3000` loads without a 404 or 500 error
- [ ] The page displays a headline and sub-headline aligned with mission.md copy
- [ ] The feature strip shows three columns: Register, Diagnose, Prescribe
- [ ] The "Go to Dashboard →" CTA navigates to `/dashboard` without a full page reload
- [ ] A footer with the brand name is visible at the bottom
- [ ] No console errors in the browser DevTools
- [ ] At 375px viewport: hero headline, sub-headline, and CTA are readable in a single column with no horizontal scroll
- [ ] At 375px viewport: feature strip stacks to a single column

### 5. Dashboard shell loads in browser

- [ ] Navigating to `http://localhost:3000/dashboard` loads without a 404 or 500 error
- [ ] The page displays a navigation bar with the "AgentClinic" brand name
- [ ] The page displays placeholder nav links (Dashboard, Patients, Ailments, Alerts)
- [ ] The page displays an empty-state message (e.g. "No visits yet. Waiting for agents to check in.")
- [ ] No console errors in the browser DevTools
- [ ] At 375px viewport: nav links are hidden and a hamburger button (`☰`) is visible
- [ ] Tapping `☰` reveals all four nav links in a full-width dropdown; icon changes to `✕`
- [ ] Tapping any nav link closes the dropdown

### 6. Responsive design (manual)

- [ ] No horizontal scroll on any page at 320px, 375px, 768px, and 1280px viewports
- [ ] Nav hamburger (`☰`) visible below 768px; horizontal links visible at 768px+
- [ ] Feature strip on home page: 1 column below 768px, 3 columns at 768px+
- [ ] Hero heading readable at all breakpoints (not truncated, not overflowing)

### 7. Code quality gate ✦ automated

- [ ] `npm run build` completes with zero TypeScript errors
- [ ] No `any` types in schema or route files (use `unknown` or typed Drizzle infer)
- [ ] `npm test` exits with code 0 and all tests in `tests/` pass
- [ ] `tests/validation/phase-1.test.ts` passes as the automated acceptance gate

## Merge Criteria

A PR for this phase may be merged when:

1. All checklist items above are ticked
2. `npm test` exits with code 0 (automated gate)
3. `npm run build` completes with zero TypeScript errors
4. `.env.local` is **not** committed (confirmed via `git status`)
5. `data/` directory is **not** committed (confirmed via `git status`)
6. The PR description links back to this validation checklist with each item marked
