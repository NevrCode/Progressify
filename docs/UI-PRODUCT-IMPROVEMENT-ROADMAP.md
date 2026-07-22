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

New users must understand several independent features before their dashboards
become useful. Empty screens can appear before users know what information they
need to enter.

### Recommended onboarding checklist

1. Create or confirm the user profile
2. Set body information
3. Choose a training objective
4. Choose a preferred workout split
5. Set calorie and macro goals
6. Add the first exercises
7. Log the first workout
8. Log the first meal

### UX requirements

- Allow users to skip and return later
- Show progress through setup
- Explain why each requested value is useful
- Avoid blocking access to the rest of the app
- Place a resumable setup checklist on Home until complete

## 4. Establish a strong empty-state system

### Current gap

Some empty areas explain that no data exists, but empty states are not yet a
consistent product pattern.

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

### Current gap

Loading, disabled, validation, and error behavior exists, but not yet as a
formal standard applied to every interactive component.

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

Several themes exist, but theme behavior is not yet completely systematic.

### Recommended work

- Persist the selected theme across app restarts
- Test contrast in every theme
- Replace unnecessary hard-coded colors with semantic tokens
- Make the startup screen use the active theme
- Define semantic chart colors
- Standardize card versus screen surface usage
- Rename `teriary` to `tertiary` through a controlled migration
- Verify skeleton colors in both dark and light themes

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
- Add theme persistence
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
