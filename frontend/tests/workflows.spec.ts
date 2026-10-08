import { expect, test, type Page } from '@playwright/test';

const user = { id: '00000000-0000-4000-8000-000000000001', email: 'audit@example.com', name: 'Audit', emailVerified: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' };
const token = ['e30', Buffer.from(JSON.stringify({ sub: user.id, exp: 4102444800 })).toString('base64url'), 'test'].join('.');
async function fixtures(page: Page, authenticated = false, mode = '') {
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    const headers = { 'Access-Control-Allow-Origin': 'http://127.0.0.1:4174', 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'content-type,authorization,x-neon-client-info', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (url.hostname.includes('neonauth')) {
      if (url.pathname.endsWith('/sign-in/email')) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        return route.fulfill({ status: 429, json: { message: 'Too many requests' }, headers });
      }
      if (url.pathname.endsWith('/request-password-reset')) return route.fulfill({ json: { status: true }, headers });
      const data = authenticated ? { user, session: { id: 'test-session', token, expiresAt: '2100-01-01T00:00:00Z', userId: user.id } } : null;
      return route.fulfill({ json: data, headers });
    }
    if (url.pathname.startsWith('/api/')) {
      if (mode === 'unauthorized') return route.fulfill({ status: 401, json: { detail: 'expired' }, headers });
      const job = { id: 1, title: 'Backend Engineer', company: 'Audit Company', location: 'Remote', description: 'Python FastAPI engineer', url: 'https://example.com/job', relevance_score: .9, status: 'pending' };
      const data = url.pathname.includes('/matched') ? [job] : url.pathname.includes('/counts') ? { total: 1, by_status: { pending: 1 } } : { id: user.id, first_name: 'Audit', skills: [], experiences: [] };
      return route.fulfill({ json: data, headers });
    }
    if (url.hostname !== '127.0.0.1') return route.abort();
    return route.continue();
  });
}
test('password reset calls the supported provider route', async ({ page }) => {
  await fixtures(page);
  await page.goto('/forgot-password');
  await page.getByLabel('Email address').fill('audit@example.com');
  const request = page.waitForRequest(r => r.url().endsWith('/request-password-reset') && r.method() === 'POST');
  await page.getByRole('button', { name: /send reset/i }).click();
  expect((await request).postDataJSON().redirectTo).toBe('http://127.0.0.1:4174/update-password');
  await expect(page.getByText(/If an account exists/)).toBeVisible();
});
test('login remains disabled throughout a delayed provider request', async ({ page }) => {
  await fixtures(page); await page.goto('/login');
  await page.getByLabel('Email address').fill('audit@example.com'); await page.getByLabel('Password', { exact: true }).fill('TestPassword123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForTimeout(500);
  await expect(page.getByRole('button', { name: /Signing in/ })).toBeDisabled();
  await expect(page.getByRole('alert')).toContainText(/Too many/);
});
test('stale cache is cleared when protected API rejects it', async ({ page }) => {
  await fixtures(page, true, 'unauthorized');
  await page.addInitScript(({ user, token }) => localStorage.setItem('neon_auth_session', JSON.stringify({ user, token })), { user, token });
  await page.goto('/dashboard'); await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => localStorage.getItem('neon_auth_session'))).toBeNull();
});
test('mobile hero text and cards stay inside the viewport', async ({ page }) => {
  await fixtures(page, true); await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/'); await page.waitForTimeout(2000);
  const bounds = await page.locator('h1').boundingBox(); expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await page.goto('/dashboard'); await expect(page.getByText('Audit Company').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
test('mobile modal is readable, traps focus, closes with Escape, restores focus', async ({ page }) => {
  await fixtures(page, true); await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/dashboard');
  const trigger = page.getByRole('button', { name: 'View Details', exact: true }); await trigger.click();
  const dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible();
  const bounds = await dialog.getByText('Python FastAPI engineer', { exact: true }).boundingBox(); expect(bounds!.width).toBeGreaterThan(200);
  for (let i = 0; i < 15; i++) { await page.keyboard.press('Tab'); expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBeTruthy(); }
  await page.keyboard.press('Escape'); await expect(dialog).toBeHidden(); await expect(trigger).toBeFocused();
});
test('method link reaches its target', async ({ page }) => {
  await fixtures(page); await page.goto('/'); await page.waitForTimeout(1800); await page.getByRole('link', { name: 'See the method' }).click(); await page.waitForTimeout(1500);
  expect(Math.abs((await page.locator('#process').boundingBox())!.y)).toBeLessThan(160);
});

test('resume stays pending until the server commits and then loads the extracted profile', async ({ page }) => {
  await fixtures(page, true);
  let done = false;
  let polls = 0;
  await page.route('**/api/profile/resume', route => route.fulfill({ status: 202, json: { task_id: 'resume-test' } }));
  await page.route('**/api/profile/resume/status/resume-test', route => {
    done = ++polls >= 3;
    return route.fulfill({ json: { task_id: 'resume-test', status: done ? 'completed' : 'running', message: done ? 'Resume processed successfully.' : 'Processing resume on the server.' } });
  });
  await page.route('**/api/profile', route => route.fulfill({ json: { id: user.id, first_name: done ? 'Extracted' : 'Audit', skills: done ? [{ id: 1, name: 'Python' }] : [], experiences: [] } }));
  await page.goto('/profile');
  await expect(page.getByLabel('Resume file')).toHaveAttribute('accept', '.pdf,.docx');
  await page.getByLabel('Resume file').setInputFiles({ name: 'resume.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7 synthetic provider fixture') });
  await page.getByRole('button', { name: 'Upload & Parse Resume' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Processing resume on the server.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Processing Resume...' })).toBeDisabled();
  await expect(page.getByRole('alert').filter({ hasText: 'Resume processed successfully.' })).toHaveCount(0);
  await expect(page.getByRole('alert').filter({ hasText: 'Resume processed successfully.' })).toBeVisible();
  await expect(page.getByLabel('First Name')).toHaveValue('Extracted');
  await expect(page.getByText('Python', { exact: true })).toBeVisible();
});

test('resume provider failure preserves the displayed profile and never claims success', async ({ page }) => {
  await fixtures(page, true);
  await page.route('**/api/profile/resume', route => route.fulfill({ status: 202, json: { task_id: 'failure-test' } }));
  await page.route('**/api/profile/resume/status/failure-test', route => route.fulfill({ json: { task_id: 'failure-test', status: 'failed', message: 'Provider quota exhausted. Please retry later.' } }));
  await page.goto('/profile');
  await page.getByLabel('Resume file').setInputFiles({ name: 'resume.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7 fixture') });
  await page.getByRole('button', { name: 'Upload & Parse Resume' }).click();
  await expect(page.getByRole('alert')).toContainText('Provider quota exhausted');
  await expect(page.getByLabel('First Name')).toHaveValue('Audit');
  await expect(page.getByText(/processed successfully/i)).toHaveCount(0);
});

test('partial refresh stays visible and Retry-After disables additional refreshes', async ({ page }) => {
  await fixtures(page, true);
  let calls = 0;
  await page.route('**/api/jobs/refresh', route => ++calls === 1
    ? route.fulfill({ status: 202, json: { task_id: 'partial-test' } })
    : route.fulfill({ status: 429, headers: { 'Retry-After': '60' }, json: { detail: 'Please wait before trying again.' } }));
  await page.route('**/api/jobs/refresh/status/partial-test', route => route.fulfill({ json: { task_id: 'partial-test', status: 'partial_failure', message: 'Some sources could not refresh; existing jobs retained.' } }));
  await page.goto('/dashboard');
  const refresh = page.getByRole('button', { name: 'Refresh Jobs' });
  await refresh.click();
  await expect(page.getByRole('alert')).toContainText('Some sources could not refresh');
  await expect(page.getByText('Audit Company').first()).toBeVisible();
  await refresh.click();
  await expect(page.getByRole('status').filter({ hasText: 'Retry available' })).toBeVisible();
  await expect(refresh).toBeDisabled();
  expect(calls).toBe(2);
});

test('experience editor saves and removes records through the owned API', async ({ page }) => {
  await fixtures(page, true);
  let experiences: Array<{ id: number; title: string; company: string }> = [];
  await page.route('**/api/profile', route => route.fulfill({ json: { id: user.id, first_name: 'Audit', skills: [], experiences } }));
  await page.route('**/api/profile/experiences', async route => {
    experiences = route.request().postDataJSON().map((e: { title: string; company: string }) => ({ ...e, id: 10 }));
    await route.fulfill({ json: experiences });
  });
  await page.route('**/api/profile/experiences/10', async route => {
    if (route.request().method() === 'DELETE') { experiences = []; return route.fulfill({ status: 204 }); }
    experiences = [{ ...route.request().postDataJSON(), id: 10 }]; return route.fulfill({ json: experiences[0] });
  });
  await page.goto('/profile');
  await page.getByLabel('Job title').fill('Engineer');
  await page.getByLabel('Company', { exact: true }).fill('Example');
  await page.getByRole('button', { name: 'Add Experience', exact: true }).click();
  await expect(page.getByText('Engineer · Example')).toBeVisible();
  await page.getByRole('button', { name: 'Edit experience', exact: true }).click();
  await page.getByLabel('Job title').fill('Senior Engineer');
  await page.getByRole('button', { name: 'Save Experience', exact: true }).click();
  await expect(page.getByText('Senior Engineer · Example')).toBeVisible();
  await page.getByRole('button', { name: 'Remove experience', exact: true }).click();
  await expect(page.getByText('Senior Engineer · Example')).toHaveCount(0);
});

test('small screens and reduced motion avoid loading the optional 3D bundle', async ({ page }) => {
  await fixtures(page); await page.setViewportSize({ width: 320, height: 640 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  const orbRequests: string[] = [];
  page.on('request', request => { if (request.url().includes('MatchOrb-')) orbRequests.push(request.url()); });
  await page.goto('/'); await expect(page.getByRole('link', { name: 'See the method' })).toBeVisible();
  await page.waitForTimeout(500);
  expect(orbRequests).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test('desktop decoration uses bounded Canvas2D without loading WebGL', async ({ page }) => {
  await fixtures(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (...args: Parameters<typeof original>) {
      if (String(args[0]).includes('webgl')) throw new Error('WebGL is unavailable');
      return original.apply(this, args);
    } as typeof original;
  });
  await page.goto('/');
  const orb = page.getByTestId('wireframe-orb');
  await expect(orb).toBeVisible();
  expect(await orb.evaluate((element: HTMLCanvasElement) => element.width * element.height)).toBeLessThanOrEqual(2_010_000);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(orb).toHaveCount(0);
});

test('navigation method anchor works when starting on a different page', async ({ page }) => {
  await fixtures(page); await page.goto('/login');
  await page.getByRole('link', { name: 'Method', exact: true }).click();
  await expect(page).toHaveURL(/\/#features$/);
  await expect(page.locator('#features')).toBeVisible();
  await expect.poll(async () => Math.abs((await page.locator('#features').boundingBox())!.y)).toBeLessThan(160);
});

test('successful login returns to the requested profile page and signout clears the session', async ({ page }) => {
  await fixtures(page);
  let signedIn = false;
  await page.route('**/sign-in/email', async route => { signedIn = true; await route.fulfill({ json: { user, token } }); });
  await page.route('**/get-session', route => route.fulfill({ json: signedIn ? { user, session: { id: 'test', token, expiresAt: '2100-01-01', userId: user.id } } : null }));
  await page.route('**/sign-out', async route => { signedIn = false; await route.fulfill({ json: { success: true } }); });
  await page.goto('/profile'); await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Email address').fill(user.email); await page.getByLabel('Password', { exact: true }).fill('TestPassword123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByLabel('First Name')).toHaveValue('Audit');
  await page.getByRole('button', { name: /sign out/i }).click();
  expect(await page.evaluate(() => localStorage.getItem('neon_auth_session'))).toBeNull();
  await page.goto('/dashboard'); await expect(page).toHaveURL(/\/login$/);
});

test('password update calls the supported reset operation and rejects expired tokens', async ({ page }) => {
  await fixtures(page);
  await page.route('**/reset-password', route => route.fulfill({ status: 400, json: { message: 'Invalid or expired reset token.' } }));
  await page.goto('/update-password?token=synthetic-expired-token');
  await page.getByLabel('New Password', { exact: true }).fill('TestPassword123!');
  await page.getByLabel('Confirm New Password').fill('TestPassword123!');
  const request = page.waitForRequest(r => r.url().endsWith('/reset-password') && r.method() === 'POST');
  await page.getByRole('button', { name: 'Update password' }).click();
  expect((await request).postDataJSON()).toMatchObject({ token: 'synthetic-expired-token', newPassword: 'TestPassword123!' });
  await expect(page.getByRole('alert')).toContainText('expired');
});
