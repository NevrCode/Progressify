import { fireEvent, render } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";
import {
  THEME_STORAGE_KEY,
  ThemeProvider,
  useTheme,
} from "@/context/ThemeContext";

jest.mock("expo-sqlite/localStorage/install", () => ({}));

const values = new Map<string, string>();
const storage = {
  getItem: jest.fn((key: string) => values.get(key) ?? null),
  setItem: jest.fn((key: string, value: string) => {
    values.set(key, value);
  }),
  removeItem: jest.fn((key: string) => {
    values.delete(key);
  }),
  clear: jest.fn(() => values.clear()),
};

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: storage,
});

function ThemeProbe() {
  const { themeName, theme, setThemeName } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Choose ocean theme"
      onPress={() => setThemeName("ocean")}
    >
      <Text>{themeName}</Text>
      <Text>{theme.primary}</Text>
    </Pressable>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    values.clear();
    jest.clearAllMocks();
  });

  it("hydrates a valid stored theme before rendering children", async () => {
    values.set(THEME_STORAGE_KEY, "forest");

    const view = await render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(view.getByText("forest")).toBeTruthy();
    expect(view.getByText("#2E7D32")).toBeTruthy();
  });

  it("falls back safely and persists theme changes", async () => {
    values.set(THEME_STORAGE_KEY, "not-a-theme");

    const view = await render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(view.getByText("darkGym")).toBeTruthy();
    await fireEvent.press(
      view.getByRole("button", { name: "Choose ocean theme" }),
    );
    expect(view.getByText("ocean")).toBeTruthy();
    expect(storage.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, "ocean");
  });
});
