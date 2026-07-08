# ARCHITECTURE.md

## Tech Stack

Frontend

- React Native
- Expo Router
- TypeScript
- React Query
- AsyncStorage

Backend

- Spring Boot
- PostgreSQL
- REST API

---

# Application Architecture

The application follows a feature-based architecture with Expo Router file-based routing.

```text
src/
│
├── app/
│   ├── (auth)/                  # Authentication Flow
│   │   ├── login.tsx            # Login Page
│   │   ├── signin.tsx           # Sign-in Page
│   │   └── forgetPassword.tsx   # Reset Password Request
│   │
│   ├── (pages)/                 # Modals and Full Pages
│   │   ├── activeWorkoutSession.tsx
│   │   ├── manageWorkoutSession.tsx
│   │   ├── workoutSession.tsx
│   │   ├── nutritionProfile.tsx # Goal setup for Calories & Macros
│   │   ├── appearance.tsx       # Theme settings
│   │   └── changelog.tsx        # Version history
│   │
│   ├── (tabs)/                  # Bottom Tab Navigation
│   │   ├── home.tsx             # Daily summary / shortcuts
│   │   ├── gymProgression.tsx   # Gym Dashboard
│   │   ├── foodDiary.tsx        # Calorie and macro diary
│   │   └── profile.tsx          # Settings and profile
│   │
│   ├── _layout.tsx              # Root Navigation Layout
│   └── index.tsx                # Entry routing logic
│
├── components/                  # Shared UI components
│   ├── gym/
│   ├── nutrition/               # Macro Donut charts, Meal prep section
│   └── profile/
│
├── services/                    # API Services and Storage
│   ├── gymService.ts
│   ├── foodDiaryService.ts
│   ├── customFoodService.ts
│   ├── mealPrepService.ts
│   ├── nutritionService.ts
│   ├── sessionStorage.ts
│   └── programStorage.ts
│
├── hooks/                       # Custom React Query & Business logic hooks
│   ├── useActiveSession.ts
│   ├── useFoodDiary.ts
│   ├── useMealPrep.ts
│   ├── useNutrition.ts
│   └── usePatchNote.ts
│
└── context/                     # Global State Providers
    ├── AlertContext.tsx         # Custom animated alert dialogs
    └── ThemeContext.tsx         # Theme provider
```

---

# Screen Responsibilities

## home
Purpose: Dashboard landing screen.
Responsibilities:
- Daily caloric progress and macronutrient summary
- Quick access shortcuts to start workout or log foods
- Display recent workout overview
- Update / patch notes announcements

## gymProgression
Purpose: Gym progression hub.
Responsibilities:
- Display exercise progression history
- Visual 1RM chart tracking progress
- Exercise directory (Create, Edit, Delete exercise)
- Historical session management navigation

## workoutSession
Purpose: Setup and program selector.
Responsibilities:
- Choose workout split/program
- Save/load workout program templates
- Edit and search exercises in splits
- Start an active workout session

## activeWorkoutSession
Purpose: Live workout execution.
Responsibilities:
- Add, complete, and delete workout sets
- Real-time elapsed time display
- Live storage caching for crash-recovery
- Swap or remove exercises on the fly

## foodDiary
Purpose: Nutritional logger and diary.
Responsibilities:
- Dynamic food search (FatSecret API + Custom foods)
- Daily calorie and macro target visualization
- Log food under breakfast, lunch, dinner, snack
- Log and configure meal prep bundles
- Edit or delete daily diary logs

## nutritionProfile
Purpose: Calorie and macro target settings.
Responsibilities:
- Setup custom calorie targets
- Customize macronutrient split percentages (Carbs, Protein, Fat)
- Synchronize goals with local storage and backend API

---

# State Management

Global
- React Query
- ThemeContext
- AlertContext
- DairyContext

Local
- useState
- useMemo
- useCallback

Persistent
- AsyncStorage
- SecureStore

---

# Query Rules

## Gym Data
All gym data is cached under:
```ts
["gym"]
```
Any mutation affecting Exercises, Sessions, or Sets must invalidate `["gym"]` to prevent stale UI.

## Custom Foods Data
All custom foods are cached under:
```ts
["custom-foods"]
```
Any mutation affecting custom foods (adding, deleting) must invalidate `["custom-foods"]`.

## Nutrition & Food Diary Data
Daily log entries and targets are cached under:
```ts
["food-diary"]
["nutrition-goals"]
```
Any changes to logged foods or targets must invalidate these keys.

