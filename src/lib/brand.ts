export const brandColors = {
  darkBlue: "#065274",
  lightBlue: "#019CDF",
  charcoal: "#3B3B3B",
  white: "#FFFFFF",
  deepNavy: "#043B54",
  mediumBlue: "#087EAC",
  softBlue: "#66C5EC",
  paleBlue: "#D9F2FC",
  palestBlue: "#F1FAFE",
  mediumGray: "#737373",
  lightGray: "#E6E6E6",
  backgroundGray: "#F7F8F9",
  orange: "#F58220",
  green: "#22A06B",
  red: "#D64545",
} as const;

export const coreBrandColors = [
  {
    name: "Zoom Dark Blue",
    role: "Primary Dark",
    hex: brandColors.darkBlue,
    rgb: "6, 82, 116",
  },
  {
    name: "Zoom Light Blue",
    role: "Primary Blue / CTA",
    hex: brandColors.lightBlue,
    rgb: "1, 156, 223",
  },
  {
    name: "Zoom Charcoal",
    role: "Text",
    hex: brandColors.charcoal,
    rgb: "59, 59, 59",
  },
  {
    name: "White",
    role: "Background",
    hex: brandColors.white,
    rgb: "255, 255, 255",
  },
] as const;

export const extendedPalette = [
  { usage: "Primary Dark", hex: brandColors.darkBlue },
  { usage: "Primary Blue", hex: brandColors.lightBlue },
  { usage: "Deep Navy", hex: brandColors.deepNavy },
  { usage: "Medium Blue", hex: brandColors.mediumBlue },
  { usage: "Light Blue", hex: brandColors.softBlue },
  { usage: "Pale Blue", hex: brandColors.paleBlue },
  { usage: "Very Pale Blue", hex: brandColors.palestBlue },
  { usage: "Charcoal", hex: brandColors.charcoal },
  { usage: "Medium Gray", hex: brandColors.mediumGray },
  { usage: "Light Gray", hex: brandColors.lightGray },
  { usage: "Background Gray", hex: brandColors.backgroundGray },
  { usage: "White", hex: brandColors.white },
] as const;

export const semanticColors = [
  {
    name: "Orange",
    role: "CTA, highlights, attention",
    hex: brandColors.orange,
    rgb: "245, 130, 32",
  },
  {
    name: "Green",
    role: "Success, approved, positive",
    hex: brandColors.green,
    rgb: "34, 160, 107",
  },
  {
    name: "Red",
    role: "Warning, urgent, negative",
    hex: brandColors.red,
    rgb: "214, 69, 69",
  },
] as const;
