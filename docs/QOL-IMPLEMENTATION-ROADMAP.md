# Progressify Quality-of-Life Implementation Roadmap

## Purpose

This document defines the implementation order, ownership boundaries, acceptance criteria, and reviewer gates for the next Progressify quality-of-life improvements.

The active system is:

- `Progressify/`: Expo mobile application
- `progressify-api/`: Go API

The legacy Java project is out of scope.

Implementation will use bounded Terra agents. The primary agent acts as integration manager and reviewer between waves. Agents must not modify overlapping foundations concurrently.

## Current implementation status

- **Wave 1 / active-workout foundation: substantially complete.** Workout drafts are versioned, draft operations are pure, rest-timer behavior is behind a dedicated hook, and completion plus add/swap picker UI are extracted. The exercise card and set table intentionally remain inline because their current extraction interface would be callback-heavy and shallow.
- **Wave 1 / food foundation: complete at the selected seam.** Date/header, nutrition overview, diary entries, meal lists, and the complete food-logging flow are focused modules. Profile/goals, diary deletion, and meal-prep orchestration remain in the route by design.
- **Wave 2 / workout prefill: complete.** The latest completed session prefills weight, reps, and RIR; persisted drafts win; recommendations remain explicit.
- **Wave 2 / routine duplication: complete.** Duplication is explicit, owner-scoped, transactional, and idempotent.
- **Wave 2 / repeat last workout: blocked.** A versioned immutable completed-session exercise snapshot does not yet exist.
- **Wave 2 / rest experience: complete with vibration fallback.** Per-exercise defaults and active/paused timer restoration are implemented. Optional haptic/audio preferences remain pending because the project has no preference model or installed haptics/audio dependency.
- **Wave 3 / working-set model: complete.** The Go-owned migration under `progressify-api/supabase/migrations` has been applied. Go and Expo persist `WORKING`/`WARMUP`, migrate legacy data to `WORKING`, render classifications, and exclude warm-ups from volume, top-set, estimated-1RM, recommendation, weekly-review, and muscle-heatmap calculations.
- **Wave 3 / set interactions: complete.** Active drafts v3 persist per-set completion. Swipe and accessible button actions complete, duplicate, and remove sets; deletion has a five-second local undo and completion starts rest exactly once.
- **Wave 4 / routine structure: implementation complete; migration deployment pending.** One revisioned whole-program layout endpoint atomically owns routine order, exercise order, and explicit superset groups. Expo provides bounded vertical drag gestures plus visible move controls, reload-and-repeat conflict handling, draft-v4 launch snapshots, grouped active-workout rendering, and deterministic post-round rest. The additive Wave 4 migration must be applied before deploying the schema-aware Go API. A polished finger-following list remains optional device-level enhancement work because no drag-list dependency is installed.

## Requested improvements

- Pre-fill exercise sets from the previous session.
- Repeat the last workout.
- Duplicate routines.
- Configure default rest times per exercise.
- Support metric and imperial units.
- Distinguish warm-up sets from working sets.
- Support supersets and exercise groups.
- Add swipe actions for completing, duplicating, and removing sets.
- Replace manual workout-history dates with a native date picker.
- Improve offline queue inspection and conflict resolution.
- Add undo snackbars for food, set, session, and routine deletion.
- Add favorite and recent foods/exercises.
- Reorder routines and exercises with drag and drop.
- Harden unfinished-workout recovery after restart or crash.
- Add haptic and optional audio feedback when rest ends.
- Continue decomposing oversized screens.

## Existing foundations

Several requested capabilities are partially implemented and should be extended rather than rebuilt:

- Active workouts use a versioned, backward-compatible stored draft that preserves configured rest values and active/paused timer state.
- Previous session data initializes new workout sets while progression recommendations remain an explicit optional action.
- Planned exercises persist configurable `rest_seconds`, and routine launches carry those defaults into active workouts.
- Rest completion triggers guarded vibration once; configurable haptic/audio preferences are not yet available.
- `@react-native-community/datetimepicker` is installed and used elsewhere.
- The SQLite offline queue already supports persistence, owner isolation, idempotency keys, retry, discard, and status summaries.
- The sync status panel already exposes basic pending and failure information, but it does not provide semantic conflict resolution.
- The food diary and active-workout screens have already begun being decomposed into focused components.

## Dependency overview

```text
Screen decomposition and shared domain types
        |
        +-- Versioned active-workout draft
        |       +-- Previous-session prefill
        |       +-- Set swipe actions
        |       +-- Crash-safe recovery
        |       +-- Rest timer persistence and feedback
        |
        +-- Working-set classification
        |       +-- Warm-up sets
        |       +-- Correct volume and PR calculations
        |       +-- Correct progression recommendations
        |       +-- Repeat-workout snapshots
        |
        +-- Versioned routine layout
        |       +-- Atomic reorder
        |       +-- Routine duplication
        |       +-- Supersets and groups
        |
        +-- Canonical measurement utilities
        |       +-- Metric/imperial preferences
        |
        +-- Typed optimistic/offline mutations
                +-- Sync details
                +-- Conflict resolution
                +-- Durable undo
```

## Parallel execution model for Waves 1 and 2

Waves 1 and 2 may run during the same implementation window, but they are divided into file-ownership tracks. Parallel execution does not mean multiple agents may edit the active-workout route or draft model simultaneously.

```text
Track A: workout-foundation
  owns activeWorkoutSession, draft model, persistence/timer boundaries

Track B: food-foundation
  owns foodDiary and extracted food components

Track C: routine-actions
  owns Go routine copy/repeat contracts, stores, handlers, and program service/UI

Track D: rest-contract
  owns planned rest-duration API/client/editor and feedback utilities

After Track A publishes its interfaces:
  workout-prefill integrates through the new draft initializer
  rest-experience integrates through the new timer controller
```

Parallel safety rules:

- Tracks A, B, C, and the non-active-screen portion of D may begin together.
- `workout-prefill` may research and add backend/query fixtures in parallel, but it must not define a competing draft model or edit the active-workout route before Track A's handoff.
- `rest-contract` may implement planned-rest editing, client contracts, and test fixtures in parallel. The active timer integration remains blocked until Track A's timer interface is reviewed.
- `routine-actions` may complete independently because it does not need to edit the active-session controller. Repeat navigation into the active workout is added only through Track A's reviewed entry contract.
- Integration branches must rebase on the reviewed foundation rather than manually copying foundation code.

## Wave 1: Stabilize the foundations

### Terra agent: `workout-foundation`

Refactor the active workout without changing its behavior.

Responsibilities:

- Extract versioned workout-draft types and pure reducer operations.
- Extract active-session persistence into a dedicated hook/service boundary.
- Extract rest-timer state into a dedicated hook.
- Extract the exercise card, set row, exercise picker, and completion controls.
- Preserve progressive-overload recommendations.
- Add characterization tests before moving behavior.

Acceptance criteria:

- Existing persisted workouts remain loadable.
- Current workout creation, editing, restoration, completion, swapping, and timer behavior is unchanged.
- Draft mutations are testable without rendering the entire route.
- The route owns orchestration rather than detailed rendering and mutation logic.

### Terra agent: `food-foundation`

Continue decomposing the food diary independently.

Responsibilities:

- Separate the screen controller from presentation.
- Extract date/header orchestration.
- Extract nutrition summary orchestration.
- Isolate the add-food/custom-food flow.
- Keep meal-prep behavior in its existing focused components.

Acceptance criteria:

- No API or user-visible behavior changes.
- Food queries and mutations keep their existing cache invalidation behavior.
- The screen is divided into cohesive, independently testable sections.

These two agents may run concurrently because they own separate screens.

## Wave 2: Fast workout improvements

Wave 2 backend, store, API, program-editor, and test work may run alongside Wave 1. Changes that integrate into the active workout must wait for the `workout-foundation` interface handoff.

### Terra agent: `workout-prefill`

- During Wave 1, audit latest-session ordering and add contract fixtures without editing the active route.
- After the foundation handoff, implement prefill through the shared draft initializer.
- Initialize draft sets from the latest completed exercise session.
- Preserve previous weight, reps, and RIR per working set.
- Fall back to planned targets or one empty set when no history exists.
- Keep progressive-overload recommendations explicit and optional.
- Confirm before replacing user-entered data.

Acceptance criteria:

- Starting a workout immediately shows useful previous values.
- Prefill never marks sets or exercises complete.
- Applying a progression recommendation remains a separate action.
- An exercise without history still starts safely.

### Terra agent: `routine-actions`

- This agent may run fully in parallel with both Wave 1 foundation agents.
- Add an atomic duplicate-routine API operation.
- Add a repeat-last-workout API operation based on a completed server snapshot.
- Add missing mobile wrappers for routine update and deletion operations.
- Preserve idempotency across retries.

Acceptance criteria:

- Duplicate routine copies exercises, targets, rest settings, order, and future grouping fields in one transaction.
- Offline or retried requests cannot produce partial duplicates.
- Repeat creates a new session and never modifies the historical session.
- Every action requires an explicit user command.

#### Current repeat-last-workout blocker

The current `gym_workout_sessions` record persists the routine reference and
routine-name snapshot, but not an immutable snapshot of its planned exercises.
Completing a session therefore reads the routine's current planned exercises,
which can be edited or deleted after the workout. Do not expose a repeat API
until a versioned completed-session exercise snapshot is persisted and returned;
otherwise repeat could silently start a different workout than the completed one.

### Terra agent: `rest-contract`

This portion may run in parallel with Wave 1:

- Add or verify client contracts for planned `rest_seconds`.
- Add program-editor controls for default rest duration.
- Add test fixtures for rest-duration validation and persistence.
- Prepare haptic/audio preference utilities without editing the active timer controller.

### Terra agent: `rest-experience`

This integration portion starts after the workout-foundation timer handoff:

- Use the planned exercise's existing `rest_seconds` value.
- Add editing controls for default rest duration.
- Persist timer state using an absolute `endsAt` value.
- Restore paused and active timers accurately.
- Add foreground haptic and optional audio feedback.

Acceptance criteria:

- The configured exercise rest duration replaces the hard-coded 90 seconds.
- Timer recovery is based on elapsed real time rather than stale counters.
- Completion feedback fires once.
- Unsupported devices retain a safe vibration fallback.

## Wave 3: Correct training semantics

Before Wave 3, confirm the authoritative production migration location. The Go repository currently does not own a committed migration directory.

### Terra agent: `working-set-model`

Add an explicit set classification:

```text
set_type = WORKING | WARMUP
```

Existing records default to `WORKING`.

Responsibilities:

- Add the forward migration and compatible Go/mobile fields.
- Backfill existing records safely.
- Exclude warm-up sets from working volume, top-set metrics, PRs, and progressive-overload recommendations.
- Preserve warm-up sets in session history.

Acceptance criteria:

- Existing clients continue working with the additive field.
- Warm-ups are visually distinct.
- Warm-ups never affect progression recommendations or working volume.
- Historical records behave as working sets after migration.

### Terra agent: `set-interactions`

Begins only after the versioned draft and set classification are available.

- Add swipe-to-complete.
- Add swipe-to-duplicate.
- Add swipe-to-remove.
- Provide accessible button/action alternatives.
- Add local undo for unsaved set removal.

Acceptance criteria:

- Completion validates the set before changing state.
- Duplicate receives a new local identity and correct set number.
- Remove can be undone before persistence.
- Swipe gestures never become the only accessible interaction.

## Wave 4: Routine structure

### Terra agent: `routine-layout`

- Add routine revision/version fields.
- Add one atomic whole-program layout endpoint for routine order, exercise order, and grouping.
- Add drag-and-drop interaction on mobile.
- Return a structured conflict when the submitted revision is stale.

Acceptance criteria:

- A reorder succeeds or fails atomically.
- Positions remain unique and deterministic.
- Reordering persists after reload and synchronization.
- Stale edits produce an explicit conflict rather than silent last-write-wins.

### Terra agent: `superset-model`

- Add an explicit stable group identifier and member order.
- Keep individual exercise sets and metrics independent.
- Define group-level rest behavior.
- Render grouped exercises together during active sessions.

Acceptance criteria:

- Groups are not inferred from adjacent positions.
- Reordering does not accidentally dissolve or create groups.
- Exercise history remains attributed to the correct exercise.
- Group rest behavior is documented and deterministic.

Routine layout and superset contracts must be designed together even if separate agents implement them.

## Wave 5: Independent UX improvements

### Terra agent: `measurement-preferences`

- Add an account-level metric/imperial preference.
- Keep API/database storage canonical in kilograms and centimetres.
- Add shared conversion, parsing, formatting, and rounding utilities.
- Audit workout inputs, history, charts, progression recommendations, nutrition profile, and relevant food quantities.

Acceptance criteria:

- Changing units never mutates stored performance data.
- Input is converted to canonical values before API submission.
- Display values round consistently.
- Conversion round-trip tests cover kg/lb and cm/ft-in.

### Terra agent: `native-date-field`

- Build a reusable native date-picker field.
- Replace manual `YYYY-MM-DD` editing in workout history.
- Preserve the API's date-only string contract.

Acceptance criteria:

- Android and iOS cancellation/selection behavior works correctly.
- Date serialization does not shift dates across time zones.
- Manual invalid date entry is eliminated.
- No additional date-picker dependency is introduced.

### Terra agent: `search-discovery`

- Add favorites for food and exercise resources.
- Derive recent foods after actual logging.
- Derive recent exercises after actual use.
- Present Favorites, Recent, then matched results.
- Deduplicate resources across sections.

Acceptance criteria:

- Search text alone does not create a recent item.
- Favorites synchronize across devices when online.
- Stable namespaced identities distinguish custom and external foods.
- Optimistic favorite toggles reconcile after failure.

## Wave 6: Offline details, conflicts, and undo

### Terra agent: `sync-details`

Extend the existing queue rather than replacing it.

- Add a Sync Details route.
- Show redacted resource/action descriptions.
- Show queued time, last attempt, attempts, status, and stable error category.
- Support individual retry/discard and existing bulk actions.
- Invalidate related React Query keys after queued success.

Acceptance criteria:

- Tokens and arbitrary sensitive bodies are never displayed.
- Queue ordering consequences are clearly explained.
- Successful replay refreshes visible application data.
- Existing owner isolation and persistence guarantees remain intact.

### Terra agent: `conflict-resolution`

- Distinguish conflicts from generic failed operations.
- Add resource revision/current-state information to structured conflicts.
- Offer reload, retry as a fresh mutation, or discard.
- Never silently apply last-write-wins.

Acceptance criteria:

- A repeated idempotency key is not reused for a semantically changed resolution.
- Conflicts survive restart and remain inspectable.
- Retrying does not bypass ownership or validation.
- Strict queue-order behavior remains explicit.

### Terra agent: `undo-mutations`

Begins only after restore contracts and conflict behavior are defined.

- Add a reusable accessible undo snackbar.
- Add resource-specific adapters for food, set, session, and routine deletion.
- Cancel an unsent queued deletion where possible.
- Use explicit restore endpoints after a server deletion completes.

Acceptance criteria:

- Undo cannot create a duplicate resource with a new identity.
- Restoring a session or routine has documented descendant behavior.
- Snackbar expiry, successful undo, unavailable undo, and offline races are tested.
- Draft-only set deletion remains a local undo operation.

## API and schema rules

- Prefer additive `/v1` response fields so older mobile clients remain compatible.
- Add nullable fields, backfill, then enforce constraints in a later deployment when necessary.
- Use existing `Idempotency-Key` support for every create, copy, repeat, delete, restore, and layout mutation.
- Duplication, repeat, grouping, and reorder operations must be transactional.
- Do not store display units alongside workout measurements.
- Return stable error codes and structured conflict data.
- Index latest-session, ordered-layout, favorite, and recent-history queries.
- Do not infer server state from the mobile cache when an authoritative snapshot is required.

## Agent ownership rules

- Only one agent may own `activeWorkoutSession.tsx` or its extracted session controller in a wave.
- During the combined Wave 1/2 window, `workout-foundation` exclusively owns the active route, draft model, persistence hook, and timer hook until it publishes a reviewed handoff.
- `workout-prefill` and `rest-experience` consume that handoff; they must not create parallel replacements.
- `routine-actions` owns program/routine Go handlers, stores, service wrappers, and program-management UI during the combined window.
- `food-foundation` exclusively owns the food diary route during the combined window.
- Only one agent may change the workout set schema and recommendation calculations.
- Only one agent may change offline queue persistence semantics at a time.
- UI agents consume reviewed API contracts; they do not invent competing payloads.
- Agents preserve unrelated dirty-worktree changes.
- Agents must use CodeGraph before exploring indexed code and follow repository RTK instructions.

## Primary reviewer gates

The primary agent reviews every wave before the next wave starts.

Required checks:

1. Confirm file ownership and absence of overlapping agent edits.
2. Review schema and API contracts before dependent UI implementation.
3. Reject unnecessary abstraction and callback-heavy relocation of complexity.
4. Verify backward-compatible mobile and API behavior.
5. Verify idempotency and offline replay for every mutation.
6. Verify warm-ups cannot affect recommendations, working volume, PRs, or working-set prefill.
7. Verify unit preferences never change canonical stored numbers.
8. Verify copy, repeat, apply, restore, reorder, and conflict actions remain explicit.
9. Run full Go tests.
10. Run frontend typecheck and lint.
11. Run focused unit/component tests for each feature.
12. Run relevant offline, restart, concurrency, and E2E scenarios.

## Rollout strategy

- Land foundation refactors without behavior changes first.
- Use capability checks or feature flags for schema-dependent workout behavior.
- Deploy additive API/schema support before enabling dependent mobile UI.
- Keep existing stored workout drafts backward-compatible through an explicit draft-version migration.
- Roll out warm-up semantics before enabling warm-up-aware recommendations or repeat snapshots.
- Roll out conflict inspection before durable offline undo.

## First implementation action

Begin with the combined Wave 1/2 execution window:

1. Dispatch `workout-foundation`, `food-foundation`, `routine-actions`, and `rest-contract` concurrently, subject to the available agent limit.
2. Give every agent an explicit file-ownership allowlist before implementation.
3. `workout-foundation` and `food-foundation` make no behavior changes.
4. `routine-actions` may deliver its atomic backend/API and program-management behavior independently.
5. `rest-contract` may deliver program rest configuration, but not active-timer integration.
6. Review the workout foundation and publish its draft/timer interfaces.
7. Dispatch or unblock `workout-prefill` and `rest-experience` against those reviewed interfaces.
8. Run an integration review across all tracks before starting schema-dependent Wave 3 work.
