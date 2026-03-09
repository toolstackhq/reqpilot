import { expect, test } from '@playwright/test';

test('workspace manager creates and switches isolated workspaces', async ({ page }) => {
  await page.goto('/');

  const workspaceButton = page.getByRole('button', { name: 'Open workspace manager' }).first();
  await workspaceButton.click();

  const dialog = page.getByRole('dialog', { name: 'Workspace Manager' });
  await expect(dialog).toBeVisible();

  await dialog.getByLabel('New workspace name').fill('QA Workspace');
  await dialog.getByRole('button', { name: 'Create & Open' }).click();
  await expect(dialog.locator('article', { hasText: 'QA Workspace' })).toBeVisible();

  await dialog.getByRole('button', { name: 'Close' }).click();
  await page.keyboard.press('ControlOrMeta+s');

  const saveDialog = page.getByRole('dialog', { name: 'Save Request' });
  await saveDialog.getByLabel('Create new collection').check();
  await saveDialog.getByTestId('save-new-collection').fill('QA Collection');
  await saveDialog.getByTestId('save-request-name').fill('Workspace Request');
  await saveDialog.getByTestId('save-request-confirm').click();

  await expect(page.getByText('QA Collection')).toBeVisible();

  await workspaceButton.click();
  await dialog.getByLabel('New workspace name').fill('Sandbox Workspace');
  await dialog.getByRole('button', { name: 'Create & Open' }).click();
  await expect(dialog.locator('article', { hasText: 'Sandbox Workspace' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Close' }).click();

  await expect(page.getByText('QA Collection')).toHaveCount(0);

  await workspaceButton.click();
  const qaCard = dialog.locator('article', { hasText: 'QA Workspace' });
  await qaCard.getByRole('button', { name: 'Open' }).click();
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByText('QA Collection')).toBeVisible();
});
