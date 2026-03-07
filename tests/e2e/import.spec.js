import path from 'node:path';
import { test, expect } from '@playwright/test';

const fixture = (name) => path.resolve('tests/fixtures', name);

test('can import postman and openapi files and show warning for invalid', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Import' }).first().click();
  let dialog = page.getByRole('dialog', { name: 'Import' });
  await expect(dialog).toBeVisible();

  await dialog.locator('input[type="file"]').setInputFiles(fixture('postman-v2.1-collection.json'));
  await expect(page.getByText('Found')).toBeVisible();
  await dialog.getByTestId('import-confirm').click();

  await expect(page.getByText('ReqPilot Postman v2.1')).toBeVisible();

  await page.getByRole('button', { name: 'Import' }).first().click();
  dialog = page.getByRole('dialog', { name: 'Import' });
  await dialog.locator('input[type="file"]').setInputFiles(fixture('openapi-3.0.json'));
  await expect(page.getByText('Found')).toBeVisible();
  await dialog.getByTestId('import-confirm').click();

  await expect(page.getByText('OpenAPI 3')).toBeVisible();

  await page.getByRole('button', { name: 'Import' }).first().click();
  dialog = page.getByRole('dialog', { name: 'Import' });
  await dialog.locator('input[type="file"]').setInputFiles({
    name: 'invalid.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not json or yaml'),
  });
  await expect(page.getByText('Unsupported file format')).toBeVisible();
});
