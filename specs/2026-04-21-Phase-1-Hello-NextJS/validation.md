# Validation — Phase 1: Hello Next.js

Phase 1 is ready to merge when every item in this checklist passes manually.

## Checklist

### 1. Server starts cleanly

- [ ] `npm run dev` completes without TypeScript errors or runtime crashes
- [ ] Terminal output shows no unhandled promise rejections or missing module errors
- [ ] A startup log line confirms the database was initialised (migration ran)
- [ ] A startup log line confirms the seed completed (or was skipped as already seeded)

### 2. Health endpoint responds

- [ ] `curl -s http://localhost:3000/api/health` returns exactly `{"status":"ok"}`
- [ ] HTTP status code is `200`

### 3. Database is initialised

- [ ] File `data/agentclinic.db` exists after first startup
- [ ] Running `sqlite3 data/agentclinic.db ".tables"` lists all five tables: `patients`, `visits`, `ailments`, `treatments`, `ailment_treatments`
- [ ] `SELECT COUNT(*) FROM ailments;` returns `10`
- [ ] `SELECT COUNT(*) FROM treatments;` returns `10`
- [ ] `SELECT COUNT(*) FROM ailment_treatments;` returns at least `10` (one mapping per ailment minimum)

### 4. Home page loads in browser

- [ ] Navigating to `http://localhost:3000` loads without a 404 or 500 error
- [ ] The page displays a headline and sub-headline aligned with mission.md copy
- [ ] The feature strip shows three columns: Register, Diagnose, Prescribe
- [ ] The "Go to Dashboard →" CTA navigates to `/dashboard` without a full page reload
- [ ] A footer with the brand name is visible at the bottom
- [ ] No console errors in the browser DevTools

### 5. Dashboard shell loads in browser

- [ ] Navigating to `http://localhost:3000/dashboard` loads without a 404 or 500 error
- [ ] The page displays a navigation bar with the "AgentClinic" brand name
- [ ] The page displays placeholder nav links (Dashboard, Patients, Ailments, Alerts)
- [ ] The page displays an empty-state message (e.g. "No visits yet. Waiting for agents to check in.")
- [ ] No console errors in the browser DevTools

### 6. Code quality gate

- [ ] `npm run build` completes with zero TypeScript errors
- [ ] No `any` types in schema or route files (use `unknown` or typed Drizzle infer)

## Merge Criteria

A PR for this phase may be merged when:

1. All checklist items above are ticked
2. `.env.local` is **not** committed (confirmed via `git status`)
3. `data/` directory is **not** committed (confirmed via `git status`)
4. The PR description links back to this validation checklist with each item marked
