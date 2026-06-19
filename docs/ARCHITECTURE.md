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

The application follows a feature-based architecture.

```text
src/
│
├── pages/
│   ├── gymProgression.tsx
│   ├── workoutSession.tsx
│   ├── activeWorkoutSession.tsx
│   └── manageWorkoutSession.tsx
│
├── services/
│   ├── gymService.ts
│   ├── sessionStorage.ts
│   └── programStorage.ts
│
├── hooks/
│   ├── useGymDashboard.ts
│   └── useActiveSession.ts
│
├── context/
│   └── ThemeContext.tsx
│
└── assets/
    └── styles/
```

---

# Screen Responsibilities

## gymProgression

Purpose:

Main dashboard.

Responsibilities:

- Display exercise progression
- Display 1RM chart
- Display latest workout session
- Create exercise
- Edit exercise
- Delete exercise
- Navigate to session management

---

## workoutSession

Purpose:

Workout setup screen.

Responsibilities:

- Select split
- Select exercises
- Load saved workout programs
- Save workout programs
- Start workout session

---

## activeWorkoutSession

Purpose:

Execute a workout.

Responsibilities:

- Track live workout
- Track sets
- Save progress locally
- Restore unfinished workouts
- Swap exercises
- Remove exercises
- Complete exercises
- Save sessions

---

## manageWorkoutSession

Purpose:

Manage historical sessions.

Responsibilities:

- Edit session
- Delete session
- Update sets
- View progression graph
- Maintain history integrity

---

## caloriesCount

Purpose:

Manage Calorie intake data from create, read and update and delete,

Responsibilities:

- Edit session
- Delete session
- Update sets
- View progression graph
- Maintain history integrity

---

# State Management

Global

- React Query
- ThemeContext

Local

- useState
- useMemo
- useCallback

Persistent

- AsyncStorage

---

# Query Rules

All gym data is cached under:

```ts
["gym"];
```

Any mutation affecting:

- Exercise
- Session
- Sets

must invalidate:

```ts
queryClient.invalidateQueries({
  queryKey: ["gym"],
});
```

Failure to do this causes stale UI.
