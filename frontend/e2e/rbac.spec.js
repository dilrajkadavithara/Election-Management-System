import { test, expect } from '@playwright/test';
import { loginAs, getSidebarMenuItems } from './helpers.js';

/**
 * RBAC Tests — verify each role sees only the menu items they should.
 *
 * Expected sidebar visibility:
 * ┌────────────────────┬────┬────┬────┬────┬────┬────┬────┐
 * │ Menu Item          │ SU │ MG │ CA │ LB │ ZC │ OP │ BA │
 * ├────────────────────┼────┼────┼────┼────┼────┼────┼────┤
 * │ Dashboard          │ ✓  │ ✓  │ ✓  │ ✓  │ ✓  │ ✓  │ ✓  │
 * │ War room           │ ✓  │ ✓  │ ✓  │ ✓  │ ✓  │ ✓  │ ✗  │
 * │ Upload Voter List  │ ✓  │ ✓  │ ✓  │ ✓  │ ✓  │ ✓  │ ✗  │
 * │ Voter List         │ ✓  │ ✓  │ ✓  │ ✓  │ ✓  │ ✓  │ ✓  │
 * │ Influencer Segment │ ✓  │ ✓  │ ✓  │ ✓  │ ✓  │ ✓  │ ✓  │
 * │ Send Messages      │ ✓  │ ✓  │ ✓  │ ✓  │ ✓  │ ✓  │ ✓  │
 * │ Voter Slips        │ ✓  │ ✓  │ ✓  │ ✗  │ ✗  │ ✗  │ ✗  │
 * │ Election Day       │ ✓  │ ✓  │ ✓  │ ✓  │ ✓  │ ✓  │ ✓  │
 * │ User Settings      │ ✓  │ ✓  │ ✓  │ ✓  │ ✓  │ ✗  │ ✗  │
 * └────────────────────┴────┴────┴────┴────┴────┴────┴────┘
 */

const ALL_ROLES = [
  'SUPERUSER',
  'MANAGER',
  'CONSTITUENCY_ADMIN',
  'LOCAL_BODY_HEAD',
  'ZONE_COMMANDER',
  'OPERATOR',
  'BOOTH_AGENT',
];

const ALWAYS_VISIBLE = ['Dashboard', 'Voter List', 'Influencer Segment', 'Send Messages', 'Election Day'];
const SLIPS_ALLOWED = ['SUPERUSER', 'MANAGER', 'CONSTITUENCY_ADMIN'];
const SETTINGS_ALLOWED = ['SUPERUSER', 'MANAGER', 'CONSTITUENCY_ADMIN', 'LOCAL_BODY_HEAD', 'ZONE_COMMANDER'];
const WARROOM_HIDDEN_FROM = ['BOOTH_AGENT'];
const UPLOAD_HIDDEN_FROM = ['BOOTH_AGENT'];

for (const role of ALL_ROLES) {
  test(`RBAC: ${role} sees correct menu items`, async ({ page }) => {
    await loginAs(page, role);
    await page.goto('/');
    await page.waitForTimeout(1500);

    const items = await getSidebarMenuItems(page);

    // Always-visible items should be present
    for (const item of ALWAYS_VISIBLE) {
      expect(items, `${role} should see "${item}"`).toContain(item);
    }

    // Voter Slips
    if (SLIPS_ALLOWED.includes(role)) {
      expect(items, `${role} SHOULD see Voter Slips`).toContain('Voter Slips');
    } else {
      expect(items, `${role} should NOT see Voter Slips`).not.toContain('Voter Slips');
    }

    // User Settings
    if (SETTINGS_ALLOWED.includes(role)) {
      expect(items, `${role} SHOULD see User Settings`).toContain('User Settings');
    } else {
      expect(items, `${role} should NOT see User Settings`).not.toContain('User Settings');
    }

    // War room
    if (WARROOM_HIDDEN_FROM.includes(role)) {
      expect(items, `${role} should NOT see War room`).not.toContain('War room');
    } else {
      expect(items, `${role} SHOULD see War room`).toContain('War room');
    }

    // Upload Voter List
    if (UPLOAD_HIDDEN_FROM.includes(role)) {
      expect(items, `${role} should NOT see Upload Voter List`).not.toContain('Upload Voter List');
    } else {
      expect(items, `${role} SHOULD see Upload Voter List`).toContain('Upload Voter List');
    }
  });
}
