# Catalog-Driven Weekly Muscle Heatmap Plan

## Goal

Replace the current exercise-name and `muscle_group` substring heuristics with the
canonical `primaryMuscle` and `secondaryMuscles` metadata from the bundled exercise
catalog.

The heatmap should describe training exposure during the rolling seven-day window.
It must calculate its values from completed exercise sessions and sets at runtime;
no chart totals or historical averages should be stored in the database.

## Current limitation

`MuscleHeatmap` currently converts free-form `muscle_group` text into nine broad
groups with checks such as `includes("back")` and `includes("leg")`. It then maps
those groups to body-diagram regions. This can misclassify exercises, ignores
secondary muscles, and combines distinct muscles such as hamstrings and glutes.

## Proposed data flow

1. Resolve each progression's `catalogExerciseId` against the bundled catalog.
2. Read `primaryMuscle` and `secondaryMuscles` from the resolved catalog exercise.
3. Count completed working sets from sessions within the rolling seven-day window.
4. Attribute each set to its catalog muscles:
   - primary muscle: `1.0` set equivalent;
   - each secondary muscle: `0.5` set equivalent.
5. Translate canonical catalog muscle names to the slugs supported by
   `react-native-body-highlighter` through one explicit, tested mapping table.
6. Convert the computed set equivalents into three clearly distinct visual
   intensity levels:
   - orange: low weekly exposure;
   - amber/yellow: moderate weekly exposure;
   - green: target weekly exposure.
7. Render intensity and tap details from the computed per-muscle totals.

The weighting must be named and configurable. Catalog metadata identifies which
muscles participate; it does not measure physiological activation precisely.

Primary/secondary attribution and heatmap color are separate concepts. A secondary
muscle receives partial set credit first, and its accumulated weekly total then
determines its color. The UI must not assign orange merely because a muscle was
secondary in an individual exercise.

## Three-level color scale

The heatmap uses one shared semantic scale:

| Level | Meaning | Initial color |
| --- | --- | --- |
| Low | Some work, but below the moderate range | Orange `#F2994A` |
| Moderate | Meaningful weekly exposure, below the target range | Amber `#F2C94C` |
| Target | Target weekly exposure reached | Green `#27AE60` |

Zero exposure remains the neutral, unhighlighted body color and is not a fourth
training level.

Thresholds must live in one named configuration rather than inside the component.
The initial thresholds can preserve the current behavior:

- greater than `0` and up to `4` set equivalents: low;
- greater than `4` and up to `12` set equivalents: moderate;
- greater than `12` set equivalents: target.

These values are product defaults, not medical claims. Later they can become
goal-aware or user-configurable without changing the aggregation algorithm.

## Custom exercise fallback

Catalog-linked exercises use catalog metadata only. User-created exercises without
a catalog link use an explicit normalized muscle selection saved with that
exercise. Unmapped legacy text is displayed as `Unmapped` and excluded from the
body diagram until the user assigns it. Do not restore substring guessing.

## Implementation slices

### 1. Canonical muscle model

- Add a `CatalogMuscle` union derived from the catalog values.
- Add a typed catalog-muscle-to-body-slug mapping.
- Keep distinct totals for muscles even when the diagram must share a broader
  visual region.
- Add validation that reports new catalog muscle values without a mapping.

### 2. Pure aggregation

- Extract a pure `calculateWeeklyMuscleVolume` function.
- Inputs: progressions, catalog lookup, date-window boundary, and attribution
  weights.
- Output: canonical muscle totals plus mapped body-region totals.
- Ignore invalid dates and sessions outside the window.
- Count only valid completed sets according to the existing session definition.

### 3. Heatmap component

- Replace the hard-coded nine-group object and substring conditions.
- Generate highlighter data from the aggregation result.
- Show the exact canonical muscles contributing to a selected body region.
- Label values as `set equivalents`, not raw sets, when secondary weighting is
  enabled.
- Use the three-level orange, amber, and green scale consistently on the body,
  legend, badges, and selected-muscle detail.
- Preserve the current loading, empty, theme, and front/back interaction behavior.

### 4. Legacy-data transition

- Confirm every catalog-created progression persists `catalogExerciseId`.
- Add an edit/link action for older progressions so users can connect them to a
  catalog exercise.
- Provide an explicit muscle picker for truly custom exercises.
- Track the count of unmapped progressions locally so missing mappings are visible
  during development.

### 5. Tests and acceptance criteria

- Primary muscles receive full credit and secondary muscles receive configured
  partial credit.
- A compound movement contributes to every declared catalog muscle.
- The seven-day boundary is deterministic and timezone-safe.
- Exercises outside the window, invalid sessions, and unmapped legacy exercises
  do not silently inflate a region.
- Every muscle value in the bundled catalog has either a supported diagram mapping
  or an intentional `unmapped` declaration.
- The UI details reconcile exactly with the pure aggregation output.
- Boundary tests cover `0`, `4`, `4.5`, `12`, and values above `12` so each
  threshold produces the intended neutral, orange, amber, or green state.
- Primary and secondary contributions can accumulate into any of the three color
  levels; attribution type never directly chooses the color.

## Recommended delivery order

1. Mapping types and validation.
2. Pure aggregation utility and unit tests.
3. Heatmap component migration.
4. Legacy progression linking and custom-muscle fallback.
5. Component tests and real-device verification.
