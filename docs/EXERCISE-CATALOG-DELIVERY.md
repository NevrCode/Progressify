# Exercise Catalog Delivery Plan

This roadmap adds an offline exercise catalog without rewriting the existing
exercise progression, session, set, or chart systems. Each pull request must be
independently releasable.

## Delivery sequence

| PR | Delivery | Status |
| --- | --- | --- |
| 1 | Generate, validate, and attribute the bundled exercise catalog | Implemented locally |
| 2 | Add catalog discovery, filters, selection, and custom-exercise fallback | Implemented locally |
| 3 | Persist an optional catalog exercise ID with user exercises | Implemented locally |
| 4 | Add a workout program model while retaining the existing split | Implemented locally |
| 5 | Display and manage the user's single active program | Implemented locally |
| 6 | Add routines and planned exercises alongside the existing split | Implemented locally |
| 7 | Start existing workout sessions from a routine | Implemented locally |
| 8 | Retire the legacy split field after the compatibility window | Planned |

Programs and routines are intentionally outside PR 1 and PR 2. The catalog can
therefore ship first without changing existing workout data or behavior.

## PR 1 — Bundled catalog foundation

### Included

- A build-time downloader and deterministic transformer for Free Exercise DB.
- A generated, offline JSON catalog containing strength exercises only.
- A small Progressify-owned schema instead of direct vendor-schema usage.
- TypeScript catalog types and a single import module.
- Validation for required fields, duplicate IDs, empty output, and stale output.
- Source and Unlicense attribution.

### Commands

```bash
npm run catalog:build
npm run catalog:check
```

`catalog:build` requires network access and deliberately runs only during catalog
maintenance. The mobile application never downloads the catalog at runtime.

### Acceptance criteria

- The generated catalog is committed and can be imported offline.
- Re-running generation without an upstream change produces the same file.
- Invalid or duplicate source records fail generation.
- Tests, lint, and TypeScript validation pass.
- Existing gym behavior is unchanged.

## PR 2 — Catalog picker implementation plan

PR 2 will consume the generated catalog but will not change the backend schema.
Selecting an item will prefill the existing Add Exercise form; the current save
request remains authoritative.

### User experience

1. The user opens Add Exercise from Gym Progression.
2. The screen initially presents **Choose from catalog** and **Create custom**.
3. Catalog mode shows a search field followed by compact filter controls.
4. Results show exercise name, primary muscle, and equipment.
5. Selecting a result opens a preview containing instructions and available
   exercise metadata.
6. **Use exercise** prefills the existing form.
7. The user supplies existing progression-specific values such as split and
   target reps, then saves through the current workflow.

### Components

- `exercise-catalog-picker.tsx`: owns search, filters, empty state, and selection.
- `exercise-catalog-list-item.tsx`: compact accessible result row.
- `exercise-catalog-preview.tsx`: selected exercise details and confirmation.
- Reuse the existing `FormField`, `SegmentedControl`, `AppButton`, and page
  container primitives.

### Search and filtering

- Search locally by exercise name, primary muscle, secondary muscles, and
  equipment.
- Normalize the query once with trim and lowercase.
- Provide optional primary-muscle and equipment filters.
- Keep all filtering synchronous and offline; no React Query or API request is
  needed for the bundled catalog.
- Use a virtualized list and memoized derived results so hundreds of records do
  not cause expensive full-screen rerenders.

### State boundaries

- Picker state stays local: query, filters, and selected catalog ID.
- The selected catalog record is mapped into the existing form state.
- Do not store vendor objects in AsyncStorage or React Query.
- Do not introduce programs, routines, or backend catalog persistence in PR 2.

### Accessibility and layout

- Preserve light and dark themes through the existing design tokens.
- Use minimum comfortable touch targets and explicit accessibility labels.
- Account for keyboard and bottom-tab insets.
- Provide skeleton rows only if opening/filtering is measurably asynchronous;
  local filtering should normally display immediately.
- Empty search results must offer **Create custom exercise**.

### Tests

- Search by name, muscle, and equipment.
- Combine search with each filter and clear all filters.
- Select an item and verify the existing form is prefilled correctly.
- Switch to custom mode and verify manual entry remains available.
- Verify empty state, dark theme, and a large result list.
- Run typecheck, lint, unit tests, and component tests.

### PR 2 completion boundary

PR 2 is complete when a user can discover a bundled exercise and save it through
the unchanged existing exercise endpoint. Persisting `catalogExerciseId` belongs
to PR 3.

## PR 3 — Persistent catalog identity

PR 3 adds the nullable `catalog_exercise_id` field to existing exercise
progressions. Catalog-created exercises send this stable ID through the existing
create/update API. Existing exercises remain custom until the user edits one and
chooses **Link to exercise catalog**. Linking, changing, or removing the catalog
reference does not replace the progression record, so its sessions, sets, and
charts remain attached.

The application does not automatically match legacy names. Manual confirmation
avoids incorrect links when one user-entered name could describe several catalog
movements.

## PR 4-7 — Flexible workout programs and routine sessions

PR 4-7 replaces the hard-coded PPL entry point with a program-first workflow
while preserving existing progressions, sessions, sets, and charts.

### Delivered model

- A user can have many historical programs but only one active program.
- A program contains ordered routines such as Push, Pull, Legs, Upper, Lower,
  Full Body, or any custom routine name.
- A routine contains ordered planned exercises that reference the user's
  existing exercise progressions. No progression history is copied or replaced.
- Planned exercises carry workout prescription values: target sets, minimum and
  maximum reps, optional target weight, notes, and display order.
- Starting a routine creates a workout-session parent and launches the existing
  active workout screen with those exercises.
- Completed exercise sessions remain the source of truth for volume, estimated
  1RM, and charts. Program data never stores calculated progression metrics.

### Templates and migration

The create-program screen offers Push/Pull/Legs, Upper/Lower, Full Body, Bro
Split, and Custom templates. Templates only create routine structure; the user
chooses their own exercises.

Database migration V12 creates an active PPL program for every user who already
has gym progressions. It maps each legacy progression into a planned exercise in
the corresponding Push, Pull, or Legs routine without changing its ID or history.
The old `split` column remains available during this compatibility release.

### API surface

All endpoints are authenticated and live below `/v1/gym`:

- list, create, edit, activate, and complete programs;
- create, edit, and delete routines;
- add, edit, and remove planned exercises;
- start a routine-backed workout session;
- complete the workout-session parent after its exercise sessions are saved.

### Compatibility and rollout

1. Deploy the backend and V12 migration first.
2. Confirm migrated users receive one active program and retain all progression
   history.
3. Deploy the frontend program screen and routine-start flow.
4. Keep the manual workout path as a fallback during the compatibility window.
5. Monitor creation and completion of routine-backed sessions before PR 8.

### PR 8 split-retirement gates

Do not remove `split` merely because PR 4-7 is deployed. PR 8 starts only when:

- supported frontend versions no longer require `split` to create or navigate
  exercises;
- every progression needed by a program is connected through a planned exercise;
- routine-backed workout-session creation and completion are stable in
  production;
- rollback no longer depends on an app version that reads the split field.

PR 8 should then stop writing `split`, make it optional in compatibility DTOs,
remove split-based UI and queries, run a final data audit, and only drop the
database column in a later migration. This staged removal prevents older clients
from breaking during rollout.
