export const themeStorageKey = "zoom-erp-theme";

export const lightTheme = {
  background: "#F7F8F9",
  surface: "#FFFFFF",
  surfaceElevated: "#FFFFFF",
  foreground: "#3B3B3B",
  textSecondary: "#737373",
  heading: "#043B54",
  accentReadable: "#065274",
  border: "#E4E4E7",
} as const;

export const darkTheme = {
  background: "#171B20",
  surface: "#252C34",
  surfaceElevated: "#303841",
  foreground: "#F1F5F9",
  textSecondary: "#BBC7D3",
  heading: "#78CCF3",
  accentReadable: "#78CCF3",
  border: "#394651",
} as const;

export const zoomBrand = {
  dark: "#065274",
  light: "#019CDF",
} as const;
