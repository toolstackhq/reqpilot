import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const shouldCapture = process.env.CAPTURE_DOC_SCREENSHOTS === '1';
const screenshotDir = path.resolve(process.cwd(), 'docs/public/screenshots');

async function capture(locator, fileName) {
  await locator.screenshot({
    path: path.join(screenshotDir, fileName),
    animations: 'disabled',
  });
}

test.describe('docs screenshots', () => {
  test.skip(!shouldCapture, 'Set CAPTURE_DOC_SCREENSHOTS=1 to capture docs screenshots.');

  test.beforeAll(() => {
    mkdirSync(screenshotDir, { recursive: true });
  });

  test('capture key product screens for docs', async ({ page }) => {
    await page.setViewportSize({ width: 1720, height: 980 });
    await page.goto('/');
    await expect(page.locator('#request-url-input')).toBeVisible();

    await page.addStyleTag({
      content: `
        *,
        *::before,
        *::after {
          transition: none !important;
          animation: none !important;
          caret-color: transparent !important;
        }
      `,
    });

    await page.locator('#request-url-input').fill('http://localhost:4444/api/users');
    await page.getByRole('tab', { name: 'Post-request Script' }).click();
    await page.locator('#post-script').fill(
      [
        'rp.test("status is 2xx", () => {',
        '  rp.expect(rp.response.status).toBeGreaterThanOrEqual(200);',
        '  rp.expect(rp.response.status).toBeLessThan(300);',
        '});',
        'console.log("Docs capture smoke run");',
      ].join('\n')
    );

    await page.getByRole('button', { name: 'Send' }).first().click();
    await expect(page.getByTestId('response-status')).toContainText('200');

    await page.keyboard.press('ControlOrMeta+s');
    const saveDialog = page.getByRole('dialog', { name: 'Save Request' });
    await expect(saveDialog).toBeVisible();
    await saveDialog.getByLabel('Create new collection').check();
    await saveDialog.getByTestId('save-new-collection').fill('ReqPilot Demo');
    await saveDialog.getByTestId('save-request-name').fill('Users List');
    await saveDialog.getByTestId('save-request-confirm').click();
    await expect(saveDialog).toBeHidden();

    await capture(page.locator('main#main-content'), 'app-overview.png');
    await capture(page.locator('#collections-panel'), 'collections-panel.png');
    await capture(page.locator('section[aria-label="Request Builder"]'), 'request-builder.png');
    await capture(page.locator('section[aria-label="Response Viewer"]'), 'response-viewer-json.png');

    await page.getByRole('tab', { name: 'Test Results' }).click();
    await capture(page.locator('section[aria-label="Response Viewer"]'), 'response-test-results.png');

    await page.getByRole('button', { name: 'History' }).first().click();
    const historyDrawer = page.getByRole('dialog', { name: 'History Drawer' });
    await expect(historyDrawer).toBeVisible();
    await capture(historyDrawer, 'history-drawer.png');
    await page.keyboard.press('Escape');
    await expect(historyDrawer).toBeHidden();

    await page.getByRole('button', { name: 'Environments' }).first().click();
    const envDialog = page.getByRole('dialog', { name: 'Environment manager' });
    await expect(envDialog).toBeVisible();
    const createEnvButton = envDialog.getByRole('button', { name: '+ New environment' });
    await createEnvButton.click();
    await envDialog.getByLabel('New environment name').fill('local');
    await envDialog.getByRole('button', { name: 'Add', exact: true }).click();
    await envDialog.getByLabel('Variable key').first().fill('host');
    await envDialog.getByLabel('Variable value').first().fill('localhost');
    await capture(envDialog, 'environment-manager.png');
    await envDialog.getByRole('button', { name: 'Save' }).click();
    await expect(envDialog).toBeHidden();

    await page.locator('#request-url-input').fill('http://{{host}}:4444/api/users/{{user_id}}');
    await capture(page.locator('footer'), 'variable-resolution.png');

    await page.getByRole('button', { name: 'Open workspace manager' }).first().click();
    const workspaceDialog = page.getByRole('dialog', { name: 'Workspace Manager' });
    await expect(workspaceDialog).toBeVisible();
    await workspaceDialog.getByLabel('New workspace name').fill('Git Demo Workspace');
    const gitManagedToggle = workspaceDialog.locator('label', { hasText: 'Git-enabled (managed layout)' }).locator('input');
    await gitManagedToggle.check();
    await workspaceDialog.getByLabel('New workspace remote URL').fill('https://github.com/acme/api-workspace.git');
    await capture(workspaceDialog, 'workspace-manager.png');
    await workspaceDialog.getByRole('button', { name: 'Close' }).click();
    await expect(workspaceDialog).toBeHidden();

    await page.getByRole('button', { name: 'SSL' }).click();
    const securityDialog = page.getByRole('dialog', { name: 'SSL and security settings' });
    await expect(securityDialog).toBeVisible();
    await securityDialog.getByLabel('Host pattern').fill('*.internal.example');
    await securityDialog.getByRole('button', { name: 'Add' }).click();
    await capture(securityDialog, 'security-settings.png');
    await securityDialog.getByRole('button', { name: 'Done' }).click();
    await expect(securityDialog).toBeHidden();
  });
});
