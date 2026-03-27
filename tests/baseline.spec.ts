import { test, expect } from "@playwright/test"

const PROD_URL = "https://envirojim-final-deployment.vercel.app"

test.describe("Production Baseline Certification", () => {
  
  test("Test 1: Root route redirects correctly", async ({ page }) => {
    await page.goto(PROD_URL)
    await page.waitForLoadState("networkidle")
    const url = page.url()
    expect(url.includes("/login") || url.includes("/dashboard")).toBeTruthy()
  })

  test("Test 2: Login page loads stably", async ({ page }) => {
    await page.goto(`${PROD_URL}/login`)
    await expect(page.locator("body")).toBeVisible()
    const errorLogs: string[] = []
    page.on("console", msg => {
      if (msg.type() === "error") errorLogs.push(msg.text())
    })
    await page.waitForLoadState("networkidle")
    expect(errorLogs.length).toBe(0)
  })

  test("Test 3: Dashboard protection is active", async ({ page }) => {
    await page.goto(`${PROD_URL}/dashboard`)
    await page.waitForLoadState("networkidle")
    expect(page.url()).toContain("/login")
  })

  // Note: Test 4 (User Login) requires secure credentials. 
  // I will skip until specific test account is provided or use existing env vars if available.
})
