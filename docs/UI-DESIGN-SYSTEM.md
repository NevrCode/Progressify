# Progressify UI Design System

> Code-based documentation of the current React Native / Expo interface.
> Last reviewed: 22 July 2026.

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
| `teriary` | `#1B5E20` | Supporting accent; token name is currently misspelled |
| `background` | `#0A0A0A` | Screen and navigation background |
| `card` | `#161616` | Elevated card surface |
| `textBlack` | `#FAFAFA` | High-emphasis headings and primary values |
| `text` | `#E0E0E0` | Standard body text |
| `textLight` | `#6B6B6B` | Captions, metadata, inactive navigation |
| `border` | `#1E1E1E` | Card, input, divider, and control outlines |
| `white` | `#FFFFFF` | Text placed on strong accent backgrounds |
| `income` | `#69F0AE` | Positive trends and success values |
| `expense` | `#FF5252` | Destructive actions, warnings, negative trends |
| `bar` | `#00E676` | Bar/chart accent |
| `shadow` | `#000000` | Card shadow base |

Most translucent states are produced by appending an alpha value to a theme
color, for example `theme.primary + "15"` for a subtle selected background and
`theme.primary + "30"` for an accent border.

### Other available themes

- `coffee`: warm brown on cream;
- `forest`: natural green on pale green;
- `purple`: purple on a light lavender surface;
- `ocean`: blue on pale cyan;
- `green`: bright green on near-white;
- `darkGym`: neon green on black.

Theme switching is held in React state. The selected theme is not currently
persisted across a full app restart.

## 3. Typography

The application uses **Plus Jakarta Sans** throughout the main UI.

Loaded weights:

- 400 Regular;
- 500 Medium;
- 600 SemiBold;
- 700 Bold;
- 800 ExtraBold.

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

The Home screen is an overview rather than a complete editing surface. Its
current structure is:

1. header and greeting;
2. high-level navigation/summary actions;
3. nutrition area labelled `Today's Fuel`;
4. `Daily Progress` nutrition card;
5. body-profile card when profile information exists;
6. water tracking;
7. training area;
8. `Weekly Streak` card;
9. `Recent Progress` card;
10. split summary.

### Daily Progress card

- Uses a centered macro/calorie visualization.
- Macro values are arranged beneath or around the visualization according to
  the real loaded card layout.
- Provides a call to action when nutrition data or a profile is unavailable.
- Uses a layout-matched skeleton while the nutrition query is initially loading.

### Body Profile card

- Displays current physical/profile data as compact labelled values.
- Links to the full nutrition profile workflow.
- Does not appear when profile information is unavailable.

### Weekly Streak card

- Summarizes recent training consistency.
- Uses strong numeric emphasis and compact supporting labels.

### Recent Progress card

- Shows recent exercises and calculated training progression.
- Links to the complete Gym Progression screen.
- Uses card-row skeletons during initial loading and preserves cached content
  during background refetching.

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
7. All / Push / Pull / Legs segmented filter;
8. Exercise Progression heading and add action;
9. five exercise cards per page;
10. connected pagination navigator above the floating tab bar.

### Exercise progression card

The collapsed card contains:

- exercise name;
- positive or negative estimated-1RM trend badge when available;
- split, muscle group, and target-rep chips;
- most recent session date;
- expand/collapse affordance;
- edit and delete actions.

The expanded card contains:

- dynamically calculated session progression chart;
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
- Changing search or split returns to page one.
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
| `FadeSlideIn` | Entrance treatment for dashboard sections |
| `AnimatedTabIcon` | Active tab pill, icon, and animated label |
| `MacroDonutChart` | Nutrition macro/calorie visualization |
| `WaterTracker` | Water progress and adjustment UI |
| `MuscleHeatmap` | Seven-day front/back muscle volume visualization |
| `WeekStreak` | Training consistency summary |
| `SplitSummaryCard` | Push/Pull/Legs overview |

## 12. Loading and feedback

The modern loading convention is to preserve the page structure and replace
only unavailable data with shimmer placeholders.

`ShimmerSkeleton` currently:

- uses the theme border as its base;
- passes a translucent primary-colored gradient over the placeholder;
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

## 15. Current inconsistencies and review items

These are observations of the existing code, not yet-approved redesigns:

1. **Theme persistence:** theme changes do not survive an app restart.
2. **Token spelling:** `teriary` should eventually be migrated to `tertiary`.
3. **Font mapping:** 600 maps to the 500 font even though a 600 font is loaded.
4. **Startup screen:** authentication/font initialization still uses a generic
   white screen and green spinner instead of the active theme.
5. **Card colors:** some screen cards override `theme.card` with
   `theme.background` or translucent variants, producing slightly different
   surface hierarchy between screens.
6. **Shadow implementation:** the shared card still uses legacy platform shadow
   properties and elevation.
7. **Icon system:** icons come from multiple Material and Font Awesome families;
   size and visual weight should be checked whenever a new icon is introduced.
8. **Inline styles:** several major screens repeat header and control styling
   inline instead of using a shared page-header or navigator component.
9. **Bottom navigation clearance:** each long tab screen must explicitly reserve
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
- `src/components/gym/` — progression, heatmap, streak, and split components
- `src/components/nutrition/` — diary, macro, meal-prep, water, and food-search UI
- `src/app/(tabs)/home.tsx` — Home composition
- `src/app/(tabs)/gymProgression.tsx` — Gym composition
- `src/app/(tabs)/foodDiary.tsx` — Food Diary composition
- `src/app/(tabs)/profile.tsx` — Profile composition
