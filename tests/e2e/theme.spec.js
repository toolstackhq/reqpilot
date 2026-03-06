import { test, expect } from '@playwright/test';

test('theme toggle works and persists', async ({ page }) => {
  await page.goto('/');

  const root = page.locator('html');
  const initialClass = await root.getAttribute('class');
  await page.getByRole('button', { name: /Switch to/ }).click();
  const changedClass = await root.getAttribute('class');

  expect(changedClass).not.toBe(initialClass);

  await page.reload();
  const persistedClass = await root.getAttribute('class');
  expect(persistedClass).toBe(changedClass);

  await expect(page.locator('#request-method')).toBeVisible();
});
