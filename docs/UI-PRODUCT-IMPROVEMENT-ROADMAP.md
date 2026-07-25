# Progressify UI and Product Improvement Roadmap

> Recommendations based on the current frontend implementation and
> `UI-DESIGN-SYSTEM.md` review.
>
> Created: 22 July 2026.

## Executive summary

Progressify already contains substantial training and nutrition functionality.
Its largest opportunity is not simply adding more features. The app needs a
more unified product experience so that its screens feel like parts of one
coherent system rather than separate tracking tools.

The recommended priority order is:

1. build reusable UI primitives;
2. standardize accessibility and interaction states;
3. improve onboarding and empty states;
4. turn Home into a unified Today experience;
5. add weekly insights and reviews;
6. complete theme and visual-consistency work.

## 1. Build a real shared component library

### Implementation status

The initial foundation is implemented: `PageHeader`, `TabScreenScrollView`,
`AppButton`, `IconButton`, `FormField`, `DateNavigator`,
`PaginationNavigator`, and `SegmentedControl`. Home, Gym Progression, Food Diary,
and Profile have begun migration to these components. Remaining legacy controls
should be migrated incrementally when their surrounding workflows are changed.

### Current gap

The design system identifies recurring patterns, but several screens still
recreate headers, cards, selectors, inputs, pagination, and buttons through
inline styling. This makes visual consistency harder to maintain and causes
small variations between otherwise similar controls.

### Recommended components

- `PageHeader`
- `MetricCard`
- `IconButton`
- `PrimaryButton`
- `SecondaryButton`
- `DestructiveButton`
- `SegmentedControl`
- `DateNavigator`
- `PaginationNavigator`
- `FormField`
- `EmptyState`
- `ErrorState`
- `LoadingCard`
- `StatusBadge`

### Expected result

- Faster screen development
- Consistent spacing and interaction behavior
- Easier theme changes
- Fewer duplicated styles
- More reliable accessibility

## 2. Create a unified Today experience

### Current gap

Home provides useful summaries, but it does not always make the next best action
obvious. It behaves more like a collection of statistics than a daily command
center.

### Recommended additions

- Continue an active workout
- Show today's planned workout or rest day
- Prompt for the next unlogged meal
- Show current calorie balance
- Show protein-goal progress
- Show water progress and a quick-add action
- Present one clear daily completion goal
- Prioritize incomplete actions above historical summaries

### Product principle

Home should answer three questions immediately:

1. What is happening today?
2. What should I do next?
3. Am I on track?

## 3. Improve first-time onboarding

### Current gap

Home now provides a resumable setup checklist based on real nutrition, workout,
exercise, session, and food-history data. Users can collapse or dismiss it and
reopen it from Profile.

### Recommended onboarding checklist

1. Set the nutrition profile and goals
2. Create or activate a workout program
3. Add the first exercise progression
4. Complete the first workout session
5. Log the first food entry

### UX requirements

- Allow users to skip and return later
- Show progress through setup
- Explain why each requested value is useful
- Avoid blocking access to the rest of the app
- Place a resumable setup checklist on Home until complete

## 4. Establish a strong empty-state system

### Current gap

The shared `StatePanel` now standardizes the main Home, Gym Progression, Food
Diary, Workout Programs, and Profile states. Remaining secondary modals and
management screens should migrate as they are touched.

### Every empty state should communicate

- What belongs in this area
- Why the data is valuable
- How to create the first item
- One clear primary action
- Optional example or preview when it improves understanding

### Examples

- No exercises: explain exercise progression and offer `Add Exercise`
- No workout history: explain the chart and offer `Start Workout`
- No meals: explain daily macro tracking and offer `Log Food`
- No nutrition profile: explain personalized goals and offer `Set Up Profile`
- No weekly insight: explain that insights appear after sufficient activity

## 5. Add an insights layer

### Implementation status

The first explainable Home insight layer is implemented:

- the existing estimated 1RM improvement remains the primary training insight;
- latest training-day volume is compared with the preceding training day;
- seven-day training consistency uses unique completed-session dates;
- today's protein progress uses the current diary total and current goal;
- recent diary consistency uses unique logged dates from the cached history;
- every additional insight can reveal the calculation context through
  `Why am I seeing this?`;
- insights link to Gym Progression or Food Diary for the related detail.

The calculations live in `src/utils/home-insights.ts` and are derived at
runtime. They are not persisted as historical facts. The Home screen limits
the number shown so that the dashboard remains focused.

The Home weekly review is also implemented:

- the current seven UTC calendar dates are compared with the preceding seven;
- unique training days and `weight × reps` set volume are compared;
- food diary days are compared only when the date-sorted paged history reaches
  the complete 14-day window;
- incomplete diary history is disclosed instead of being presented as an exact
  result;
- future-dated records are excluded from both periods.

The review calculations live in `src/utils/weekly-review.ts`.

Personal-record and plateau signals are implemented in the Home insight engine:

- an estimated personal record requires at least three valid sessions and must
  exceed every earlier estimated 1RM by at least 1%;
- a plateau requires five valid sessions spanning at least 14 days, a latest
  session within the last 14 days, and no more than a 3% estimated 1RM range;
- future sessions and sets without valid weight and reps are ignored;
- a single exercise cannot produce duplicate record, ordinary improvement, and
  plateau messages;
- both primary and additional insight placements expose their calculation
  explanation.

Progression charts now provide a shared screen-reader summary:

- Gym Progression and Workout Session Management use the same accessible chart
  frame and summary calculation;
- multi-session charts announce the displayed date range, latest estimated
  1RM, best estimated 1RM with its date, and overall change from the first
  displayed session;
- single-session charts explicitly say that more history is required;
- invalid or empty histories do not produce fabricated chart trends;
- the visual chart layout and right-aligned initial scroll behavior are
  unchanged.

### Current gap

The app captures valuable data but often leaves interpretation to the user.
Progressify should explain what changed and why it matters.

### Recommended training insights

- Estimated 1RM change over a week or month
- Weekly volume change
- Exercise plateau detection
- Personal-record detection
- Muscle groups receiving too little or excessive volume
- Training frequency and consistency changes

### Recommended nutrition insights

- Protein-goal adherence
- Average calorie balance
- Days above or below the configured goal
- Most consistent meal category
- Hydration consistency
- Relationship between logged training days and nutrition adherence

### Example messages

- “Your bench estimated 1RM increased 6% this month.”
- “Weekly training volume is 12% lower than last week.”
- “You reached your protein goal on five of seven days.”
- “Legs received less weekly volume than Push and Pull.”

### Important rule

Insights must be calculated from underlying historical records. Do not store
precalculated chart averages or progression trends as database facts.

## 6. Improve offline and synchronization transparency

### Implementation status

The first synchronization details panel is implemented on Profile:

- the existing header badge remains the compact cross-screen indicator;
- Profile shows online, offline, pending, syncing, synchronized, and failed
  states with pending and failed counts;
- the last successfully replayed queued-change time is stored per owner in the
  device database and cleared with that owner's offline data;
- pending changes can be processed immediately while online;
- all failed changes can be retried in queue order;
- failed changes can only be discarded after destructive confirmation;
- the panel explains saved-locally, pending, synchronized, and failed states;
- mutation bodies and other sensitive queued payloads are not exposed in the
  panel.

Per-item failed recovery is also implemented:

- failed items expose only method, resource category, queued time, attempt
  count, and a status-derived error category;
- request bodies, raw URLs, URL identifiers, query parameters, tokens, and raw
  backend error messages are never returned to the UI;
- only the authenticated owner's failed items are read or changed;
- the oldest failed item can be retried or discarded individually;
- later failed items remain locked until earlier queue entries are resolved,
  preserving mutation order;
- per-item discard requires destructive confirmation.

### Current gap

Offline synchronization exists, but users need a clearer understanding of
whether their information is safely stored and synchronized.

### Recommended UI

- Last successful synchronization time
- Number of pending changes
- Offline indicator with a short explanation
- Failed-item list
- Retry-all action
- Per-item retry where appropriate
- Clear distinction between saved locally, pending, synchronized, and failed

### Recommended synchronization states

| State | Meaning |
| --- | --- |
| Saved locally | Data is safe on the device but not yet uploaded |
| Pending | Waiting for a connection or retry |
| Syncing | Upload or reconciliation is currently running |
| Synced | Server confirmed the latest version |
| Failed | User attention or another retry is required |

## 7. Standardize feedback and interaction states

### Implementation status

The first shared inline mutation-feedback pass is implemented:

- `ActionStatus` provides reusable success, error, and informational feedback
  with a polite live-region announcement and optional accessible dismissal;
- workout-session update and deletion feedback stays next to the manager or
  active edit modal;
- failed session updates preserve the entered date, notes, and set values;
- Food Diary now reports validation, confirmed success, recoverable failure,
  and offline-queued local success for single-food logging, diary deletion,
  custom foods, nutrition profiles, and manual goal overrides;
- queued custom-food creation no longer treats a local queue receipt as a
  server-created food, and queued nutrition-profile saving no longer tries to
  read unavailable calculated fields;
- meal-prep creation, editing, deletion, and diary logging place feedback in
  the initiating form, detail sheet, log sheet, or section while preserving
  failed draft data;
- workout-program actions report feedback on the page or inside the modal that
  initiated the action;
- program form values are reset only by successful mutation handlers;
- server-confirmed success and device-queued pending synchronization use
  different messages;
- destructive confirmation dialogs remain in place.

### Current gap

Shared buttons, fields, synchronization badges, skeletons, and state panels now
cover the main loading, disabled, validation, empty, error, offline, and success
patterns. Remaining older management screens should adopt these primitives
incrementally.

### Required states for controls

- Default
- Pressed
- Focused where relevant
- Disabled
- Loading
- Success
- Validation error
- Network error
- Offline and pending synchronization

### Recommended behavior

- Disable only the affected action during a mutation
- Keep unrelated screen content interactive
- Show local loading feedback inside the affected control
- Preserve form values when a network request fails
- Explain validation errors next to the relevant field
- Never use a full-page loading state for a small mutation

## 8. Define and enforce accessibility standards

### Recommended baseline

- Minimum interactive target around 44×44 points
- Screen-reader labels for every icon-only action
- Screen-reader state for selected, disabled, expanded, and busy controls
- Sufficient text and border contrast in every theme
- Support for system font scaling
- Reduced-motion behavior
- Logical focus and reading order
- Do not communicate status through color alone
- Provide text summaries for important charts

### Immediate review item

The default Dark Gym theme uses `#6B6B6B` secondary text on `#0A0A0A`. This
combination should be tested against the intended text sizes and accessibility
contrast target.

### Chart accessibility

Each important chart should provide a readable summary such as:

- current value;
- direction and percentage of change;
- highest and lowest point;
- covered date range.

## 9. Complete theme support

### Current gap

Theme selection now persists, startup surfaces and the status bar respect the
active palette, contrast utilities cover all palettes, the `tertiary` token is
correctly named, and nutrition/status/skeleton colors have a semantic
light/dark layer. Main dashboard cards now consistently use `theme.card`.

### Recommended work

- Review older nested/modal surfaces as their screens are touched
- Continue replacing accidental hard-coded colors as screens are touched

### Product decision

Theme support should either become fully reliable or be temporarily reduced to
a smaller set of verified themes.

## 10. Add optional reminders and notifications

### Recommended reminders

- Planned workout
- Incomplete active workout session
- Meal logging
- Water intake
- Weekly review availability
- Failed backup or synchronization

### Requirements

- Notifications must be opt-in
- Each reminder type must be independently configurable
- Users must control schedule and quiet hours
- Reminders should link directly to the relevant app action
- Avoid guilt-based or aggressive messaging

## 11. Create a weekly review screen

### Recommended contents

- Workouts completed
- Total training volume
- Strongest progression
- New personal records
- Muscle-group distribution
- Average calorie intake
- Average protein intake
- Goal-adherence days
- Hydration consistency
- Current streak
- Suggested focus for the next week

### Why this matters

A weekly review converts logged information into a sense of progress. It can
become one of Progressify's strongest differentiating experiences.

## 12. Make the design system prescriptive

### Current gap

`UI-DESIGN-SYSTEM.md` accurately describes much of the existing UI, but a
mature design system must also state which choices are required for new work.

### Tokens and standards to formalize

- Exact spacing scale
- Exact radius scale
- Typography scale
- Icon sizes and weights
- Button variants
- Input variants
- Card variants
- Semantic status colors
- Minimum touch-target requirements
- Animation durations and easing
- Skeleton construction rules
- Rules for cards versus plain sections
- Rules for modal versus full-screen workflows
- Bottom-navigation clearance

## Recommended implementation phases

### Phase 1 — Foundation

- Define spacing, radius, typography, and interaction-state tokens
- Implement shared buttons, icon buttons, headers, inputs, and navigators
- Theme persistence (completed)
- Fix font-weight mapping
- Establish accessibility requirements

### Phase 2 — Consistency

- Migrate Home, Gym, Food Diary, and Profile to shared primitives
- Standardize cards, empty states, error states, and local loading behavior
- Audit tab-bar clearance on every tab screen
- Remove avoidable hard-coded colors

### Phase 3 — First-use experience

- Add resumable onboarding
- Improve empty states
- Add a Home setup checklist
- Provide example-driven guidance for first workout and first meal

### Phase 4 — Daily experience

- Restructure Home around today and the next best action
- Improve offline and synchronization transparency
- Add optional reminders

### Phase 5 — Intelligence

- Build training and nutrition insights
- Create the weekly review
- Add accessible chart summaries
- Validate insight quality against real historical data

## Suggested success criteria

- A new user can reach their first logged workout and meal without external help
- Every primary screen has clear loading, empty, error, and offline behavior
- All icon-only controls have accessible labels
- All themes pass the selected contrast target
- Floating navigation does not cover screen actions or content
- Shared primitives replace duplicated core control styling
- Home clearly communicates today's status and next action
- Weekly review provides at least one useful, explainable insight

## Related documentation

- `docs/UI-DESIGN-SYSTEM.md` — current visual system and screen structure
- `src/constants/colors.ts` — theme definitions
- `src/context/ThemeContext.tsx` — active theme state
- `src/components/base/` — shared UI primitives
- `src/app/(tabs)/home.tsx` — current Home composition
- `src/app/(tabs)/gymProgression.tsx` — current Gym composition
- `src/app/(tabs)/foodDiary.tsx` — current Food Diary composition
- `src/app/(tabs)/profile.tsx` — current Profile composition
