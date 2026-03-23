/**
 * Inject a fake session into localStorage to simulate a logged-in user.
 * This bypasses the real backend — we're testing frontend behavior only.
 */
export async function loginAs(page, role, username = 'testuser') {
  const session = {
    token: 'fake-test-token-' + role,
    username,
    role,
    full_name: `Test ${role}`,
    user_id: 999,
    assignments: {
      constituencies: [1],
      local_bodies: [1],
      booths: [1],
    },
    can_download: role === 'SUPERUSER',
    can_upload: ['SUPERUSER', 'MANAGER'].includes(role),
    can_verify: true,
    can_edit_voters: true,
    can_send_broadcasts: ['SUPERUSER', 'MANAGER'].includes(role),
    can_manage_system: role === 'SUPERUSER',
  };

  // Mock API calls BEFORE any navigation
  await page.route('**/api/**', (route) => {
    const url = route.request().url();

    if (url.includes('/api/user/me')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(session),
      });
    }

    if (url.includes('/api/health')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok' }),
      });
    }

    if (url.includes('/api/admin/locations')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, name: 'Test Constituency', local_bodies: [{ id: 1, name: 'Test LB', booths: [{ id: 1, number: '1' }] }] }
        ]),
      });
    }

    // Voters sub-endpoints MUST come before the general /api/voters match
    if (url.includes('/api/voters/voting-stats')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ total: 100, voted: 0, not_voted: 100 }),
      });
    }

    if (url.includes('/api/voters/edit/')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    }

    if (url.includes('/api/voters/toggle-attendance')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    }

    // General voter list
    if (url.includes('/api/voters')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [
            {
              id: 1, voter_id: 1, serial_no: 1, full_name: 'Test Voter One',
              epic_id: 'ABC1234567', age: 45, gender: 'MALE',
              house_name: 'Test House', house_no: '123',
              booth_no: '1', local_body: 'Test LB',
              voter_leaning: null, current_location: null,
              voting_probability: null, is_head_of_family: false,
              phone_no: '',
            },
            {
              id: 2, voter_id: 2, serial_no: 2, full_name: 'Test Voter Two',
              epic_id: 'DEF7654321', age: 32, gender: 'FEMALE',
              house_name: 'Another House', house_no: '456',
              booth_no: '1', local_body: 'Test LB',
              voter_leaning: 'UDF', current_location: 'LOCAL',
              voting_probability: 'CONFIRMED', is_head_of_family: true,
              phone_no: '9876543210',
            },
          ],
          total: 2,
        }),
      });
    }

    if (url.includes('/api/stats')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ total: 100, male: 50, female: 50, updated: 30 }),
      });
    }

    if (url.includes('/api/analytics')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ leaning: {}, location: {}, probability: {}, booth_stats: [], recent_activity: [] }),
      });
    }

    if (url.includes('/api/admin/users')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    }

    if (url.includes('/api/parties')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    }

    // Default: return empty success for any other API call
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });

  // Set localStorage session via init script (runs before page JS)
  await page.addInitScript((s) => {
    localStorage.setItem('voter_session', JSON.stringify(s));
  }, session);
}

/** Get all visible sidebar menu labels */
export async function getSidebarMenuItems(page) {
  // On mobile, open the sidebar first
  const viewport = page.viewportSize();
  if (viewport && viewport.width < 1024) {
    const buttons = await page.locator('button').all();
    for (const btn of buttons) {
      const text = await btn.textContent();
      if (text && text.includes('☰')) {
        await btn.click();
        await page.waitForTimeout(500);
        break;
      }
    }
  }

  // Use the label span (font-black tracking class) — not :last-child which breaks on active items
  const items = await page.locator('nav button span.font-black').allTextContents();
  return items.map(t => t.trim()).filter(Boolean);
}
