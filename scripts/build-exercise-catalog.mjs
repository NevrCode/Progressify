import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const DEFAULT_SOURCE_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/refs/heads/main/dist/exercises.json";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultOutputPath = resolve(
  projectRoot,
  "src/data/exercise-catalog.generated.json",
);

const cleanText = (value) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const cleanList = (value) =>
  Array.isArray(value)
    ? value
        .map(cleanText)
        .filter((item) => item !== null)
    : [];

export function transformExercise(rawExercise) {
  if (!rawExercise || typeof rawExercise !== "object") {
    throw new TypeError("Each source exercise must be an object.");
  }

  const id = cleanText(rawExercise.id);
  const name = cleanText(rawExercise.name);
  const primaryMuscles = cleanList(rawExercise.primaryMuscles);

  if (!id || !name || primaryMuscles.length === 0) {
    throw new Error("Exercise requires id, name, and at least one primary muscle.");
  }

  return {
    id,
    name,
    primaryMuscle: primaryMuscles[0],
    secondaryMuscles: cleanList(rawExercise.secondaryMuscles),
    equipment: cleanText(rawExercise.equipment),
    level: cleanText(rawExercise.level),
    mechanic: cleanText(rawExercise.mechanic),
    force: cleanText(rawExercise.force),
    category: cleanText(rawExercise.category) ?? "strength",
    instructions: cleanList(rawExercise.instructions),
    imagePaths: cleanList(rawExercise.images),
  };
}

export function buildCatalog(sourceExercises, sourceUrl = DEFAULT_SOURCE_URL) {
  if (!Array.isArray(sourceExercises)) {
    throw new TypeError("Exercise catalog source must be a JSON array.");
  }

  const exercises = sourceExercises
    .filter((exercise) => exercise?.category === "strength")
    .map(transformExercise)
    .sort((left, right) =>
      left.name.localeCompare(right.name, "en", { sensitivity: "base" }),
    );

  const ids = new Set();
  for (const exercise of exercises) {
    if (ids.has(exercise.id)) {
      throw new Error(`Duplicate exercise id: ${exercise.id}`);
    }
    ids.add(exercise.id);
  }

  if (exercises.length === 0) {
    throw new Error("Transformation produced an empty strength catalog.");
  }

  return {
    schemaVersion: 1,
    source: {
      name: "Free Exercise DB",
      url: sourceUrl,
      repository: "https://github.com/yuhonas/free-exercise-db",
      license: "Unlicense",
    },
    exerciseCount: exercises.length,
    exercises,
  };
}

async function readSource(source) {
  if (/^https:\/\//u.test(source)) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Catalog download failed with HTTP ${response.status}.`);
    }
    return response.text();
  }

  return readFile(resolve(projectRoot, source), "utf8");
}

function parseArguments(args) {
  const options = {
    check: false,
    source: DEFAULT_SOURCE_URL,
    output: defaultOutputPath,
  };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--check") {
      options.check = true;
    } else if (argument === "--source" && args[index + 1]) {
      options.source = args[index + 1];
      index += 1;
    } else if (argument === "--output" && args[index + 1]) {
      options.output = resolve(projectRoot, args[index + 1]);
      index += 1;
    } else {
      throw new Error(`Unknown or incomplete argument: ${argument}`);
    }
  }

  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const sourceText = await readSource(options.source);
  const catalog = buildCatalog(JSON.parse(sourceText), options.source);
  const outputText = `${JSON.stringify(catalog, null, 2)}\n`;
  const checksum = createHash("sha256").update(outputText).digest("hex");

  if (options.check) {
    const currentOutput = await readFile(options.output, "utf8").catch(() => null);
    if (currentOutput !== outputText) {
      throw new Error(
        "Generated catalog is missing or stale. Run npm run catalog:build.",
      );
    }
  } else {
    await writeFile(options.output, outputText, "utf8");
  }

  console.log(
    `${options.check ? "Verified" : "Generated"} ${catalog.exerciseCount} exercises (${checksum}).`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
