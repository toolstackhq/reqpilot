import { test, expect } from '@playwright/test';

test('can send GET request and view response', async ({ page }) => {
  await page.goto('/');
  await page.fill('#request-url-input', 'http://localhost:4444/api/users');
  await page.getByRole('button', { name: 'Send' }).click();

  await expect(page.getByTestId('response-status')).toContainText('200');
  await expect(page.locator('[aria-label="Response Viewer"]')).toContainText('Ava');
});

test('can send POST JSON and use headers/auth/params', async ({ page }) => {
  const requestTabs = page.getByLabel('Request tabs');
  await page.goto('/');
  await page.selectOption('#request-method', 'POST');
  await page.fill('#request-url-input', 'http://localhost:4444/api/users');

  await requestTabs.getByRole('tab', { name: 'Body' }).click();
  await page.selectOption('#body-type', 'json');
  await page.locator('textarea').first().fill('{"name":"E2E"}');
  await page.getByRole('button', { name: 'Send' }).click();

  await expect(page.getByTestId('response-status')).toContainText('201');
  await expect(page.getByText('E2E')).toBeVisible();

  await page.selectOption('#request-method', 'GET');
  await page.fill('#request-url-input', 'http://localhost:4444/api/echo/params?foo=bar');
  await requestTabs.getByRole('tab', { name: 'Params' }).click();
  await expect(page.locator('[aria-label="Request Builder"] input[value="foo"]').first()).toBeVisible();

  await requestTabs.getByRole('tab', { name: 'Auth' }).click();
  await page.selectOption('#auth-type', 'bearer');
  await page.getByLabel('Token').fill('test-token-123');
  await page.fill('#request-url-input', 'http://localhost:4444/api/auth/bearer');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByTestId('response-status')).toContainText('200');
});

test('ctrl/cmd+enter sends request and invalid json shows error', async ({ page }) => {
  const requestTabs = page.getByLabel('Request tabs');
  await page.goto('/');
  await page.fill('#request-url-input', 'http://localhost:4444/api/users');
  await page.keyboard.press('ControlOrMeta+Enter');
  await expect(page.getByTestId('response-status')).toContainText('200');

  await page.selectOption('#request-method', 'POST');
  await requestTabs.getByRole('tab', { name: 'Body' }).click();
  await page.selectOption('#body-type', 'json');
  await page.locator('textarea').first().fill('{ broken');
  await expect(page.getByText('Invalid JSON')).toBeVisible();
});
