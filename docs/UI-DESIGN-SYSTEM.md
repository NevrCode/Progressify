# Progressify UI Design System

> Code-based documentation of the current React Native / Expo interface.
> Last reviewed: 24 July 2026.

## 1. Product UI identity

Progressify is presented as a compact personal dashboard for training, nutrition,
and progress tracking. The current visual direction is:

- dark, gym-oriented, and data-focused by default;
- rounded cards with fine borders and restrained glow effects;
- a bright accent color for actions, progress, selection, and status;
- dense information split into small summaries, charts, pills, and expandable cards;
- layout-matched shimmer skeletons instead of generic full-screen spinners;
- short labels and strong numeric hierarchy.

The interface supports several color themes, but `darkGym` is the default and is
the clearest expression of the current product identity.

## 2. Theme and color tokens

Theme values live in `src/constants/colors.ts` and are provided through
`ThemeContext`.

### Default: Dark Gym

| Token | Value | Current use |
| --- | --- | --- |
| `primary` | `#00E676` | Main accent, active controls, progress, icons |
| `secondary` | `#00C853` | Secondary green accent |
| `tertiary` | `#1B5E20` | Supporting accent |
| `background` | `#0A0A0A` | Screen and navigation background |
| `card` | `#161616` | Elevated card surface |
| `textBlack` | `#FAFAFA` | High-emphasis headings and primary values |
| `text` | `#E0E0E0` | Standard body text |
| `textLight` | `#929292` | Captions, metadata, inactive navigation |
| `border` | `#1E1E1E` | Card, input, divider, and control outlines |
| `white` | `#FFFFFF` | Text placed on strong accent backgrounds |
| `income` | `#69F0AE` | Positive trends and success values |
| `expense` | `#FF5252` | Destructive actions, warnings, negative trends |
| `bar` | `#00E676` | Bar/chart accent |
| `shadow` | `#000000` | Card shadow base |

Most translucent states are produced by appending an alpha value to a theme
color, for example `theme.primary + "15"` for a subtle selected background and
`theme.primary + "30"` for an accent border.

Status and data-visualization colors live in
`src/constants/semantic-colors.ts`. `getThemeSemantics(theme)` provides
`success`, `danger`, `warning`, `info`, selected, and disabled states that adapt
to light and dark card surfaces. `getNutritionAccents(background)` provides the
stable calorie, protein, carbohydrate, fat, and water palette without binding
those meanings to a single theme. `getSkeletonColors(theme)` supplies verified
base and highlight colors for light and dark loading surfaces.

### Contrast baseline

- Normal text targets a minimum 4.5:1 contrast ratio.
- Large text and nonessential graphical details target at least 3:1.
- Every theme's `textLight` token is verified against both `background` and
  `card`.
- Primary buttons calculate the highest-contrast foreground from the available
  light and dark theme neutrals instead of assuming that white or the screen
  background is always readable.
- Important labels are 11px or larger; 9–10px remains reserved for
  nonessential chart details that also have an accessible text alternative.

### Other available themes

- `coffee`: warm brown on cream;
- `forest`: natural green on pale green;
- `purple`: purple on a light lavender surface;
- `ocean`: blue on pale cyan;
- `green`: bright green on near-white;
- `darkGym`: neon green on black.

Theme switching is held in React state and synchronously hydrated from
Expo SQLite-backed `localStorage`. The selected key is
`progressify.theme`, so the active theme survives a full app restart without a
light-to-dark flash after the first render.

## 3. Typography

The application uses **Plus Jakarta Sans** throughout the main UI.

Loaded weights:

- 400 Regular;
- 500 Medium;
- 600 SemiBold;
- 700 Bold;
- 800 ExtraBold.

Font-family names are centralized in `src/constants/typography.ts`.
`createWithFont` maps weight 600 to the actual
`PlusJakartaSans_600SemiBold` face rather than synthesizing it from the
500-weight font.

The shared style helper maps requested weights as follows:

| Requested weight | Font family used |
| --- | --- |
| 800 or 900 | `PlusJakartaSans_800ExtraBold` |
| 700 | `PlusJakartaSans_700Bold` |
| 500 or 600 | `PlusJakartaSans_500Medium` |
| Regular/default | `PlusJakartaSans_400Regular` |

Note: the 600 SemiBold font is loaded but the helper currently maps 600 to the
500 Medium file.

### Current type hierarchy

| Role | Typical styling |
| --- | --- |
| Page eyebrow | 11–12px, 800, uppercase, 1.2–1.5 letter spacing |
| Page title | 28px, 800/900, approximately `-0.8` letter spacing |
| Section title | 18px, 800 |
| Card title | 14–16px, 700–900 |
| Major numeric value | 20px or larger, 800/900 |
| Body text | 12–14px, 400–600 |
| Metadata/caption | 9–12px, 600–800, usually `textLight` |
| Button/action label | 12–14px, 800 |

Numbers in pagination use tabular numerals so their width remains stable.

## 4. Spacing, shape, and surfaces

The common screen container uses:

- 20px horizontal and top padding;
- a 16px vertical gap between major sections;
- extra bottom padding on tab screens to clear the floating navigation bar;
- the active theme background across the full scroll area.

Common shape rules:

- main cards: 16px radius;
- secondary cards and large controls: 12–16px radius;
- compact buttons: 8–10px radius;
- search, segmented controls, banners, and navigation: capsule-like 20–30px radius;
- icon containers: commonly 32, 36, 40, or 44px square.

`ShadowGlowCard` is the main surface primitive:

- theme card background;
- 16px radius and 16px internal padding;
- 1px standard border or 1.5px glow border;
- 12px bottom margin;
- restrained shadow by default and stronger shadow when a glow color is given.

## 5. Navigation

The primary app navigation contains four tabs:

1. Home
2. Gym
3. Food
4. Me

The tab bar is a floating dark capsule:

- 58px tall;
- 18px horizontal outer margin;
- 14px Android or 18px iOS bottom margin;
- 30px radius;
- absolutely positioned over screen content.

The active tab becomes an outlined accent pill containing both its icon and
label. Inactive tabs primarily show their icon. The active icon/label animates
with a spring and respects the device reduced-motion setting.

Because the tab bar floats above content, tab screens must reserve additional
bottom padding rather than relying only on the device safe-area inset.

## 6. Standard page header

The main tabs use a consistent header pattern:

- uppercase eyebrow at the upper left;
- 28px page title below it;
- sync-status badge on the right;
- 44px themed icon tile beside the sync badge.

Examples:

| Screen | Eyebrow | Title | Icon concept |
| --- | --- | --- | --- |
| Home | Greeting/context | Progressify | Dashboard/account |
| Gym | Progressify | Progression | Dumbbell |
| Food | Nutrition | Food Diary | Restaurant |
| Profile | Account context | Profile | User |

## 7. Homepage structure

The Home screen is a unified Today dashboard rather than a complete editing
surface or a Nutrition/Training switcher. Its current structure is:

1. greeting and full current date;
2. one contextual workout action;
3. compact Calories, Protein, Water, and Training metrics;
4. seven-day training summary and one calculated insight;
5. the two most recent completed exercise activities;
6. a local retry banner when one or more dashboard sources fail.

The contextual action resumes a locally stored active session first. Without an
active session, it opens the user's active program so they can choose a routine.
If no program exists, it opens the manual workout flow. The app does not invent
a scheduled “today routine” because the current program model has no weekday
schedule.

### Today summary

- Uses live diary progress for calories and protein.
- Uses the user-scoped local water total.
- Provides compact `−250 ml`, `+250 ml`, and `+500 ml` water controls directly
  below the Today metrics.
- Gives each metric a stable semantic accent: orange calories, purple protein,
  blue water, and theme-green training.
- Uses completed session dates for the seven-day training figure.
- Keeps the four metrics visible together without a segmented mode switch.
- Uses a layout-matched skeleton while initial data is unavailable.

### Recent activity card

- Shows the two most recently completed exercise sessions.
- Links to the complete Gym Progression screen.
- Shows calculated estimated 1RM when the latest session has valid sets.
- Uses compact card-row skeletons during initial loading and preserves cached
  content during background refetching.

## 8. Gym Progression screen

The Gym screen combines global training statistics with an editable, paginated
exercise list.

Current order:

1. standard header;
2. summary strip for exercise count, best estimated 1RM, and total volume;
3. `Start a Workout` launcher;
4. active-session resume banner when applicable;
5. weekly muscle-volume heatmap with front and back body views;
6. exercise search field;
7. searchable, paginated exercise progression list;
8. Exercise Progression heading and add action;
9. five exercise cards per page;
10. connected pagination navigator above the floating tab bar.

### Exercise progression card

The collapsed card contains:

- exercise name;
- positive or negative estimated-1RM trend badge when available;
- muscle group and target-rep chips;
- most recent session date;
- expand/collapse affordance;
- edit and delete actions.

The expanded card contains:

- dynamically calculated session progression chart;
- a horizontally scrollable chart that initially opens at the newest/rightmost
  session without animating through older history;
- session/set details;
- weight, repetitions, and RIR values;
- exercise notes when present.

Chart metrics are derived from historical sessions rather than stored chart
averages.

### Pagination

- Page size is fixed at five exercises.
- The control is one bordered surface inspired by the Food Diary date navigator.
- It has a left chevron, up to seven centered page numbers, and a right chevron.
- The current page uses a subtle accent background and bold accent text.
- Changing search returns to page one.
- Loading a new uncached page shows five skeleton cards in place of the list.

## 9. Food Diary screen

The Food Diary is arranged as a date-based nutrition workspace.

Current order:

1. standard Nutrition / Food Diary header;
2. date navigator with left arrow, centered date, and right arrow;
3. body/profile summary strip;
4. Intake Summary card;
5. Today's Meals card;
6. segmented Add Food / Meal Prep selector;
7. food logging or meal-prep workflow.

### Date navigator

This is the reference layout for simple previous/next navigation:

- one connected bordered surface;
- 36px tinted arrow buttons;
- centered primary value and small supporting label;
- no visually detached Previous/Next buttons.

### Intake Summary card

- Consumed, Goal, and Remaining calorie values form the top summary row.
- Protein, carbohydrate, and fat appear as labelled progress bars.
- Nutrition accents match Home: orange for calories, purple for protein, blue
  for carbohydrate, and warm yellow for fat. Status colors remain reserved for
  on-track and over-goal feedback.
- Additional macro rows can be expanded.
- Profile and goal override actions remain compact secondary buttons.

### Today's Meals card

- Entries are grouped by meal type: Breakfast, Lunch, Dinner, and Snack.
- Each group includes a heading and item-count pill.
- Each food row uses a meal-colored left border, food name, macro pills, and a
  compact delete action.

## 10. Profile screen

The Profile tab follows the same eyebrow/title header hierarchy. It contains:

- account/profile identity;
- account and application settings grouped into menu sections;
- refresh and error feedback;
- app version information at the bottom.

Profile menu actions use reusable menu-row components rather than dashboard
cards.

## 11. Shared components

| Component | Responsibility |
| --- | --- |
| `PageHeader` | Shared eyebrow, page title, sync status, and optional header action |
| `TabScreenScrollView` | Automatic safe-area handling and floating-tab-bar clearance |
| `AppButton` | Primary, secondary, destructive, and ghost button variants |
| `IconButton` | Accessible 44px icon-only action and local loading state |
| `ModalHeader` | Accessible modal title, optional supporting text, and compact close action |
| `SelectionCard` | Labelled radio-style card for descriptive choices |
| `FormField` | Labelled input, helper text, validation error, and accessories |
| `DateNavigator` | Connected previous/date/next control |
| `PaginationNavigator` | Connected arrows and numbered page selection |
| `SegmentedControl` | Shared compact mode or filter selection |
| `ShadowGlowCard` | Standard bordered card surface and optional glow |
| `SectionLabel` | Small uppercase divider label between dashboard areas |
| `StatPill` | Compact label/value status capsule |
| `ProgressBar` | Themeable animated progress visualization |
| `SyncStatusBadge` | Communicates offline synchronization state |
| `ShimmerSkeleton` | Theme-aware loading placeholder |
| `StatePanel` | Empty, error, offline, and success messaging with optional actions |
| `OnboardingChecklist` | Resumable first-use progress derived from real user data |
| `FadeSlideIn` | Entrance treatment for dashboard sections |
| `AnimatedTabIcon` | Active tab pill, icon, and animated label |
| `MacroDonutChart` | Nutrition macro/calorie visualization |
| `WaterTracker` | Water progress and adjustment UI |
| `MuscleHeatmap` | Seven-day front/back muscle volume visualization |
| `WeekStreak` | Training consistency summary |

## 12. Loading and feedback

The modern loading convention is to preserve the page structure and replace
only unavailable data with shimmer placeholders.

Completed loading, empty, and failed states are separate concepts:

- `ShimmerSkeleton` is used only while data is genuinely unresolved.
- `StatePanel` explains empty, error, offline, and success outcomes.
- Every actionable empty state provides one direct next step.
- Embedded state panels remove their own card border when already inside a
  containing card.
- Error and offline variants announce updates through a polite accessibility
  live region without blocking unrelated content.

### First-use checklist

Home shows a resumable five-step checklist until the initial product journey is
complete. Completion is derived from existing server data rather than
duplicated local flags:

- nutrition profile exists;
- an active workout program exists;
- at least one exercise progression exists;
- at least one recorded workout session exists;
- food history contains at least one entry.

Only presentation preference is stored locally. Users can collapse or dismiss
the checklist, and Profile provides a **Setup checklist** action that reopens it
in review mode even after all five steps are complete.

`ShimmerSkeleton` currently:

- uses verified light/dark semantic base and highlight colors;
- passes the highlight color over the base placeholder;
- completes one shimmer pass every 1.3 seconds;
- repeats until the data is ready;
- respects system reduced-motion preferences;
- is hidden from accessibility traversal.

Implemented layout skeleton groups include:

- Home nutrition summary;
- Home recent training progress;
- Food Diary profile, intake, and meal entries;
- five Gym Progression exercise cards.

Small action-specific operations such as Save or Delete may still use an
activity indicator inside the affected button. The app's initial authentication
and font bootstrap also currently uses a full-screen activity indicator.

## 13. Motion

Motion is functional and short:

- tab selection uses a spring animation;
- skeleton shimmer uses a 1.3-second repeating timing animation;
- progress bars animate between values;
- selected segmented controls use movement or state transitions;
- modal presentation generally uses a short fade.

Reanimated is used for modern animations, and reduced-motion settings are
honored where implemented.

## 14. Data-state conventions

Screens distinguish between:

- initial loading: show layout skeletons;
- cached/background refresh: keep existing content visible where possible;
- pull-to-refresh: use the native refresh control;
- empty data: show a contextual empty card and next action;
- recoverable error: show a Retry action near the affected content;
- mutation in progress: disable the affected action and show local feedback.

React Query defaults currently cache successful queries as fresh for five
minutes and retain inactive query data for 24 hours.

### Accessibility baseline

- Shared buttons expose an accessible name plus disabled and busy state.
- Icon-only controls keep a compact visual size while providing at least a
  44×44 effective touch area through their visual bounds or hit slop.
- `IconButton` supports 26–44px visual controls; its hit slop is calculated
  from the visual size, so dense workout rows remain compact without creating a
  difficult touch target.
- Page numbers and segmented options expose their selected state.
- Expandable controls expose whether their content is expanded.
- Form errors use polite live announcements and remain attached to the input
  through its accessibility hint.
- Workout set, rest-timer, meal, modal, authentication, and destructive account
  actions identify their exact operation rather than announcing only an icon.
- Progression charts and the weekly muscle heatmap provide concise text
  alternatives for screen-reader users.
- Modal content is marked as modal so background controls do not compete for
  accessibility focus.

## 15. Current inconsistencies and review items

These are observations of the existing code, not yet-approved redesigns:

1. **Nested surface colors:** some older modal and inset components still need
   review to confirm whether `background` or `card` is intentional.
2. **Shadow implementation:** the shared card still uses legacy platform shadow
   properties and elevation.
3. **Icon system:** icons come from multiple Material and Font Awesome families;
   size and visual weight should be checked whenever a new icon is introduced.
4. **Inline styles:** several major screens repeat header and control styling
   inline instead of using a shared page-header or navigator component.
5. **Bottom navigation clearance:** each long tab screen must explicitly reserve
   space for the absolutely positioned tab bar.
10. **Accessibility:** some interactive icon-only buttons have labels, but this
    should be audited consistently across all older controls and modals.

## 16. Rules for future UI work

When extending the interface:

1. Read the real loaded component before creating its skeleton.
2. Use theme tokens; do not introduce a new hard-coded brand color without a
   defined semantic reason.
3. Use Plus Jakarta Sans and follow the existing hierarchy.
4. Prefer 16px cards, 8–10px compact controls, and 36–44px touch affordances.
5. Keep static page structure visible while data loads.
6. Preserve cached content during background refreshes.
7. Put loading feedback inside the affected region, not over the entire page.
8. Account for both the safe-area inset and floating tab bar.
9. Reuse the Food Diary date navigator pattern for compact previous/next flows.
10. Verify light themes as well as the default Dark Gym theme before considering
    a component complete.

### Required primitive usage

New tab pages should use `TabScreenScrollView`. New primary, secondary, and
destructive actions should use `AppButton`; icon-only actions should use
`IconButton`. Do not reproduce date navigation, pagination, segmented selection,
or standard text-field styling inside a screen—use their shared primitives.

## 17. Source-of-truth files

- `src/constants/colors.ts` — theme tokens and palettes
- `src/context/ThemeContext.tsx` — active theme provider
- `src/app/_layout.tsx` — fonts, providers, query defaults, and bootstrap state
- `src/app/(tabs)/_layout.tsx` — floating tab navigation
- `assets/styles/gym.style.ts` — common screen typography and layout styles
- `assets/styles/fontHelper.ts` — font-family mapping
- `src/components/base/` — shared card, progress, status, and skeleton primitives
- `src/components/home/` — Home-specific loading structures
- `src/components/gym/` — progression, heatmap, streak, and exercise catalog components
- `src/components/nutrition/` — diary, macro, meal-prep, water, and food-search UI
- `src/app/(tabs)/home.tsx` — Home composition
- `src/app/(tabs)/gymProgression.tsx` — Gym composition
- `src/app/(tabs)/foodDiary.tsx` — Food Diary composition
- `src/app/(tabs)/profile.tsx` — Profile composition
