# Next Steps (Planned Features — No Implementation Yet)

This file lists the agreed upcoming work. Do not implement these yet. It is a planning checklist.

## 1) Code Execution (Judge0 integration)
Goal: Users can run and submit solutions with fixed test cases. No custom test cases for now.

Planned steps
1) Decide execution provider and hosting
   - Use Judge0 self-host . Decide which plan and rate limits.
   - Define a secure network path between backend and Judge0.

2) Define problem test cases
   - Extend problem data model to store official test cases (input/output) and time limits.
   - Keep test cases hidden from the client (backend only).

3) Backend execution pipeline
   - Add endpoints:
     - `POST /submission/run` (run against sample tests)
     - `POST /submission/submit` (run against hidden tests)
     - `GET /submission/{id}` (polling for status)
   - Send code + language + tests to Judge0.
   - Store submissions, status, runtime, memory, verdict.

4) TLE handling
   - Add per-problem time limits.
   - If Judge0 runtime exceeds limit, mark as TLE.
   - Ensure consistent mapping of Judge0 statuses → our verdicts (AC/WA/TLE/CE/RE).

5) Frontend integration
   - Add Run and Submit buttons to problem detail page.
   - Show results (stdout, stderr, runtime, verdict).
   - Disable multiple submissions while a run is in progress.

6) Security & abuse protection
   - Rate-limit run/submit per user.
   - Validate code size and language.
   - Require auth for submit; allow run for logged-in only.

## 2) Activity Chart
Goal: Show a daily activity calendar like LeetCode.

Planned steps
1) Track daily activity (submissions, solves, runs).
2) Add backend endpoint `GET /activity` returning date → count.
3) Add UI calendar heatmap on Profile page.

## 3) Daily Problem
Goal: Show a daily problem for all users.

Planned steps
1) Define selection rule (random or curated).
2) Create a backend job or scheduled task to pick daily problem.
3) Add endpoint `GET /problem/daily`.
4) Add UI callout on Home page.

## Notes
- This is a roadmap only; do not build these until we agree on details (Judge0 hosting, DB schema updates, and UI behavior).

## Status updates
- 2026-01-29: Backend prepared for problem descriptions + test cases (schema + migration + API). No judge0 integration yet.
- 2026-01-29: Added seed migration for existing problems (Valid Parentheses) and a simple Sum of Two Numbers problem.
- 2026-01-29: Added daily problem endpoint and frontend Daily Problem section.
- 2026-01-29: Added starter code per language and frontend auto-load behavior.
- 2026-01-29: Added token-expiry logout flow (401 → logout + toast).
- 2026-01-29: Added daily problem icon in navbar and activity heatmap on profile.
- 2026-01-29: Added placeholder progress endpoints and user solutions endpoint to unblock frontend.
- 2026-01-29: Added constraints field and seed script/migration for 10 test cases per problem.
- 2026-01-29: Explore and Article pages now rely on backend content only.
- 2026-01-29: Updated CodeEditor visuals for a unique style.
- 2026-01-29: Added language‑based syntax highlighting and explore article detail fallback content.
