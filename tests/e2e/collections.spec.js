import { test, expect } from '@playwright/test';

test('collections panel create/save/load/persist', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Collections' })).toBeVisible();

  await page.keyboard.press('ControlOrMeta+s');
  const saveDialog = page.getByRole('dialog', { name: 'Save Request' });
  await expect(saveDialog).toBeVisible();
  await saveDialog.getByLabel('Create new collection').check();
  await saveDialog.getByTestId('save-new-collection').fill('Smoke Collection');
  await saveDialog.getByTestId('save-request-name').fill('Users request');
  await saveDialog.getByTestId('save-request-confirm').click();

  await expect(page.getByText('Smoke Collection')).toBeVisible();
  await page.getByRole('button', { name: 'Smoke Collection' }).click();
  await expect(page.getByText('Users request')).toBeVisible();

  await page.reload();
  await expect(page.getByText('Smoke Collection')).toBeVisible();
});
