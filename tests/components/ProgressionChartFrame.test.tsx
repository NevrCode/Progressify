/// <reference types="jest" />

import { render } from "@testing-library/react-native";
import { Text } from "react-native";

import { ProgressionChartFrame } from "@/components/gym/progression-chart-frame";
import type { ProgressionChartSummary } from "@/utils/progression-chart-summary";

const summary: ProgressionChartSummary = {
  sessionCount: 2,
  latestValue: 110,
  bestValue: 110,
  overallChange: 10,
  overallChangePercentage: 10,
  firstDate: "2026-07-10",
  latestDate: "2026-07-24",
  accessibilityLabel:
    "Bench press estimated one-rep max progression. 2 sessions. Latest 110 kilograms.",
};

describe("ProgressionChartFrame", () => {
  it("exposes the chart as one concise accessible image", async () => {
    const screen = await render(
      <ProgressionChartFrame summary={summary} testID="chart-frame">
        <Text>Visual chart</Text>
      </ProgressionChartFrame>,
    );

    const chart = screen.getByRole("image", {
      name: summary.accessibilityLabel,
    });
    expect(chart).toBeTruthy();
    expect(screen.getByTestId("chart-frame").props.accessible).toBe(true);
  });
});
