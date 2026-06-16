// ── Types ─────────────────────────────────────────────────────────────────────

export type ChangeType = "new" | "improved" | "fixed" | "removed";

export interface ChangeEntry {
  type: ChangeType;
  text: string;
}

export interface PatchNote {
  version: string; // must match Constants.expoConfig?.version
  date: string; // display only
  title: string; // short headline
  summary: string; // one-line description shown in popup
  changes: ChangeEntry[];
}

// ── Label + color map ─────────────────────────────────────────────────────────

export const changeTypeMeta: Record<
  ChangeType,
  { label: string; color: string }
> = {
  new: { label: "New", color: "#3498db" },
  improved: { label: "Improved", color: "#2ecc71" },
  fixed: { label: "Fixed", color: "#e67e22" },
  removed: { label: "Removed", color: "#e74c3c" },
};

// ── Changelog — latest version first ─────────────────────────────────────────
// Add a new entry here every release. The FIRST entry is treated as "latest".

export const CHANGELOG: PatchNote[] = [
  // {
  //   version: "1.3.0",
  //   date: "June 16, 2026",
  //   title: "Nutrition Tracker",
  //   summary: "Track calories, macros, and meal preps — all in one place.",
  //   changes: [
  //     { type: "new", text: "Food diary — log what you eat by meal type" },
  //     {
  //       type: "new",
  //       text: "Meal prep templates — save reusable meals and log them in one tap",
  //     },
  //     {
  //       type: "new",
  //       text: "Daily calorie tracker with progress bars for all macros",
  //     },
  //     {
  //       type: "new",
  //       text: "Auto-calculated TDEE goals based on your body profile (Mifflin-St Jeor)",
  //     },
  //     {
  //       type: "new",
  //       text: "Manual goal override for calories, protein, carbs, fat, fiber, sodium, and more",
  //     },
  //     {
  //       type: "improved",
  //       text: "Profile page now shows today's nutrition summary card",
  //     },
  //     {
  //       type: "improved",
  //       text: "JWT token auto-refresh — you won't get logged out unexpectedly anymore",
  //     },
  //   ],
  // },
  {
    version: "1.0.2",
    date: "June 16, 2026",
    title: "Refresh Token Fix",
    summary: "Refresh Token Problem fixed",
    changes: [
      {
        type: "fixed",
        text: "Refresh Token Problem fixed",
      },
    ],
  },
  {
    version: "1.0.1",
    date: "May 24, 2026",
    title: "Gym Progression",
    summary: "Track your workouts and see your strength gains over time.",
    changes: [
      {
        type: "new",
        text: "Exercise progression tracking with session history",
      },
      { type: "new", text: "Training hub on profile page" },
      { type: "improved", text: "Dashboard now shows workout stats" },
    ],
  },
  {
    version: "1.0.0",
    date: "May 22, 2026",
    title: "Initial Release ",
    summary: "Welcome to Progressify!",
    changes: [
      { type: "new", text: "Profile page" },
      { type: "new", text: "Dark / light theme support" },
    ],
  },
];

export const LATEST_VERSION = CHANGELOG[0].version;
