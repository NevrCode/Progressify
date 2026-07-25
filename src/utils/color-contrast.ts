const normalizeHex = (value: string) => {
  const hex = value.replace("#", "");
  if (hex.length === 3) {
    return hex
      .split("")
      .map((character) => character + character)
      .join("");
  }
  return hex.slice(0, 6);
};

const channelLuminance = (channel: number) => {
  const normalized = channel / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
};

export const relativeLuminance = (color: string) => {
  const hex = normalizeHex(color);
  if (!/^[0-9a-f]{6}$/i.test(hex)) return 0;
  const channels = [0, 2, 4].map((offset) =>
    Number.parseInt(hex.slice(offset, offset + 2), 16),
  );
  return (
    channelLuminance(channels[0]) * 0.2126 +
    channelLuminance(channels[1]) * 0.7152 +
    channelLuminance(channels[2]) * 0.0722
  );
};

export const contrastRatio = (foreground: string, background: string) => {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
};

export const getHighestContrastColor = (
  background: string,
  candidates: readonly (string | undefined)[],
) => {
  const validCandidates = candidates.filter(
    (candidate): candidate is string =>
      typeof candidate === "string" &&
      /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(candidate),
  );
  if (validCandidates.length === 0) return "#000000";
  return validCandidates.reduce((best, candidate) =>
    contrastRatio(candidate, background) > contrastRatio(best, background)
      ? candidate
      : best,
  );
};
