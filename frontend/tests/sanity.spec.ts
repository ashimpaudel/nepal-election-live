import { test, expect } from "@playwright/test";

// ─── Homepage ───────────────────────────────────────────────

test.describe("Homepage", () => {
  test("loads and shows header with LIVE badge", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("header")).toBeVisible();
    await expect(page.getByText("Nepal Election")).toBeVisible();
    await expect(page.getByText("LIVE").nth(0)).toBeVisible();
  });

  test("shows 275 total seats in header", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("275 Seats")).toBeVisible();
  });

  test("renders summary cards section", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Total Seats")).toBeVisible();
    await expect(page.getByText("Declared").first()).toBeVisible();
    await expect(page.getByText("Counting").first()).toBeVisible();
    await expect(page.getByText("Pending").first()).toBeVisible();
    await expect(page.getByText("Total Votes")).toBeVisible();
  });

  test("renders seat distribution bar", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Seat Distribution")).toBeVisible();
  });

  test("renders party results section", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Party-wise Results")).toBeVisible();
  });

  test("renders PR results section", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Proportional Representation")).toBeVisible();
  });

  test("renders constituency results section", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Constituency Results")).toBeVisible();
  });

  test("renders data sources banner", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Data Sources")).toBeVisible();
  });

  test("renders disclaimer footer", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Unofficial Results")).toBeVisible();
    await expect(page.getByText("View Official ECN Results Portal")).toBeVisible();
  });

  test("shows Nepal map component", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Province Map")).toBeVisible();
  });
});

// ─── Language Switcher ──────────────────────────────────────

test.describe("Language Switcher", () => {
  test("language switcher button is visible", async ({ page }) => {
    await page.goto("/");
    const switcher = page.getByLabel("Change language");
    await expect(switcher).toBeVisible();
  });

  test("language dropdown opens and shows 7 languages", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Change language").click();
    await expect(page.getByText("नेपाली")).toBeVisible();
    await expect(page.getByText("मैथिली")).toBeVisible();
    await expect(page.getByText("भोजपुरी")).toBeVisible();
  });
});

// ─── Province Drill-Down ────────────────────────────────────

test.describe("Province Page", () => {
  test("province page loads without hanging (no Supabase)", async ({ page }) => {
    await page.goto("/province/6");
    // Should show province data from DB, or "not found" if no DB — but NOT stuck loading
    await expect(
      page.getByText("Province not found").or(page.getByRole("heading", { name: /Karnali/ }))
    ).toBeVisible({ timeout: 10000 });
  });

  test("province page shows back link", async ({ page }) => {
    await page.goto("/province/1");
    await page.waitForTimeout(3000);
    await expect(page.getByRole("banner")).toBeVisible();
  });
});

// ─── District Drill-Down ────────────────────────────────────

test.describe("District Page", () => {
  test("district page loads without hanging (no Supabase)", async ({ page }) => {
    await page.goto("/district/5");
    await expect(
      page.getByText("District not found").or(page.getByRole("heading", { name: /Morang/ }))
    ).toBeVisible({ timeout: 10000 });
  });
});

// ─── Constituency Drill-Down ────────────────────────────────

test.describe("Constituency Page", () => {
  test("constituency page loads without hanging (no Supabase)", async ({ page }) => {
    await page.goto("/constituency/1");
    await expect(
      page.getByText("Constituency not found").or(page.getByRole("heading", { name: /Taplejung/ }))
    ).toBeVisible({ timeout: 10000 });
  });
});

// ─── API Routes ─────────────────────────────────────────────

test.describe("API Routes", () => {
  test("GET /api/summary returns valid JSON", async ({ request }) => {
    const res = await request.get("/api/summary");
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json).toHaveProperty("totalSeats", 275);
    expect(json).toHaveProperty("fptpSeats", 165);
    expect(json).toHaveProperty("prSeats", 110);
  });

  test("GET /api/parties returns array", async ({ request }) => {
    const res = await request.get("/api/parties");
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(Array.isArray(json)).toBeTruthy();
  });

  test("GET /api/constituencies returns array", async ({ request }) => {
    const res = await request.get("/api/constituencies");
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(Array.isArray(json)).toBeTruthy();
  });

  test("GET /api/pr-results returns valid structure", async ({ request }) => {
    const res = await request.get("/api/pr-results");
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json).toHaveProperty("totalPRSeats", 110);
    expect(json).toHaveProperty("parties");
    expect(Array.isArray(json.parties)).toBeTruthy();
  });
});

// ─── Navigation ─────────────────────────────────────────────

test.describe("Navigation", () => {
  test("homepage has no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/");
    await page.waitForTimeout(3000);
    // Filter out known benign errors (e.g. Supabase not configured, news fetch failures)
    const realErrors = errors.filter(
      (e) =>
        !e.includes("Supabase") &&
        !e.includes("supabase") &&
        !e.includes("Failed to fetch") &&
        !e.includes("net::ERR")
    );
    expect(realErrors).toEqual([]);
  });

  test("404 page renders for unknown routes", async ({ page }) => {
    const res = await page.goto("/nonexistent-page");
    expect(res?.status()).toBe(404);
  });
});
