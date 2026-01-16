import { expect, test } from "@playwright/test"
import {
  getVerificationCodeCount,
  waitForNewVerificationCode,
} from "./helpers/email-code"

test.describe("Authentication Flow", () => {
  test("shows login button when not authenticated", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("button", { name: "Login" })).toBeVisible()
  })

  test("complete login flow with email verification", async ({ page }) => {
    await page.goto("/")

    // Click login
    await page.getByRole("button", { name: "Login" }).click()
    await expect(page.getByRole("dialog")).toBeVisible()

    // Enter email
    const testEmail = `test-${Date.now()}@example.com`
    const codeCountBefore = getVerificationCodeCount()
    await page.getByPlaceholder("you@example.com").fill(testEmail)
    await page.getByRole("button", { name: "Send Code" }).click()

    // Wait for code step
    await expect(page.getByText(/We've sent a 6-digit code/)).toBeVisible()

    // Get verification code from server logs
    const code = await waitForNewVerificationCode(codeCountBefore)

    // Enter code
    await page.getByPlaceholder("123456").fill(code)
    await page.getByRole("button", { name: "Verify" }).click()

    // Verify logged in
    await expect(page.getByText(testEmail.toLowerCase())).toBeVisible()
    await expect(page.getByRole("button", { name: "Logout" })).toBeVisible()
  })

  test("persists auth on page refresh", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("button", { name: "Login" }).click()

    const testEmail = `persist-${Date.now()}@example.com`
    const codeCountBefore = getVerificationCodeCount()
    await page.getByPlaceholder("you@example.com").fill(testEmail)
    await page.getByRole("button", { name: "Send Code" }).click()
    await expect(page.getByText(/We've sent a 6-digit code/)).toBeVisible()

    const code = await waitForNewVerificationCode(codeCountBefore)
    await page.getByPlaceholder("123456").fill(code)
    await page.getByRole("button", { name: "Verify" }).click()
    await expect(page.getByRole("button", { name: "Logout" })).toBeVisible()

    // Refresh and verify still authenticated
    await page.reload()
    await page.waitForTimeout(1000)
    await expect(page.getByText(testEmail.toLowerCase())).toBeVisible()
    await expect(page.getByRole("button", { name: "Logout" })).toBeVisible()
  })

  test("logout clears auth state", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("button", { name: "Login" }).click()

    const testEmail = `logout-${Date.now()}@example.com`
    const codeCountBefore = getVerificationCodeCount()
    await page.getByPlaceholder("you@example.com").fill(testEmail)
    await page.getByRole("button", { name: "Send Code" }).click()

    const code = await waitForNewVerificationCode(codeCountBefore)
    await page.getByPlaceholder("123456").fill(code)
    await page.getByRole("button", { name: "Verify" }).click()
    await expect(page.getByRole("button", { name: "Logout" })).toBeVisible()

    // Logout
    await page.getByRole("button", { name: "Logout" }).click()

    // Verify logged out
    await expect(page.getByRole("button", { name: "Login" })).toBeVisible()
  })

  test("localStorage only contains auth_token after login", async ({
    page,
  }) => {
    await page.goto("/")
    await page.getByRole("button", { name: "Login" }).click()

    const testEmail = `storage-${Date.now()}@example.com`
    const codeCountBefore = getVerificationCodeCount()
    await page.getByPlaceholder("you@example.com").fill(testEmail)
    await page.getByRole("button", { name: "Send Code" }).click()

    const code = await waitForNewVerificationCode(codeCountBefore)
    await page.getByPlaceholder("123456").fill(code)
    await page.getByRole("button", { name: "Verify" }).click()
    await expect(page.getByRole("button", { name: "Logout" })).toBeVisible()

    // Check localStorage
    const storage = await page.evaluate(() => JSON.stringify(localStorage))
    const parsed = JSON.parse(storage)
    expect(Object.keys(parsed)).toEqual(["auth_token"])
    expect(parsed.auth_token).toBeTruthy()
  })
})
