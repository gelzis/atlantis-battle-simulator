# Atlantis battle simulator: engineering guide

## Scope and working rules

This repository contains an Atlantis PBEM battle simulator and a separate martial-points activity checker. Keep this guide synchronized with changes to user flows, routes, storage contracts, and development commands.

- Preserve battle JSON compatibility, including legacy imports. Internal TypeScript or Redux refactors must not silently change persisted/exported formats.
- All direct dependency versions in `package.json` are exact. Update `package-lock.json` alongside package changes; use `npm ci` for reproducible installs.
- Prefer behavior tests using real isolated stores. Test request failures, import/export preservation, and storage compatibility; avoid large generated UI snapshots.
- Maintain compact field sizes, consistent gaps, responsive layouts, accessible action names, and readable label/value separation. MUI Typography can render inline spans through the shared theme; layout must be explicit.
- Do not hand-edit generated bundles, SQLite files, or the native engine binary as part of routine frontend work.

## Technology and source map

- Node.js 22+; TypeScript 5.9. React 19 uses `createRoot` in both frontend entry points.
- Material UI 9 with Emotion, plus styled-components 6 for existing custom components. Shared theme and primitives: `src/frontend/StyledComponents.tsx`; global styles: `GlobalStyle.tsx`.
- Redux Toolkit `configureStore`, React Redux typed hooks, and the existing Immer reducer/action creators. `createAppStore()` creates independent stores for tests. `session/restoreDraft` is handled at the store boundary.
- Webpack 5 and Babel produce two bundles: simulator `main` and `martialPoints`. `webpack.config.js` emits hashed assets and stable JS forwarding files under `src/public/dist`. Type checking is a separate `tsc` step.
- Express 5 backend in `src/backend/app.ts`; SQLite via `BattleStore`; native Linux x86-64 Atlantis engine at `src/engine/engine`. Items, skills, and structures come from engine-exported JSON alongside the binary.
- Jest 30, Testing Library, and jsdom. The database tests exercise real SQLite; UI request tests mock the HTTP boundary, not the native engine.
- PostHog is initialized by the production simulator entry point; successful simulations emit `battle_run`.

## Running and verification

From the repository root:

```bash
npm ci
npm run build
```

For development, run `npm run dev` (Webpack watch) and `npm run dev-server` (Express via ts-node-dev) in separate terminals. Open `http://localhost:4020`. Refresh after frontend recompilation. `npm run dev-types` runs TypeScript compilation; `npx tsc --noEmit` checks types without emitting files.

Validation commands:

```bash
npm run lint
npm test -- --runInBand
npx tsc --noEmit
npm run build
```

The production process is `node dist/backend/app.js`. `PORT` defaults to `4020`; `BATTLE_DATABASE_PATH` defaults to `data/battles.sqlite`. Startup waits for both battle and simulation-job database initialization before listening. The engine runner creates isolated temporary request directories under the OS temporary directory and removes them after process exit.

Simulation jobs use the same SQLite database in a separate `simulation_jobs` table. Run **one backend instance per database**: the scheduler owns one engine execution slot and is not a distributed queue. Keep the database on persistent storage when deploying a container. Defaults are a five-minute execution deadline (including a two-second termination grace period), ten-minute queue expiry, 20 waiting jobs, and 24-hour result retention. Server environment overrides are `SIMULATION_TIMEOUT_MS`, `SIMULATION_QUEUE_TIMEOUT_MS`, `SIMULATION_MAX_QUEUED`, and `SIMULATION_RETENTION_MS`; positive integers are required, with maxima of one hour, 24 hours, 1000 waiting jobs, and seven days respectively. The grace period is shortened for execution limits below 20 seconds. Pending jobs survive restarts; jobs interrupted during execution are marked failed, not automatically rerun. SIGTERM/SIGINT stop scheduling and terminate the active engine before closing SQLite.

Backend runner tests launch small real child processes, including one that ignores SIGTERM. HTTP route tests use an ephemeral loopback listener. These tests need an environment that permits process output capture and local socket binding.

The bundled engine requires glibc 2.38 or newer. Ubuntu 20.04/WSL cannot execute it directly. The Dockerfile uses Ubuntu 24.04 and Node 24, runs lint/tests/build, and launches the compiled backend. Docker Desktop requires WSL integration when invoked from WSL. The committed `.dockerignore` excludes host `node_modules`, `.git`, generated `dist` directories, and local SQLite data so native modules installed in the image are not overwritten. The README documents build/run commands and a persistent Docker volume. No Compose setup is currently committed.

Native SQLite binaries may need `npm rebuild sqlite3 --build-from-source` on older Linux systems. Passing UI/database tests does not verify that the native battle engine can execute. Existing Webpack bundle-size/hash-deprecation warnings are separate from failed builds.

The current GitHub workflow builds and pushes a Docker image on `master` or `v3` pushes. It uses legacy action/output/registry conventions and does not currently define a pull-request validation job. Do not assume pushing is a local-only operation.

## User flows

### 1. Open the simulator and recover a draft

`src/public/index.html` loads the simulator entry point. Its React/Redux/theme providers wrap `LocalPersistence` and `BattleSimulator`. On `/`, the persistence provider validates and restores the local draft before mounting the simulator. Army totals are recomputed; loading, errors, and dialog state are reset.

The draft includes both armies, structures, simulation count, and unfinished unit-editor fields (including blank rows and stable IDs). Changes are autosaved after 300 ms and flushed on pagehide/hidden visibility. Simulation results are excluded from draft storage; asynchronous job results are retained separately on the server. Autosave status appears as secondary text beneath the app title in the top bar; storage warnings remain visible below the header.

### 2. Build and edit armies

`MainForm` edits the current unit: item/monster quantities, skills and levels, combat spell, Behind flag, and name. Adding to Attackers/Defenders creates a new unit and resets the editor. Editing a listed unit loads a draft; Save updates that unit, while Cancel/Reset discards form edits. Empty item/skill selections are removed on save; a unit without items is not saved.

`UnitList` supports edit, duplicate on the same side, duplicate to the opposite side, delete, and Behind toggling. Copies receive distinct unit IDs. `SideStats` shows Front/Back/Total counts using soldier/monster/illusion categories, excluding equipment. Clearing one side updates only that army and its totals. Structure selectors apply a single structure type per side.

### 3. Configure and run simulations

The settings dialog edits the run count (1–100, default/fallback 50). Run battle captures the army setup and count at request time, clears the prior current result, and sets loading. Duplicate requests and baseline restoration are disabled while loading. Edits made during a request do not change its captured setup.

`convertCurrentStateToJson` exports units with item tags, known skills, optional combat spell, and optional Behind flag. A side exports either loose units or a structures array. UI IDs/names for resources and unfinished form edits are not part of the engine payload.

The frontend posts `{requestId, battle, battleCount}` to `/simulation-jobs` and receives HTTP 202 with a job record. The UUID submission ID makes retries idempotent; reuse with different input returns 409. Express retains the existing shallow army validation and count fallback. Jobs enter a bounded FIFO queue; a full queue returns 429 with Retry-After. One native process runs at a time. `spawn` invokes `engine battle <file> <count>`, enforces a hard execution deadline with SIGTERM followed by SIGKILL within the budget, and caps combined stdout/stderr at 16 MiB. Invalid engine output, launch failures, and nonzero exits become failed jobs. Failure logs include the job ID, exit code/signal, and up to 8 KiB of stderr; runtime-library and launch errors have specific client messages. Raw stderr stays in server logs. Temporary request files are cleaned after process exit.

The browser polls `GET /simulation-jobs/:id` every two seconds and retrieves completed output from `GET /simulation-jobs/:id/result`. Statuses are `queued`, `running`, `completed`, `failed`, `timed_out`, `cancelled`, and `expired` (queue expiry). The UI shows elapsed/waiting time and the execution limit; there is no partial engine progress or SSE. `POST /simulation-jobs/:id/cancel` removes a queued job or requests termination of a running process; its slot is released only after exit. Closing a tab does not cancel a job. The legacy `POST /battle` route retains its final-result response format but uses the same scheduler and limits.

A versioned `atlantis.simulationJob` sessionStorage record keeps the most recent job ID and submitted draft snapshot in that tab, scoped to the page path. Refreshing that page reconnects to the job and can retrieve a retained result without replacing the current armies or editor. It also preserves the setup and completion time used for baseline pinning. This record is separate from local draft/baseline keys and share records; it is not cross-device history. Missing/expired jobs release the UI for another run. Network or result-download failures retry polling without resubmitting accepted jobs. Submission failures allow explicit retry with the same submission ID for the same setup. Session-storage errors warn without blocking simulations; malformed/future records are preserved. Restoring a baseline clears the current job recovery record along with the displayed result.

### 4. Read results

`SimulationResult` shows attacker win rate, wins/draws/losses, total completed simulations, and a casualty comparison table (mean, median, minimum–maximum). Detailed casualty statistics, spoils (when available), and example battle logs start collapsed. Logs use Victory/Draw/Defeat tabs only for supplied examples. Metric tooltips explain the detailed statistics. Percentile charts handle zero variation without invalid heights.

### 5. Pin and compare a baseline

After a successful run, Pin as baseline explicitly persists its captured setup and summary metrics. Autosave cannot overwrite it. One baseline is kept; the latest result is displayed in memory and can be retrieved after a same-tab refresh while the server job is retained. Subsequent runs show baseline/current/difference columns for attacker win rate, mean casualties on each side, and completed simulation counts. Win-rate differences are percentage points; changes are neutral, with an explanation that simulation noise can cause small differences.

The comparison section starts collapsed without a baseline; users expand it to pin a result. It expands automatically when a baseline is loaded or pinned and can be collapsed manually. The baseline remains available after reload even without a current result. Replacing it is explicit. Remove baseline deletes only its local record, preserves the draft/current result, and collapses the section (or hides it if there is no current result). Removal respects storage failures and other-tab conflicts. Restore baseline setup requires confirmation because it replaces armies, unfinished edits, and run count. Restoration clears the current displayed result, returns the URL to `/`, and enables draft autosave. It does not rerun the engine.

### 6. Download/import battle JSON

Header download exports the configured armies as a JSON file. Upload parses a selected file, validates the side containers, normalizes legacy format, and replaces the armies through `loadBattleIntoStore`.

Legacy support includes item `abbr` to `tag`, flat skills to `skills.known`, `combatSpell` to `combat_spell`, array flags to the Behind flag, and singular `structure` to structures. Import resolves resource tags against engine catalogs and ignores unknown resources. Loose units and units from all structures are collected in order; the first structure type is used because the editor supports one per side. Preserve these documented limitations until explicitly changing the model.

### 7. Save/share and open a shared battle

The header posts `{battle}` to `/saved-battles`. `BattleStore` recursively sorts object keys (preserving array order), serializes the payload, derives a SHA-256 ID, and inserts it with deduplication. The response contains `{id, url}`. The UI updates the URL to `/b/<id>`, copies the absolute link when clipboard access succeeds, and displays confirmation/fallback feedback. Shared records contain army setup, not results, draft-editor state, or a pinned baseline.

`GET /b/:id` serves the simulator HTML. On mount, the frontend recognizes a 64-character lowercase hex ID, fetches `/saved-battles/:id`, and imports the response. Missing/invalid IDs return 404; failures are shown in the UI. A shared-page visit neither restores nor overwrites the existing local draft, even when its armies are edited. Restoring a baseline explicitly exits that mode. Sharing an already-open local draft does not retroactively disable that session's autosave.

### 8. Martial-points activity checker

`GET /martial-points` serves `martial_points.html` and its separate React entry point. The user drops/selects an orders file; FileReader and `OrderParser` process it entirely in the browser. The parser recognizes ALH and advisor region comments, including optional underworld coordinates, and marks regions containing produce, tax, or pillage orders (including `@` forms). The report shows the count and per-region activity; reset returns to file selection. This tool does not use simulator Redux state, browser draft/baseline persistence, or the battle engine.

## Compatibility contracts

Read `src/frontend/BattleSimulator/PERSISTENCE.md` before changing autosave or comparisons.

- Local-storage keys are `atlantis.draft` and `atlantis.baseline`; both have a versioned envelope. `persistence.ts` defines explicit V1 DTOs/converters and runtime validators, independently of Redux internals.
- Frozen files in `__fixtures__/draft-v1.json` and `baseline-v1.json` are released-contract examples. Never rewrite old fixtures to make a breaking change pass. Add a schema version and migration in `decodeRecord`, retaining tests for every supported prior version. V1 is the first format; no pre-V1 format was released.
- Preserve malformed and unknown-version records. Pause writes and surface a warning rather than silently deleting, resetting, or overwriting them. Access/quota errors must not break simulation. The raw-value check detects another tab's changes but is not an atomic transaction.
- Keep draft and baseline writes separate. Full logs are intentionally excluded from baseline storage; do not imply results or local records synchronize across devices.
- Engine response field spellings such as `loses`, `attackerLooses`, and `occurance` are existing API fields. Correct visible labels through adapters; do not casually rename wire fields.
- SQLite IDs and existing public share URLs must continue to resolve. Canonical object ordering and meaningful array ordering affect IDs and must remain stable.

## Test responsibilities

Simulation-job tests additionally cover bounded scheduling, idempotent submissions, cancellation, hard process deadlines, output limits, temporary-file cleanup, restart recovery, queue expiry, result retention, HTTP routes, polling/reconnection, refresh recovery, and pinning the original setup after refresh. Tests cover import/export round trips and legacy imports, reducer editing/cancellation/duplication/totals, simulation failures/retry, result expansion/log tabs, SQLite deduplication, V1 storage fixtures, corrupted/future records, quota/access failures, cross-tab conflicts, draft reload/page-close flush, shared-page draft isolation, confirmation before restoration, and pinning the submitted setup while later edits occur. Extend the relevant behavior tests when changing a flow. Persistence tests use isolated browser storage and stores; avoid leaking localStorage or history between cases.
