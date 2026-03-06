import { test, expect } from '@playwright/test';

test('collections drawer create/save/load/persist', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Collections' }).click();
  await expect(page.getByRole('heading', { name: 'Collections' })).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept('Smoke Collection'));
  await page.getByRole('button', { name: 'New' }).click();

  page.once('dialog', (dialog) => dialog.accept('Users request'));
  await page.getByRole('button', { name: 'Save Request' }).click();

  await expect(page.getByText('Smoke Collection')).toBeVisible();
  await expect(page.getByText('Users request')).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: 'Collections' }).click();
  await expect(page.getByText('Smoke Collection')).toBeVisible();
});
