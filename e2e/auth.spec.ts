import { expect, test, type Page } from "@playwright/test";

test("login displays a friendly callback error", async ({ page }) => {
  await page.goto("/login?error=auth_callback_failed");

  await expect(page.getByRole("alert")).toContainText(
    "We couldn't complete sign-in from your email link.",
  );
  await expect(page.getByRole("alert")).not.toContainText("auth_callback_failed");
});

async function signInAs(page: Page, email: string, password: string, destination: string) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname === destination);
}

const roleAccounts = [
  {
    role: "customer",
    email: process.env.E2E_CUSTOMER_EMAIL,
    password: process.env.E2E_CUSTOMER_PASSWORD,
    destination: "/account",
  },
  {
    role: "staff",
    email: process.env.E2E_STAFF_EMAIL,
    password: process.env.E2E_STAFF_PASSWORD,
    destination: "/staff",
  },
  {
    role: "admin",
    email: process.env.E2E_ADMIN_EMAIL,
    password: process.env.E2E_ADMIN_PASSWORD,
    destination: "/admin",
  },
];

for (const account of roleAccounts) {
  test(`${account.role} can sign in to their workspace`, async ({ page }) => {
    if (!account.email || !account.password) {
      test.skip(
        true,
        `Set E2E_${account.role.toUpperCase()}_EMAIL and E2E_${account.role.toUpperCase()}_PASSWORD to enable this test.`,
      );
      return;
    }

    await signInAs(page, account.email, account.password, account.destination);
  });
}
