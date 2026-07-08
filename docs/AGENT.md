# Recent Additions & Updates (June - July 2026)

This document tracks major feature additions, code structure updates, and API service/hook implementations that have been integrated into **Progressify**.

---

## 1. Core Modules Added

### A. Calorie & Nutrition Diary
- **Screens**:
  - `src/app/(tabs)/foodDiary.tsx`: Integrates search autocomplete, food log entry views, and daily macro/calorie summaries.
  - `src/app/(pages)/nutritionProfile.tsx`: Setup custom calorie goals and protein/carb/fat ratio percentage splits.
- **Components**:
  - `src/components/nutrition/macroDonutChart.tsx`: A lightweight SVG-based donut chart to display progress relative to daily limits.
- **API Services**:
  - `src/services/nutritionService.ts`: Fetches and updates user calorie/macro targets.
  - `src/services/foodDiaryService.ts`: Logs and edits daily food intakes. Integrates with the FatSecret API for broad database lookup.
- **Hooks**:
  - `src/hooks/useNutrition.ts` and `src/hooks/useFoodDiary.ts` to manage state querying, cache invalidation, and data mutation lifecycle.

### B. Custom Foods & Meal Prepping
- **Services/Components**:
  - `src/services/customFoodService.ts`: Manages user-specific custom food items.
  - `src/services/mealPrepService.ts` & `src/components/nutrition/mealPrepSection.tsx`: Allow users to bundle multiple foods into preps (like recipes/templates) with cumulative macros, which can be applied to the food diary in one click.
- **Hooks**:
  - `src/hooks/useMealPrep.ts`
  - `useCustomFoodSearch` / `useCreateCustomFood` (in `customFoodService.ts`)

### C. Active Workout Execution
- **Screens & Hooks**:
  - `src/app/(pages)/activeWorkoutSession.tsx`: tracks elapsed workout duration, sets, and progress live.
  - `src/hooks/useActiveSession.ts`: Manages caching and loading active workout state from `AsyncStorage`.
- **Services**:
  - `src/services/sessionStorage.ts`: Handles JSON serialization and retrieval of running sessions for state recovery on crash.
  - `src/services/programStorage.ts`: Persists gym routine templates.

### D. App Settings & Custom UX Components
- **Changelog Flow**:
  - `src/data/changeLog.ts`: Definitions of version history.
  - `src/components/patchNotesPopUp.tsx`: Triggered upon new app updates.
  - `src/app/(pages)/changelog.tsx`: A complete page to read through historical patch notes.
- **System Overlay Dialog**:
  - `src/context/AlertContext.tsx`: custom Modal provider for spring-scale-animated overlays, replacing native default alerts.

---

## 2. API Integration Overview (Backend Sync)

All services utilize the axios client in `src/utils/api.ts` to communicate with the Spring Boot backend (`/v1`).
- Custom headers handle JWT auth tokens.
- Secure token refresh intercepts expired responses (`401`) and retrieves fresh access tokens automatically using stored refresh tokens.
