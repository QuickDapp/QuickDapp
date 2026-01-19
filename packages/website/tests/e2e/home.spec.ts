import { expect, test } from "@playwright/test"

test.describe("Homepage", () => {
  test("should load the homepage", async ({ page }) => {
    await page.goto("/")

    await expect(page).toHaveTitle(/QuickDapp/)
  })

  test("should display main content", async ({ page }) => {
    await page.goto("/")

    const content = await page.textContent("body")
    expect(content).toBeTruthy()
  })
})
