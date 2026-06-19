# CONTRIBUTING.md

## Rules For AI Agents

Before changing code:

1. Understand Exercise → Session → Set hierarchy.
2. Preserve React Query invalidation.
3. Never duplicate progression calculations.
4. Never create derived chart tables in database.
5. Always calculate charts from sessions.

---

# Business Rules

## Session History Is Source Of Truth

DO NOT:

```text
Store chart values separately
```

DO:

```text
Build charts from session records
```

---

## Estimated 1RM

Always use:

```text
weight × (1 + reps / 30)
```

---

## Volume

Always use:

```text
weight × reps
```

---

## Session Editing

When editing sessions:

- Preserve set order
- Preserve session ownership
- Preserve exercise ownership

---

## Exercise Deletion

Deleting an exercise removes:

- Exercise
- Sessions
- Sets

---

## Code Style

Prefer:

- useMemo
- useCallback
- Feature isolation

Avoid:

- Large components
- Duplicate calculations
- Business logic inside UI

---

# AI Implementation Priority

1. Data integrity
2. Workout tracking reliability
3. Session recovery
4. Progression accuracy
5. UI polish

Never reverse this order.
