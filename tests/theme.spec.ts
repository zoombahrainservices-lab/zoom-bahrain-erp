import { expect, test, type Page } from "@playwright/test";

import { contrastRatio } from "../src/lib/color-contrast";
import { darkTheme, lightTheme } from "../src/lib/theme-tokens";

async function openLogin(page: Page, theme: "light" | "dark") {
  await page.addInitScript((nextTheme) => {
    localStorage.setItem("zoom-erp-theme", nextTheme);
  }, theme);
  await page.emulateMedia({ colorScheme: theme });
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
}

function parseRgb(value: string) {
  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) {
    throw new Error(`Could not parse color: ${value}`);
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])] as const;
}

function rgbToHex(value: string) {
  const [r, g, b] = parseRgb(value);
  return `#${[r, g, b]
    .map((part) => part.toString(16).padStart(2, "0"))
    .join("")}`;
}

test("light login keeps the approved white page and navy heading", async ({
  page,
}) => {
  await openLogin(page, "light");
  await expect(page.locator("html")).not.toHaveClass(/dark/);

  const bodyBg = rgbToHex(
    await page.locator("body").evaluate((el) => getComputedStyle(el).backgroundColor),
  );
  const heading = rgbToHex(
    await page.getByRole("heading", { name: "Sign in" }).evaluate((el) => {
      return getComputedStyle(el).color;
    }),
  );

  expect(bodyBg).toBe(lightTheme.background.toLowerCase());
  expect(heading).toBe(lightTheme.heading.toLowerCase());
  await expect(page).toHaveScreenshot("login-light.png", {
    maxDiffPixelRatio: 0.03,
  });
});

test("dark login uses charcoal surfaces and readable heading contrast", async ({
  page,
}) => {
  await openLogin(page, "dark");
  await expect(page.locator("html")).toHaveClass(/dark/);

  const bodyBg = rgbToHex(
    await page.locator("body").evaluate((el) => getComputedStyle(el).backgroundColor),
  );
  const headingColor = rgbToHex(
    await page.getByRole("heading", { name: "Sign in" }).evaluate((el) => {
      return getComputedStyle(el).color;
    }),
  );

  expect(bodyBg).toBe(darkTheme.background.toLowerCase());
  expect(headingColor).toBe(darkTheme.heading.toLowerCase());
  expect(contrastRatio(headingColor, bodyBg)).toBeGreaterThanOrEqual(4.5);

  const whiteCards = await page.locator(".bg-white").evaluateAll((elements) =>
    elements
      .map((el) => getComputedStyle(el).backgroundColor)
      .filter((color) => color === "rgb(255, 255, 255)"),
  );
  expect(whiteCards).toEqual([]);

  await expect(page).toHaveScreenshot("login-dark.png", {
    maxDiffPixelRatio: 0.03,
  });
});

test("theme toggle switches login from light to dark without a white body", async ({
  page,
}) => {
  await openLogin(page, "light");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  const bodyBg = rgbToHex(
    await page.locator("body").evaluate((el) => getComputedStyle(el).backgroundColor),
  );
  expect(bodyBg).toBe(darkTheme.background.toLowerCase());
});

test("dark class remaps hardcoded white cards and navy text", async ({
  page,
}) => {
  await openLogin(page, "dark");
  const sample = await page.evaluate(() => {
    const card = document.createElement("div");
    card.className =
      "bg-white text-zoom-dark ring-1 ring-zinc-200";
    card.textContent = "Card";
    document.body.appendChild(card);
    const styles = getComputedStyle(card);
    return {
      background: styles.backgroundColor,
      color: styles.color,
      ring: styles.getPropertyValue("--tw-ring-color") || styles.boxShadow,
    };
  });

  expect(sample.background).not.toBe("rgb(255, 255, 255)");
  expect(rgbToHex(sample.background)).toBe(darkTheme.surface.toLowerCase());
  expect(rgbToHex(sample.color)).toBe(darkTheme.accentReadable.toLowerCase());
});

const modulePaths = [
  "/dashboard",
  "/now",
  "/operations",
  "/sales",
  "/contacts",
  "/organizations",
  "/tasks",
  "/hr",
  "/logistics",
  "/settings",
];

async function signIn(page: Page) {
  const password = process.env.SEED_ADMIN_PASSWORD;
  const username = process.env.SEED_ADMIN_USERNAME || "admin";
  test.skip(!password, "SEED_ADMIN_PASSWORD is not set");

  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password as string);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/(dashboard|now|operations)/);
}

async function countWhiteSurfaces(page: Page) {
  return page.locator(".bg-white").evaluateAll((elements) =>
    elements
      .map((el) => getComputedStyle(el).backgroundColor)
      .filter((color) => color === "rgb(255, 255, 255)").length,
  );
}

test("light dashboard still uses the approved navy heading", async ({ page }) => {
  await openLogin(page, "light");
  await signIn(page);
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "How this system works" })).toBeVisible();
  const heading = rgbToHex(
    await page
      .getByRole("heading", { name: "How this system works" })
      .evaluate((el) => getComputedStyle(el).color),
  );
  expect(heading).toBe(lightTheme.heading.toLowerCase());
  await expect(page).toHaveScreenshot("dashboard-light.png", {
    maxDiffPixelRatio: 0.04,
  });
});

test("dark mode keeps ERP modules on charcoal surfaces", async ({ page }) => {
  await openLogin(page, "dark");
  await signIn(page);

  for (const path of modulePaths) {
    await page.goto(path);
    await expect(page.locator("html")).toHaveClass(/dark/);
    expect(await countWhiteSurfaces(page), `${path} has white cards`).toBe(0);
  }

  await page.goto("/dashboard");
  const headingColor = rgbToHex(
    await page
      .getByRole("heading", { name: "How this system works" })
      .evaluate((el) => getComputedStyle(el).color),
  );
  expect(headingColor).toBe(darkTheme.heading.toLowerCase());
  await expect(page).toHaveScreenshot("dashboard-dark.png", {
    maxDiffPixelRatio: 0.04,
  });
});
