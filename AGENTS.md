# Expo HAS CHANGED
Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code

always focus on clean and simple but informative structure.

# Project Architecture & Shared Context

This is a full-stack application consisting of two interconnected repositories:
1. **Frontend**: `c:\rn\Progressify` (React Native / Expo Router App)
2. **Backend**: `c:\spring\ex-tracker` (Spring Boot REST API with PostgreSQL)

---

## 1. Core Features & Business Rules

### A. Workout Session & Progression (Gym)
* **Hierarchy**: Exercise → Session → Set.
* **Estimated 1RM Formula**: `weight * (1 + reps / 30)`
* **Volume Formula**: `weight * reps`
* **Data Integrity & Chart Rule**:
  > [!IMPORTANT]
  > Never store pre-calculated chart metrics or historical progression averages in the database. Always calculate volume, 1RM, and progression trends dynamically from historical session records.
* **Crash-Recovery**: Active workout sessions are serialized and cached in frontend `AsyncStorage` via `src/services/sessionStorage.ts` for instant state recovery on unexpected app termination.

### B. Calorie & Nutrition Diary
* **Diary Logging**: Log food items under meal categories: `BREAKFAST`, `LUNCH`, `DINNER`, `SNACK`.
* **FatSecret Proxy**: All food database searches proxy through the backend `FatSecretProxyResource` to avoid client-side API key leakage.
* **Meal Preps**: Users can group multiple food items into reusable meal prep templates. The system aggregates cumulative macro profiles to log them directly in the food diary with a single click.

### C. Financial & Expense Tracking
* **Accounts & Transactions**: Support for multi-account management (Wallets, Bank, E-Wallets) and logging transactions (Income / Expense).
* **Budgets & Reports**: Category-based budget limits and visual tracking/reporting of spending behaviors against target limits.

---

## 2. Frontend Conventions (c:\rn\Progressify)

### A. State Management & Query Invalidation
We use **React Query** for server state sync. Ensure mutations invalidate the correct query keys:
* **Gym Data**: `["gym"]` (Invalidate on any change to Exercises, Sessions, or Sets)
* **Custom Foods**: `["custom-foods"]` (Invalidate on custom food additions or deletions)
* **Diary & Goals**: `["food-diary"]` and `["nutrition-goals"]` (Invalidate on target updates or daily logging changes)

### B. UI & UX Standards
* **Alert Overlay System**: Use `AlertContext.tsx` to display spring-scale-animated modal overlays. Do not use native default `Alert.alert`.
* **Theme**: Persistent light/dark toggles handled via `ThemeContext.tsx`.
* **Forms**: Always wrap inputs in keyboard avoiding views to prevent viewport overlap during typing.
* **Structure**: Clean, simple, and modular components placed under `src/components/`.

---

## 3. Integration & API Synchronization
* **API URL**: Backend REST API is exposed under `/v1` (e.g. `http://localhost:8080/v1`).
* **Axios Client**: Configured at `src/utils/api.ts`.
* **JWT & Refresh Tokens**: Headers handle JWT auth. A custom interceptor automatically handles expired tokens (`401` responses) by calling the refresh endpoint and retrying the failed request seamlessly.

---

## 4. Documentation References
* Refer to `docs/ARCHITECTURE.md` for folder structures and screen-by-screen responsibilities.
* Refer to `docs/CONTRIBUTING.md` for AI implementation priorities and code style standards.
* Refer to `docs/FEATURE.md` for complete feature roadmap.
